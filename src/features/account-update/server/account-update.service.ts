import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AccountTallyResponse,
  AdminApprovalResponse,
  PaymentUpdateResponse,
} from "@/features/account-update/types/account-update.types";

type FinanceRegistrationRow = {
  id: string;
  tracking_number: string;
  customer_name: string;
  process_type: string | null;
  total_charges: Prisma.Decimal | number;
  advance_paid: Prisma.Decimal | number;
  balance_amount: Prisma.Decimal | number;
  balance_received_amount: Prisma.Decimal | number;
  payment_mode: string | null;
  payment_status: string;
  payment_update_status: string;
  submitted_by: string | null;
  submitted_at: Date | null;
  finance_approval_status: string;
  approved_by: string | null;
  approved_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
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

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : Number(value);
}

function getPendingAmount(totalCharges: number, advancePaid: number, collectedBalance: number) {
  return Math.max(totalCharges - (advancePaid + collectedBalance), 0);
}

async function getFinanceRows(ownerAdminId: string, whereClause?: Prisma.Sql) {
  return prisma.$queryRaw<FinanceRegistrationRow[]>(Prisma.sql`
    SELECT
      id,
      tracking_number,
      customer_name,
      process_type,
      total_charges,
      advance_paid,
      balance_amount,
      balance_received_amount,
      payment_mode,
      payment_status,
      payment_update_status,
      submitted_by,
      submitted_at,
      finance_approval_status,
      approved_by,
      approved_at,
      rejection_reason,
      created_at
    FROM registrations
    WHERE owner_admin_id = ${ownerAdminId}
    ${whereClause ? Prisma.sql`AND ${whereClause}` : Prisma.empty}
    ORDER BY created_at DESC
  `);
}

export async function getPaymentUpdateQueue(ownerAdminId: string): Promise<PaymentUpdateResponse> {
  const items = await getFinanceRows(
    ownerAdminId,
    Prisma.sql`balance_amount > 0 AND payment_update_status <> 'Submitted'`,
  );

  return {
    items: items.map((item) => ({
      id: item.id,
      trackingNumber: item.tracking_number,
      customerName: item.customer_name,
      processType: item.process_type ?? "-",
      totalCharges: toNumber(item.total_charges),
      advancePaid: toNumber(item.advance_paid),
      balanceAmount: toNumber(item.balance_amount),
      paymentMode: item.payment_mode ?? "-",
      registrationDate: formatDate(item.created_at),
      paymentUpdateStatus: item.payment_update_status,
    })),
    stats: {
      pendingCollections: items.length,
      totalBalanceDue: items.reduce((sum, item) => sum + toNumber(item.balance_amount), 0),
    },
  };
}

