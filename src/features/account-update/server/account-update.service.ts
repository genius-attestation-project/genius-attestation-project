import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";
import { buildReceiptUrl } from "@/features/account-update/server/receipt-storage.service";
import type {
  AccountStatementResponse,
  AccountTransactionResponse,
  CreditOrDebit,
  AccountTallyResponse,
  PaymentMode,
  PaymentUpdateResponse,
  RegistrationPaymentLookup,
  TransactionType,
  AdminApprovalResponse,
} from "@/features/account-update/types/account-update.types";

const creditCategories = ["Cash From Account Team", "Petty Cash", "Direct Customer Transaction"];
const debitCategories = [
  "Refreshment Expenses",
  "Travel Expenses",
  "Office Cleaning Expenses",
  "Maid Expenses",
  "Corporate Expenses",
];
const uploadMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

type UploadFileInput = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData: Uint8Array<ArrayBuffer>;
} | null;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = startOfDay(value);
  next.setDate(next.getDate() + 1);
  return next;
}

function parseAmount(value: unknown, label: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return new Prisma.Decimal(amount);
}

function parseDate(value: unknown, label: string) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid.`);
  }
  return date;
}

function validateUpload(file: UploadFileInput, label: string) {
  if (!file) return;
  if (!uploadMimeTypes.has(file.mimeType)) {
    throw new Error(`${label} must be PDF, JPG, JPEG, or PNG.`);
  }
}

function getCreditOrDebit(category: string): CreditOrDebit {
  if (creditCategories.includes(category)) return "Credit";
  if (debitCategories.includes(category)) return "Debit";
  throw new Error("A valid account category is required.");
}

function buildVoucherNumber() {
  return `VCH-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

type PaymentWithRegistration = Prisma.PaymentUpdateGetPayload<{
  include: { registration: true; invoiceGroup: true };
}>;

function mapRegistrationPayment(registration: {
  id: string;
  trackingNumber: string;
  customerName: string;
  processType: string | null;
  totalCharges: Prisma.Decimal | number;
  advancePaid: Prisma.Decimal | number;
  balanceAmount: Prisma.Decimal | number;
}): RegistrationPaymentLookup {
  return {
    id: registration.id,
    trackingNumber: registration.trackingNumber,
    customerName: registration.customerName,
    processType: registration.processType ?? "-",
    totalCharges: toNumber(registration.totalCharges),
    advancePaid: toNumber(registration.advancePaid),
    balanceAmount: toNumber(registration.balanceAmount),
  };
}

