import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import {
  buildReceiptUrl,
  readPaymentReceipt,
  storePaymentReceipt,
} from "@/features/account-update/server/receipt-storage.service";
import type {
  AccountStatementResponse,
  AccountTransactionResponse,
  CreditOrDebit,
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

function requireUpload(file: UploadFileInput, label: string): NonNullable<UploadFileInput> {
  if (!file) {
    throw new Error(`${label} is required.`);
  }

  validateUpload(file, label);
  return file;
}

function getCreditOrDebit(category: string): CreditOrDebit {
  if (creditCategories.includes(category)) return "Credit";
  if (debitCategories.includes(category)) return "Debit";
  throw new Error("A valid account category is required.");
}

function buildVoucherNumber() {
  return `VCH-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
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

  let balance = new Prisma.Decimal(0);
  for (const entry of entries) {
    balance = balance.plus(entry.credit).minus(entry.debit);
    await tx.accountStatementEntry.update({
      where: { id: entry.id },
      data: { runningBalance: balance },
    });
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

export async function getPaymentUpdates(ownerAdminId: string): Promise<PaymentUpdateResponse> {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const items = await prisma.paymentUpdate.findMany({
    where: { ownerAdminId },
    orderBy: [{ submittedAt: "desc" }],
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      trackingNumber: item.trackingNumber,
      customerName: item.customerName,
      processType: item.processType ?? "-",
      totalCharges: toNumber(item.totalCharges),
      advancePaid: toNumber(item.advancePaid),
      balanceAmount: toNumber(item.balanceAmount),
      paymentMode: item.paymentMode,
      amountPaid: toNumber(item.amountPaid),
      invoiceNumber: item.invoiceNumber,
      paymentDate: item.paymentDate.toISOString().slice(0, 10),
      receiptFileUrl: item.receiptFileName ? buildReceiptUrl(item.id) : null,
      receiptFileName: item.receiptFileName ?? null,
      receiptMimeType: item.receiptMimeType ?? null,
      receiptUploadedAt: item.receiptUploadedAt?.toISOString() ?? null,
      receiptUploadedBy: item.receiptUploadedBy ?? null,
      submittedBy: item.submittedBy ?? "-",
      submittedAt: formatDate(item.submittedAt),
      approvalStatus: item.approvalStatus,
    })),
    stats: {
      pendingPayments: items.filter((item) => item.approvalStatus === "Pending").length,
      totalCollectionsToday: items
        .filter((item) => item.submittedAt >= todayStart && item.submittedAt < todayEnd)
        .reduce((sum, item) => sum + toNumber(item.amountPaid), 0),
    },
  };
}

export async function createPaymentUpdate(args: {
  ownerAdminId: string;
  trackingNumber: string;
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

  const receiptFile = requireUpload(args.receiptFile, "Transaction receipt");

  const registration = await prisma.registration.findFirst({
    where: { ownerAdminId: args.ownerAdminId, trackingNumber: args.trackingNumber.trim() },
  });

  if (!registration) {
    throw new Error("Tracking number not found in revenue registration.");
  }

  const amountPaid = parseAmount(args.amountPaid, "Amount paid");
  const paymentDate = parseDate(args.paymentDate, "Payment date");

  const paymentUpdateId = randomUUID();
  const receiptUploadedAt = new Date();
  const storedReceipt = await storePaymentReceipt({
    paymentUpdateId,
    fileName: receiptFile.fileName,
    mimeType: receiptFile.mimeType,
    fileData: receiptFile.fileData,
  });

  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentUpdate.create({
      data: {
        id: paymentUpdateId,
        registrationId: registration.id,
        trackingNumber: registration.trackingNumber,
        customerName: registration.customerName,
        processType: registration.processType,
        totalCharges: registration.totalCharges,
        advancePaid: registration.advancePaid,
        balanceAmount: registration.balanceAmount,
        paymentMode: args.paymentMode,
        amountPaid,
        invoiceNumber: args.invoiceNumber.trim(),
        paymentDate,
        receiptFileUrl: storedReceipt.receiptFileUrl,
        receiptFileName: receiptFile.fileName,
        receiptMimeType: receiptFile.mimeType,
        receiptFileSize: receiptFile.fileSize,
        receiptUploadedAt,
        receiptUploadedBy: args.submittedBy ?? null,
        submittedBy: args.submittedBy ?? null,
        approvalStatus: "Pending",
        ownerAdminId: args.ownerAdminId,
      },
    });

    await tx.registration.update({
      where: { id: registration.id },
      data: {
        paymentMode: args.paymentMode,
        paymentUpdateStatus: "Submitted",
        paymentStatus: "Paid",
        balanceReceivedAmount: amountPaid,
        submittedBy: args.submittedBy ?? null,
        submittedAt: payment.submittedAt,
        financeApprovalStatus: "Pending",
        rejectionReason: null,
        auditTrail: {
          create: {
            action: "Payment update submitted",
            description: `Payment update ${payment.invoiceNumber} submitted for ${payment.trackingNumber}.`,
            performedBy: args.submittedBy ?? null,
          },
        },
      },
    });

    return payment;
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
            { trackingNumber: { contains: query, mode: "insensitive" } },
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { voucherNumber: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const items = await prisma.accountStatementEntry.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
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
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      trackingNumber: item.trackingNumber,
      customerName: item.customerName,
      processType: item.processType ?? "-",
      totalCharges: toNumber(item.totalCharges),
      advancePaid: toNumber(item.advancePaid),
      balanceAmount: toNumber(item.balanceAmount),
      paymentMode: item.paymentMode,
      invoiceNumber: item.invoiceNumber,
      receiptFileUrl: item.receiptFileName ? buildReceiptUrl(item.id) : null,
      receiptFileName: item.receiptFileName ?? null,
      receiptMimeType: item.receiptMimeType ?? null,
      receiptUploadedAt: item.receiptUploadedAt?.toISOString() ?? null,
      receiptUploadedBy: item.receiptUploadedBy ?? null,
      paymentDate: item.paymentDate.toISOString().slice(0, 10),
      submittedBy: item.submittedBy ?? "-",
      submittedDate: formatDate(item.submittedAt),
      submittedAt: item.submittedAt.toISOString(),
      approvalStatus: item.approvalStatus,
    })),
    stats: {
      pendingApprovals: items.filter((item) => item.approvalStatus === "Pending").length,
      approvedToday: items.filter(
        (item) => item.approvalStatus === "Approved" && item.approvedAt && item.approvedAt >= todayStart && item.approvedAt < todayEnd,
      ).length,
      resetRequests: items.filter((item) => item.resetAt && item.resetAt >= todayStart && item.resetAt < todayEnd).length,
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
      receiptFileUrl: true,
    },
  });

  if (!payment?.receiptFileName || !payment.receiptMimeType) {
    return null;
  }

  const receipt = await readPaymentReceipt(payment.id, payment.receiptFileName, payment.receiptFileUrl).catch(() => null);
  if (!receipt) {
    return null;
  }

  return {
    fileName: payment.receiptFileName,
    mimeType: payment.receiptMimeType,
    fileSize: receipt.fileSize,
    fileData: receipt.fileData,
  };
}

export async function approvePaymentUpdate(args: {
  ownerAdminId: string;
  id: string;
  performedBy?: string;
}) {
  const payment = await prisma.paymentUpdate.findFirst({
    where: { id: args.id, ownerAdminId: args.ownerAdminId },
  });

  if (!payment) throw new Error("Submitted payment update not found.");
  if (payment.approvalStatus === "Approved") throw new Error("Payment update is already approved.");

  const approvedAt = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.paymentUpdate.update({
      where: { id: payment.id },
      data: {
        approvalStatus: "Approved",
        approvedBy: args.performedBy ?? null,
        approvedAt,
        resetBy: null,
        resetAt: null,
        resetReason: null,
      },
    });

    await tx.registration.update({
      where: { id: payment.registrationId },
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

    const existingEntry = await tx.accountStatementEntry.findFirst({
      where: {
        ownerAdminId: args.ownerAdminId,
        paymentUpdateId: payment.id,
        reversedAt: null,
      },
    });

    if (!existingEntry) {
      await tx.accountStatementEntry.create({
        data: {
          date: payment.paymentDate,
          trackingNumber: payment.trackingNumber,
          invoiceNumber: payment.invoiceNumber,
          particulars: "Customer Payment",
          entryType: "Credit",
          credit: payment.totalCharges,
          debit: new Prisma.Decimal(0),
          sourceType: "PaymentUpdate",
          sourceId: payment.id,
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
  });

  if (!payment) throw new Error("Payment update not found.");
  if (payment.approvalStatus !== "Approved") throw new Error("Only approved payments can be reset.");

  const resetAt = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.accountStatementEntry.updateMany({
      where: {
        ownerAdminId: args.ownerAdminId,
        paymentUpdateId: payment.id,
        reversedAt: null,
      },
      data: {
        reversedAt: resetAt,
        reversedBy: args.performedBy ?? null,
        reversalReason: resetReason,
      },
    });

    await tx.paymentUpdate.update({
      where: { id: payment.id },
      data: {
        approvalStatus: "Pending",
        approvedBy: null,
        approvedAt: null,
        resetBy: args.performedBy ?? null,
        resetAt,
        resetReason,
      },
    });

    await tx.registration.update({
      where: { id: payment.registrationId },
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

    await recalculateRunningBalances(args.ownerAdminId, tx);
  });
}