export async function submitPaymentUpdate(ownerAdminId: string, id: string, performedBy?: string) {
  const [registration] = await prisma.$queryRaw<FinanceRegistrationRow[]>(Prisma.sql`
    SELECT
      id,
      tracking_number,
      balance_amount,
      payment_update_status,
      finance_approval_status
    FROM registrations
    WHERE owner_admin_id = ${ownerAdminId}
      AND id = ${id}
    LIMIT 1
  `);

  if (!registration) {
    throw new Error("Registration not found.");
  }

  if (toNumber(registration.balance_amount) <= 0) {
    throw new Error("This registration has no pending balance.");
  }

  if (registration.payment_update_status === "Submitted") {
    throw new Error("Payment has already been submitted for tally.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`
      UPDATE registrations
      SET
        payment_status = 'Paid',
        payment_update_status = 'Submitted',
        submitted_by = ${performedBy ?? null},
        submitted_at = ${now},
        finance_approval_status = 'Pending',
        approved_by = NULL,
        approved_at = NULL,
        rejection_reason = NULL,
        balance_received_amount = balance_amount
      WHERE id = ${registration.id}
    `),
    prisma.auditTrail.create({
      data: {
        registrationId: registration.id,
        action: "Payment submitted",
        description: `Balance payment submitted for registration ${registration.tracking_number}.`,
        performedBy: performedBy ?? null,
      },
    }),
  ]);

  return {
    id: registration.id,
    trackingNumber: registration.tracking_number,
    paymentUpdateStatus: "Submitted",
    submittedAt: now.toISOString(),
  };
}

export async function getAccountTally(ownerAdminId: string): Promise<AccountTallyResponse> {
  const items = await getFinanceRows(
    ownerAdminId,
    Prisma.sql`(total_charges > 0 OR advance_paid > 0 OR balance_received_amount > 0)`,
  );

  const rows = items.map((item) => {
    const credit = toNumber(item.advance_paid);
    const debit = toNumber(item.balance_received_amount);
    const pendingAmount = getPendingAmount(toNumber(item.total_charges), credit, debit);

    return {
      id: item.id,
      trackingNumber: item.tracking_number,
      credit,
      debit,
      pendingAmount,
    };
  });

  return {
    items: rows,
    stats: {
      totalCredit: rows.reduce((sum, item) => sum + item.credit, 0),
      totalDebit: rows.reduce((sum, item) => sum + item.debit, 0),
      totalPending: rows.reduce((sum, item) => sum + item.pendingAmount, 0),
    },
  };
}

export async function getAdminApprovalQueue(ownerAdminId: string): Promise<AdminApprovalResponse> {
  const items = await getFinanceRows(ownerAdminId, Prisma.sql`payment_update_status = 'Submitted'`);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const approvedToday = items.filter(
    (item) =>
      item.finance_approval_status === "Approved" &&
      item.approved_at &&
      item.approved_at >= todayStart &&
      item.approved_at < todayEnd,
  ).length;
  const rejectedToday = items.filter(
    (item) =>
      item.finance_approval_status === "Rejected" &&
      item.approved_at &&
      item.approved_at >= todayStart &&
      item.approved_at < todayEnd,
  ).length;

  return {
    items: items.map((item) => ({
      id: item.id,
      trackingNumber: item.tracking_number,
      customerName: item.customer_name,
      processType: item.process_type ?? "-",
      totalCharges: toNumber(item.total_charges),
      advancePaid: toNumber(item.advance_paid),
      balanceAmount: toNumber(item.balance_amount),
      submittedBy: item.submitted_by ?? "-",
      submittedDate: item.submitted_at ? formatDate(item.submitted_at) : "-",
      submittedAt: item.submitted_at?.toISOString() ?? null,
      financeApprovalStatus: item.finance_approval_status,
      rejectionReason: item.rejection_reason ?? null,
    })),
    stats: {
      pendingApprovals: items.filter((item) => item.finance_approval_status === "Pending").length,
      approvedToday,
      rejectedToday,
    },
  };
}

export async function setAdminApprovalDecision(args: {
  ownerAdminId: string;
  id: string;
  action: "approve" | "reject";
  performedBy?: string;
  reason?: string;
}) {
  const [registration] = await prisma.$queryRaw<FinanceRegistrationRow[]>(Prisma.sql`
    SELECT
      id,
      tracking_number,
      finance_approval_status
    FROM registrations
    WHERE owner_admin_id = ${args.ownerAdminId}
      AND id = ${args.id}
      AND payment_update_status = 'Submitted'
    LIMIT 1
  `);

  if (!registration) {
    throw new Error("Submitted payment record not found.");
  }

  if (args.action === "approve" && registration.finance_approval_status === "Approved") {
    throw new Error("This payment is already approved.");
  }

  if (args.action === "reject" && !args.reason?.trim()) {
    throw new Error("Rejection reason is required.");
  }

  const nextStatus = args.action === "approve" ? "Approved" : "Rejected";
  const approvedAt = new Date();

  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`
      UPDATE registrations
      SET
        finance_approval_status = ${nextStatus},
        approved_by = ${args.performedBy ?? null},
        approved_at = ${approvedAt},
        rejection_reason = ${args.action === "reject" ? args.reason?.trim() ?? null : null}
      WHERE id = ${registration.id}
    `),
    prisma.auditTrail.create({
      data: {
        registrationId: registration.id,
        action: `Finance ${nextStatus.toLowerCase()}`,
        description:
          args.action === "approve"
            ? `Finance approved registration ${registration.tracking_number}.`
            : `Finance rejected registration ${registration.tracking_number}.`,
        performedBy: args.performedBy ?? null,
      },
    }),
  ]);

  return {
    id: registration.id,
    trackingNumber: registration.tracking_number,
    financeApprovalStatus: nextStatus,
    approvedAt: approvedAt.toISOString(),
  };
}