function groupPaymentsByInvoice(items: PaymentWithRegistration[]) {
  const grouped = new Map<string, PaymentWithRegistration[]>();
  for (const item of items) {
    const key = item.invoiceGroupId ?? `${item.ownerAdminId}:${item.invoiceNumber}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return Array.from(grouped.values()).map((group) =>
    group.sort((left, right) => left.trackingNumber.localeCompare(right.trackingNumber)),
  );
}

function pickInvoicePayment(group: PaymentWithRegistration[]) {
  return group.find((item) => toNumber(item.amountPaid) > 0) ?? group[0];
}

async function recalculateRunningBalances(ownerAdminId: string, tx: Prisma.TransactionClient = prisma) {
  const entries = await tx.accountStatementEntry.findMany({
    where: {
      ownerAdminId,
      reversedAt: null,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      credit: true,
      debit: true,
    },
  });

  if (entries.length === 0) return;

  let balance = new Prisma.Decimal(0);
  const updates = entries.map((entry) => {
    balance = balance.plus(entry.credit).minus(entry.debit);
    return { id: entry.id, balance: balance.toNumber() };
  });

  const chunkSize = 1000;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const caseWhens = chunk.map((u) => `WHEN '${u.id}' THEN ${u.balance}`).join(" ");
    const ids = chunk.map((u) => `'${u.id}'`).join(",");

    const sql = `UPDATE account_statement_entries SET running_balance = CASE id ${caseWhens} END WHERE id IN (${ids})`;
    await tx.$executeRawUnsafe(sql);
  }
}

export async function findRegistrationForPayment(
  ownerAdminId: string,
  trackingNumber: string,
): Promise<RegistrationPaymentLookup | null> {
  const registration = await prisma.registration.findFirst({
    where: {
      ownerAdminId,
      trackingNumber: trackingNumber.trim(),
    },
    select: {
      id: true,
      trackingNumber: true,
      customerName: true,
      processType: true,
      totalCharges: true,
      advancePaid: true,
      balanceAmount: true,
    },
  });

  if (!registration) return null;

  return mapRegistrationPayment(registration);
}

export async function getPaymentUpdates(ownerAdminId: string): Promise<PaymentUpdateResponse> {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const items = await prisma.paymentUpdate.findMany({
    where: { ownerAdminId },
    orderBy: [{ submittedAt: "desc" }],
    include: { registration: true, invoiceGroup: true },
  });
  const groups = groupPaymentsByInvoice(items);

  return {
    items: groups.map((group) => {
      const item = pickInvoicePayment(group);
      const invoice = item.invoiceGroup;
      const registrations = group.map((payment) => mapRegistrationPayment(payment.registration));
      return {
        ...registrations[0],
        id: item.id,
        invoiceGroupId: item.invoiceGroupId ?? item.id,
        trackingNumbers: registrations.map((registration) => registration.trackingNumber),
        registrations,
        paymentMode: invoice?.paymentMode ?? item.paymentMode,
        amountPaid: toNumber(invoice?.amountPaid ?? item.amountPaid),
        invoiceNumber: invoice?.invoiceNumber ?? item.invoiceNumber,
        paymentDate: (invoice?.paymentDate ?? item.paymentDate).toISOString().slice(0, 10),
        receiptFileUrl: (invoice?.receiptFileName ?? item.receiptFileName) ? buildReceiptUrl(item.id) : null,
        receiptFileName: invoice?.receiptFileName ?? item.receiptFileName ?? null,
        receiptMimeType: invoice?.receiptMimeType ?? item.receiptMimeType ?? null,
        receiptUploadedAt: (invoice?.receiptUploadedAt ?? item.receiptUploadedAt)?.toISOString() ?? null,
        receiptUploadedBy: invoice?.receiptUploadedBy ?? item.receiptUploadedBy ?? null,
        submittedBy: invoice?.submittedBy ?? item.submittedBy ?? "-",
        submittedAt: formatDate(invoice?.submittedAt ?? item.submittedAt),
        approvalStatus: invoice?.approvalStatus ?? item.approvalStatus,
      };
    }),
    stats: {
      pendingPayments: groups.filter((group) => (pickInvoicePayment(group).invoiceGroup?.approvalStatus ?? pickInvoicePayment(group).approvalStatus) === "Pending").length,
      totalCollectionsToday: groups
        .filter((group) => {
          const item = pickInvoicePayment(group);
          const submittedAt = item.invoiceGroup?.submittedAt ?? item.submittedAt;
          return submittedAt >= todayStart && submittedAt < todayEnd;
        })
        .reduce((sum, group) => {
          const item = pickInvoicePayment(group);
          return sum + toNumber(item.invoiceGroup?.amountPaid ?? item.amountPaid);
        }, 0),
    },
  };
}

export async function getAccountTally(ownerAdminId: string): Promise<AccountTallyResponse> {
  const items = await prisma.paymentUpdate.findMany({
    where: { ownerAdminId },
    orderBy: [{ submittedAt: "desc" }],
    include: { registration: true, invoiceGroup: true },
  });
  const groups = groupPaymentsByInvoice(items);
  const tallyItems = groups.map((group) => {
    const item = pickInvoicePayment(group);
    const invoice = item.invoiceGroup;
    const registrations = group.map((payment) => mapRegistrationPayment(payment.registration));
    const totalCharges = registrations.reduce((sum, registration) => sum + registration.totalCharges, 0);
    const advancePaid = registrations.reduce((sum, registration) => sum + registration.advancePaid, 0);
    const amountPaid = toNumber(invoice?.amountPaid ?? item.amountPaid);

    return {
      id: item.id,
      invoiceGroupId: item.invoiceGroupId ?? item.id,
      invoiceNumber: invoice?.invoiceNumber ?? item.invoiceNumber,
      trackingNumbers: registrations.map((registration) => registration.trackingNumber),
      customerNames: registrations.map((registration) => registration.customerName),
      processTypes: Array.from(new Set(registrations.map((registration) => registration.processType))),
      totalCharges,
      advancePaid,
      amountPaid,
      pendingAmount: Math.max(totalCharges - amountPaid, 0),
      paymentMode: invoice?.paymentMode ?? item.paymentMode,
      paymentDate: (invoice?.paymentDate ?? item.paymentDate).toISOString().slice(0, 10),
      approvalStatus: invoice?.approvalStatus ?? item.approvalStatus,
    };
  });

  return {
    items: tallyItems,
    stats: {
      totalCharges: tallyItems.reduce((sum, item) => sum + item.totalCharges, 0),
      totalReceived: tallyItems.reduce((sum, item) => sum + item.amountPaid, 0),
      totalPending: tallyItems.reduce((sum, item) => sum + item.pendingAmount, 0),
    },
  };
}

export async function createPaymentUpdate(args: {
  ownerAdminId: string;
  trackingNumber?: string;
  trackingNumbers?: string[];
  paymentMode: PaymentMode;
  amountPaid: unknown;
  invoiceNumber: string;
  paymentDate: unknown;
  receiptFile: UploadFileInput;
  submittedBy?: string;
}) {
  if (!["Cash", "Online", "Cheque"].includes(args.paymentMode)) {
    throw new Error("A valid payment mode is required.");
  }

  if (!args.invoiceNumber.trim()) {
    throw new Error("Invoice number is required.");
  }

  if (!args.receiptFile) {
    throw new Error("Receipt file is required");
  }

  validateUpload(args.receiptFile, "Receipt file");
  const receiptFile = args.receiptFile;

  const trackingNumbers = Array.from(
    new Set(
      (args.trackingNumbers?.length ? args.trackingNumbers : [args.trackingNumber ?? ""])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (trackingNumbers.length === 0) {
    throw new Error("At least one tracking number is required.");
  }

  const registrations = await prisma.registration.findMany({
    where: { ownerAdminId: args.ownerAdminId, trackingNumber: { in: trackingNumbers } },
  });

  if (registrations.length !== trackingNumbers.length) {
    throw new Error("Tracking number not found in revenue registration.");
  }

  const amountPaid = parseAmount(args.amountPaid, "Amount paid");
  const paymentDate = parseDate(args.paymentDate, "Payment date");

  const paymentUpdateId = randomUUID();
  const receiptUploadedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.paymentInvoice.create({
      data: {
        id: paymentUpdateId,
        paymentMode: args.paymentMode,
        amountPaid,
        invoiceNumber: args.invoiceNumber.trim(),
        paymentDate,
        receiptFileUrl: buildReceiptUrl(paymentUpdateId),
        receiptFileName: receiptFile.fileName,
        receiptMimeType: receiptFile.mimeType,
        receiptFileSize: receiptFile.fileSize,
        receiptFileData: receiptFile.fileData,
        receiptUploadedAt,
        receiptUploadedBy: args.submittedBy ?? null,
        submittedBy: args.submittedBy ?? null,
        approvalStatus: "Pending",
        ownerAdminId: args.ownerAdminId,
      },
    });

    const createdPayments = [];
    for (const [index, registration] of registrations.entries()) {
      const payment = await tx.paymentUpdate.create({
        data: {
          id: index === 0 ? paymentUpdateId : randomUUID(),
          invoiceGroupId: invoice.id,
          registrationId: registration.id,
          trackingNumber: registration.trackingNumber,
          customerName: registration.customerName,
          processType: registration.processType,
          totalCharges: registration.totalCharges,
          advancePaid: registration.advancePaid,
          balanceAmount: registration.balanceAmount,
          paymentMode: args.paymentMode,
          amountPaid: index === 0 ? amountPaid : new Prisma.Decimal(0),
          invoiceNumber: args.invoiceNumber.trim(),
          paymentDate,
          receiptFileUrl: buildReceiptUrl(paymentUpdateId),
          receiptFileName: index === 0 ? receiptFile.fileName : null,
          receiptMimeType: index === 0 ? receiptFile.mimeType : null,
          receiptFileSize: index === 0 ? receiptFile.fileSize : null,
          receiptFileData: index === 0 ? receiptFile.fileData : null,
          receiptUploadedAt,
          receiptUploadedBy: args.submittedBy ?? null,
          submittedBy: args.submittedBy ?? null,
          approvalStatus: "Pending",
          ownerAdminId: args.ownerAdminId,
        },
      });
      createdPayments.push(payment);
      const receivedAmt = index === 0 ? Number(amountPaid) : Number(registration.balanceReceivedAmount || 0);
      const newBalance = Math.max(0, Number(registration.totalCharges) - receivedAmt);
      const newPaymentStatus = calculatePaymentStatus({
        approvalStatus: registration.approvalStatus,
        totalCharges: Number(registration.totalCharges),
        advancePaid: Number(registration.advancePaid),
        balanceAmount: newBalance,
        receivedAmount: receivedAmt,
      });

      await tx.registration.update({
        where: { id: registration.id },
        data: {
          paymentMode: args.paymentMode,
          paymentUpdateStatus: "Submitted",
          paymentStatus: newPaymentStatus,
          balanceReceivedAmount: index === 0 ? amountPaid : registration.balanceReceivedAmount,
          submittedBy: args.submittedBy ?? null,
          submittedAt: invoice.submittedAt,
          financeApprovalStatus: "Pending",
          rejectionReason: null,
          auditTrail: {
            create: {
              action: "Payment update submitted",
              description: `Payment update ${invoice.invoiceNumber} submitted for grouped invoice tracking ${registration.trackingNumber}.`,
              performedBy: args.submittedBy ?? null,
            },
          },
        },
      });
    }

    return createdPayments[0];
  });
}

export async function getAccountTransactions(ownerAdminId: string): Promise<AccountTransactionResponse> {
  const items = await prisma.accountTransaction.findMany({
    where: { ownerAdminId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      transactionType: item.transactionType,
      category: item.category,
      amount: toNumber(item.amount),
      creditOrDebit: item.creditOrDebit as CreditOrDebit,
      date: item.date.toISOString().slice(0, 10),
      description: item.description ?? "",
      voucherNumber: item.voucherNumber,
      createdBy: item.createdBy ?? "-",
    })),
    stats: {
      totalCredits: items
        .filter((item) => item.creditOrDebit === "Credit")
        .reduce((sum, item) => sum + toNumber(item.amount), 0),
      totalDebits: items
        .filter((item) => item.creditOrDebit === "Debit")
        .reduce((sum, item) => sum + toNumber(item.amount), 0),
    },
  };
}

export async function createAccountTransaction(args: {
  ownerAdminId: string;
  transactionType: TransactionType;
  category: string;
  amount: unknown;
  date: unknown;
  description?: string;
  billFile: UploadFileInput;
  createdBy?: string;
}) {
  if (!["Cash", "UPI", "Cheque"].includes(args.transactionType)) {
    throw new Error("A valid transaction type is required.");
  }

  validateUpload(args.billFile, "Bill or voucher");
  const creditOrDebit = getCreditOrDebit(args.category);
  const amount = parseAmount(args.amount, "Amount");
  const date = parseDate(args.date, "Date");

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.accountTransaction.create({
      data: {
        transactionType: args.transactionType,
        category: args.category,
        amount,
        creditOrDebit,
        date,
        description: args.description?.trim() || null,
        voucherNumber: buildVoucherNumber(),
        billFileName: args.billFile?.fileName ?? null,
        billMimeType: args.billFile?.mimeType ?? null,
        billFileSize: args.billFile?.fileSize ?? null,
        billFileData: args.billFile?.fileData ?? null,
        createdBy: args.createdBy ?? null,
        ownerAdminId: args.ownerAdminId,
      },
    });

    await tx.accountStatementEntry.create({
      data: {
        date,
        voucherNumber: transaction.voucherNumber,
        particulars: args.category,
        entryType: creditOrDebit,
        credit: creditOrDebit === "Credit" ? amount : new Prisma.Decimal(0),
        debit: creditOrDebit === "Debit" ? amount : new Prisma.Decimal(0),
        sourceType: "AccountTransaction",
        sourceId: transaction.id,
        accountTransactionId: transaction.id,
        ownerAdminId: args.ownerAdminId,
        createdBy: args.createdBy ?? null,
      },
    });

    await recalculateRunningBalances(args.ownerAdminId, tx);
    return transaction;
  });
}

export async function getAccountStatement(
  ownerAdminId: string,
  search?: string,
): Promise<AccountStatementResponse> {
  const query = search?.trim();
  const where: Prisma.AccountStatementEntryWhereInput = {
    ownerAdminId,
    reversedAt: null,
    ...(query
      ? {
          OR: [
            { trackingNumber: { contains: query } },
            { invoiceNumber: { contains: query } },
            { voucherNumber: { contains: query } },
            {
              paymentUpdate: {
                registration: {
                  customerName: { contains: query },
                },
              },
            },
            {
              paymentUpdate: {
                invoiceGroup: {
                  paymentUpdates: {
                    some: {
                      OR: [
                        { trackingNumber: { contains: query } },
                        { customerName: { contains: query } },
                        {
                          registration: {
                            customerName: { contains: query },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const items = await prisma.accountStatementEntry.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      paymentUpdate: {
        include: {
          invoiceGroup: {
            include: {
              paymentUpdates: {
                include: { registration: true },
                orderBy: { trackingNumber: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const allItems = await prisma.accountStatementEntry.findMany({
    where: { ownerAdminId, reversedAt: null },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const totalCredit = allItems.reduce((sum, item) => sum + toNumber(item.credit), 0);
  const totalDebit = allItems.reduce((sum, item) => sum + toNumber(item.debit), 0);
  const closingBalance = totalCredit - totalDebit;
  const todayStart = startOfDay(new Date());
  const openingBalance = allItems
    .filter((item) => item.date < todayStart)
    .reduce((sum, item) => sum + toNumber(item.credit) - toNumber(item.debit), 0);

  const groupByParticulars = (entryType: CreditOrDebit) => {
    const grouped = new Map<string, number>();
    for (const item of allItems.filter((entry) => entry.entryType === entryType)) {
      grouped.set(item.particulars, (grouped.get(item.particulars) ?? 0) + (entryType === "Credit" ? toNumber(item.credit) : toNumber(item.debit)));
    }
    return Array.from(grouped.entries()).map(([particulars, amount]) => ({ particulars, amount }));
  };

  return {
    creditSummary: groupByParticulars("Credit"),
    debitSummary: groupByParticulars("Debit"),
    summary: {
      totalCredit,
      totalDebit,
      openingBalance,
      closingBalance,
      netProfitLoss: closingBalance,
    },
    items: items.map((item) => ({
      id: item.id,
      date: formatDate(item.date),
      trackingNumber: item.trackingNumber ?? "-",
      trackingNumbers:
        item.paymentUpdate?.invoiceGroup?.paymentUpdates.map((payment) => payment.trackingNumber) ??
        (item.trackingNumber ? [item.trackingNumber] : []),
      invoiceNumber: item.invoiceNumber ?? "-",
      voucherNumber: item.voucherNumber ?? "-",
      particulars: item.particulars,
      type: item.entryType as CreditOrDebit,
      credit: toNumber(item.credit),
      debit: toNumber(item.debit),
      runningBalance: toNumber(item.runningBalance),
    })),
  };
}

export async function getAdminApprovalQueue(ownerAdminId: string): Promise<AdminApprovalResponse> {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const items = await prisma.paymentUpdate.findMany({
    where: { ownerAdminId },
    orderBy: [{ submittedAt: "desc" }],
    include: { registration: true, invoiceGroup: true },
  });
  const groups = groupPaymentsByInvoice(items);

  return {
    items: groups.map((group) => {
      const item = pickInvoicePayment(group);
      const invoice = item.invoiceGroup;
      const registrations = group.map((payment) => mapRegistrationPayment(payment.registration));
      return {
        id: item.id,
        invoiceGroupId: item.invoiceGroupId ?? item.id,
        trackingNumber: registrations[0]?.trackingNumber ?? item.trackingNumber,
        trackingNumbers: registrations.map((registration) => registration.trackingNumber),
        customerName: registrations[0]?.customerName ?? item.customerName,
        customerNames: registrations.map((registration) => registration.customerName),
        processType: registrations[0]?.processType ?? item.processType ?? "-",
        processTypes: Array.from(new Set(registrations.map((registration) => registration.processType))),
        totalCharges: registrations.reduce((sum, registration) => sum + registration.totalCharges, 0),
        advancePaid: registrations.reduce((sum, registration) => sum + registration.advancePaid, 0),
        balanceAmount: registrations.reduce((sum, registration) => sum + registration.balanceAmount, 0),
        paymentMode: invoice?.paymentMode ?? item.paymentMode,
        invoiceNumber: invoice?.invoiceNumber ?? item.invoiceNumber,
        receiptFileUrl: (invoice?.receiptFileName ?? item.receiptFileName) ? buildReceiptUrl(item.id) : null,
        receiptFileName: invoice?.receiptFileName ?? item.receiptFileName ?? null,
        receiptMimeType: invoice?.receiptMimeType ?? item.receiptMimeType ?? null,
        receiptUploadedAt: (invoice?.receiptUploadedAt ?? item.receiptUploadedAt)?.toISOString() ?? null,
        receiptUploadedBy: invoice?.receiptUploadedBy ?? item.receiptUploadedBy ?? null,
        paymentDate: (invoice?.paymentDate ?? item.paymentDate).toISOString().slice(0, 10),
        submittedBy: invoice?.submittedBy ?? item.submittedBy ?? "-",
        submittedDate: formatDate(invoice?.submittedAt ?? item.submittedAt),
        submittedAt: (invoice?.submittedAt ?? item.submittedAt).toISOString(),
        approvalStatus: invoice?.approvalStatus ?? item.approvalStatus,
      };
    }),
    stats: {
      pendingApprovals: groups.filter((group) => (pickInvoicePayment(group).invoiceGroup?.approvalStatus ?? pickInvoicePayment(group).approvalStatus) === "Pending").length,
      approvedToday: groups.filter((group) => {
        const item = pickInvoicePayment(group);
        const approvedAt = item.invoiceGroup?.approvedAt ?? item.approvedAt;
        return (item.invoiceGroup?.approvalStatus ?? item.approvalStatus) === "Approved" && approvedAt && approvedAt >= todayStart && approvedAt < todayEnd;
      }).length,
      resetRequests: groups.filter((group) => {
        const item = pickInvoicePayment(group);
        const resetAt = item.invoiceGroup?.resetAt ?? item.resetAt;
        return resetAt && resetAt >= todayStart && resetAt < todayEnd;
      }).length,
    },
  };
}

export async function getPaymentReceiptForApproval(ownerAdminId: string, paymentUpdateId: string) {
  const payment = await prisma.paymentUpdate.findFirst({
    where: {
      id: paymentUpdateId,
      ownerAdminId,
    },
    select: {
      id: true,
      receiptFileName: true,
      receiptMimeType: true,
      receiptFileSize: true,
      receiptFileData: true,
    },
  });

  if (!payment?.receiptFileName || !payment.receiptMimeType || !payment.receiptFileData) {
    return null;
  }

  return {
    fileName: payment.receiptFileName,
    mimeType: payment.receiptMimeType,
    fileSize: payment.receiptFileSize ?? payment.receiptFileData.byteLength,
    fileData: payment.receiptFileData,
  };
}

export async function approvePaymentUpdate(args: {
  ownerAdminId: string;
  id: string;
  performedBy?: string;
}) {
  const payment = await prisma.paymentUpdate.findFirst({
    where: { id: args.id, ownerAdminId: args.ownerAdminId },
    include: {
      invoiceGroup: {
        include: {
          paymentUpdates: { include: { registration: true }, orderBy: { trackingNumber: "asc" } },
        },
      },
      registration: true,
    },
  });

  if (!payment) throw new Error("Submitted payment update not found.");
  const invoice = payment.invoiceGroup;
  const groupPayments = invoice?.paymentUpdates ?? [payment];
  const approvalStatus = invoice?.approvalStatus ?? payment.approvalStatus;
  if (approvalStatus === "Approved") throw new Error("Payment update is already approved.");

  const approvedAt = new Date();
  return prisma.$transaction(async (tx) => {
    if (invoice) {
      await tx.paymentInvoice.update({
        where: { id: invoice.id },
        data: {
          approvalStatus: "Approved",
          approvedBy: args.performedBy ?? null,
          approvedAt,
          resetBy: null,
          resetAt: null,
          resetReason: null,
        },
      });
    }

    await tx.paymentUpdate.updateMany({
      where: { id: { in: groupPayments.map((item) => item.id) } },
      data: {
        approvalStatus: "Approved",
        approvedBy: args.performedBy ?? null,
        approvedAt,
        resetBy: null,
        resetAt: null,
        resetReason: null,
      },
    });

    for (const child of groupPayments) {
      await tx.registration.update({
        where: { id: child.registrationId },
        data: {
          financeApprovalStatus: "Approved",
          approvedBy: args.performedBy ?? null,
          approvedAt,
          auditTrail: {
            create: {
              action: "Finance approved",
              description: `Finance approved invoice ${payment.invoiceNumber}.`,
              performedBy: args.performedBy ?? null,
            },
          },
        },
      });
    }

    const existingEntry = await tx.accountStatementEntry.findFirst({
      where: {
        ownerAdminId: args.ownerAdminId,
        sourceType: "PaymentInvoice",
        sourceId: invoice?.id ?? payment.id,
        reversedAt: null,
      },
    });

    if (!existingEntry) {
      const trackingNumbers = groupPayments.map((child) => child.trackingNumber).join("\n");
      await tx.accountStatementEntry.create({
        data: {
          date: invoice?.paymentDate ?? payment.paymentDate,
          trackingNumber: trackingNumbers,
          invoiceNumber: payment.invoiceNumber,
          particulars: "Customer Payment",
          entryType: "Credit",
          credit: invoice?.amountPaid ?? payment.amountPaid,
          debit: new Prisma.Decimal(0),
          sourceType: "PaymentInvoice",
          sourceId: invoice?.id ?? payment.id,
          paymentUpdateId: payment.id,
          registrationId: payment.registrationId,
          ownerAdminId: args.ownerAdminId,
          createdBy: args.performedBy ?? null,
        },
      });
    }

    await recalculateRunningBalances(args.ownerAdminId, tx);
  });
}

export async function resetPaymentApproval(args: {
  ownerAdminId: string;
  id: string;
  performedBy?: string;
  reason?: string;
}) {
  if (!args.reason?.trim()) {
    throw new Error("Reset reason is required.");
  }
  const resetReason = args.reason.trim();

  const payment = await prisma.paymentUpdate.findFirst({
    where: { id: args.id, ownerAdminId: args.ownerAdminId },
    include: {
      invoiceGroup: {
        include: {
          paymentUpdates: true,
        },
      },
    },
  });

  if (!payment) throw new Error("Payment update not found.");
  const invoice = payment.invoiceGroup;
  const groupPayments = invoice?.paymentUpdates ?? [payment];
  const approvalStatus = invoice?.approvalStatus ?? payment.approvalStatus;
  if (approvalStatus !== "Approved") throw new Error("Only approved payments can be reset.");

  const resetAt = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.accountStatementEntry.updateMany({
      where: {
        ownerAdminId: args.ownerAdminId,
        OR: [
          { sourceType: "PaymentInvoice", sourceId: invoice?.id ?? payment.id },
          { paymentUpdateId: { in: groupPayments.map((item) => item.id) } },
        ],
        reversedAt: null,
      },
      data: {
        reversedAt: resetAt,
        reversedBy: args.performedBy ?? null,
        reversalReason: resetReason,
      },
    });

    if (invoice) {
      await tx.paymentInvoice.update({
        where: { id: invoice.id },
        data: {
          approvalStatus: "Pending",
          approvedBy: null,
          approvedAt: null,
          resetBy: args.performedBy ?? null,
          resetAt,
          resetReason,
        },
      });
    }

    await tx.paymentUpdate.updateMany({
      where: { id: { in: groupPayments.map((item) => item.id) } },
      data: {
        approvalStatus: "Pending",
        approvedBy: null,
        approvedAt: null,
        resetBy: args.performedBy ?? null,
        resetAt,
        resetReason,
      },
    });

    for (const child of groupPayments) {
      await tx.registration.update({
        where: { id: child.registrationId },
        data: {
          financeApprovalStatus: "Pending",
          approvedBy: null,
          approvedAt: null,
          auditTrail: {
            create: {
              action: "Finance approval reset",
              description: resetReason,
              performedBy: args.performedBy ?? null,
            },
          },
        },
      });
    }

    await recalculateRunningBalances(args.ownerAdminId, tx);
  });
}
