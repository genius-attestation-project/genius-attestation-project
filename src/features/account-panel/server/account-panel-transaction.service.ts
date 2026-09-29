import { prisma } from "@/lib/prisma";
import type { CreateAccountPanelTransactionInput } from "../validations/account-panel-transaction.schema";

const db = prisma as any;

/**
 * Creates a new transaction entry for a leaf account in the Account Panel.
 */
export async function createAccountPanelTransaction(
  ownerAdminId: string,
  userId: string | undefined,
  userName: string | undefined,
  data: CreateAccountPanelTransactionInput
) {
  const { accountId, invoiceNumber, billAttachment, transactionDate, amount, narration, officeId } = data;

  // 1. Verify account exists
  const account = await db.accountMenu.findFirst({
    where: { id: accountId, ownerAdminId },
  });

  if (!account) {
    throw new Error("Account node not found.");
  }

  // 2. Check parent vs leaf node identification: child count must be 0
  const childCount = await db.accountMenu.count({
    where: { parentId: accountId, ownerAdminId },
  });

  if (childCount > 0) {
    throw new Error(
      "Transactions can only be created for leaf accounts (final child nodes without sub-accounts)."
    );
  }

  // 3. Optional office assignment verification if officeId is provided
  if (officeId) {
    const isAssigned = await db.accountOfficeAssignment.findFirst({
      where: {
        accountNodeId: accountId,
        officeId,
        ownerAdminId,
      },
    });

    // If not directly assigned, verify if any parent node is assigned or if user has full access
    if (!isAssigned) {
      // Check if office exists for owner
      const officeExists = await db.officeLocation.findFirst({
        where: { id: officeId, ownerAdminId },
      });
      if (!officeExists) {
        throw new Error("Specified office location does not exist.");
      }
    }
  }

  // 4. Create transaction record
  const transaction = await db.accountPanelTransaction.create({
    data: {
      accountId,
      invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
      billAttachment: billAttachment ? billAttachment.trim() : null,
      transactionDate: new Date(transactionDate),
      amount: amount,
      narration: narration ? narration.trim() : null,
      officeId: officeId || null,
      createdBy: userId || null,
      createdByName: userName || null,
      ownerAdminId,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          code: true,
          ledgerMapping: true,
        },
      },
    },
  });

  return transaction;
}

/**
 * Fetches transactions recorded for a given leaf account.
 */
export async function getAccountTransactions(
  ownerAdminId: string,
  accountId: string
) {
  const transactions = await db.accountPanelTransaction.findMany({
    where: {
      accountId,
      ownerAdminId,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: {
      transactionDate: "desc",
    },
  });

  return transactions;
}

/**
 * Updates an existing Account Panel transaction.
 */
export async function updateAccountPanelTransaction(
  ownerAdminId: string,
  transactionId: string,
  data: {
    amount?: number;
    transactionDate?: string | Date;
    invoiceNumber?: string | null;
    narration?: string | null;
    billAttachment?: string | null;
  }
) {
  const transaction = await db.accountPanelTransaction.findFirst({
    where: { id: transactionId, ownerAdminId },
  });

  if (!transaction) {
    throw new Error("Account panel transaction not found.");
  }

  const updateData: any = {};
  if (data.amount !== undefined) {
    const amt = Number(data.amount);
    if (isNaN(amt) || amt <= 0) throw new Error("Amount must be greater than zero.");
    updateData.amount = amt;
  }
  if (data.transactionDate !== undefined) {
    updateData.transactionDate = new Date(data.transactionDate);
  }
  if (data.invoiceNumber !== undefined) {
    updateData.invoiceNumber = data.invoiceNumber?.trim() || null;
  }
  if (data.narration !== undefined) {
    updateData.narration = data.narration?.trim() || null;
  }
  if (data.billAttachment !== undefined) {
    updateData.billAttachment = data.billAttachment?.trim() || null;
  }

  const updated = await db.accountPanelTransaction.update({
    where: { id: transactionId },
    data: updateData,
    include: {
      account: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  return updated;
}

/**
 * Deletes an existing Account Panel transaction.
 */
export async function deleteAccountPanelTransaction(
  ownerAdminId: string,
  transactionId: string
) {
  const transaction = await db.accountPanelTransaction.findFirst({
    where: { id: transactionId, ownerAdminId },
  });

  if (!transaction) {
    throw new Error("Account panel transaction not found.");
  }

  await db.accountPanelTransaction.delete({
    where: { id: transactionId },
  });

  return { success: true };
}

/**
 * Helper to check and calculate available advance balance for a given tracking number.
 */
export async function getAvailableAdvanceForTracking(
  ownerAdminId: string,
  trackingNumber: string
) {
  const cleanTracking = trackingNumber ? trackingNumber.trim() : "";
  if (!cleanTracking) {
    return {
      hasAdvance: false,
      trackingNumber: "",
      totalApprovedAdvance: 0,
      totalDebitsUsed: 0,
      availableAdvance: 0,
    };
  }

  // Find approved cash advances matching tracking number
  const approvedAdvances = await db.advancePaymentApproval.findMany({
    where: {
      ownerAdminId,
      status: "Approved",
      OR: [
        { trackingNumber: cleanTracking },
        { registration: { trackingNumber: cleanTracking } },
      ],
    },
    include: {
      registration: {
        select: {
          customerName: true,
          trackingNumber: true,
          regionOfRegistration: true,
          paymentMode: true,
        },
      },
    },
  });

  // Filter for Cash advances
  const cashAdvances = approvedAdvances.filter((a: any) => {
    const mode = (a.paymentMode || a.registration?.paymentMode || "").trim().toLowerCase();
    return mode === "cash";
  });

  const totalApprovedAdvance = cashAdvances.reduce(
    (sum: number, a: any) => sum + Number(a.advanceAmount ?? 0),
    0
  );

  // Find all existing debit transactions that used this tracking number
  const allDebitTransactions = await db.accountPanelTransaction.findMany({
    where: {
      ownerAdminId,
      account: {
        type: { not: "CREDIT" },
      },
    },
    select: {
      id: true,
      amount: true,
      invoiceNumber: true,
    },
  });

  const matchingDebits = allDebitTransactions.filter((tx: any) => {
    if (!tx.invoiceNumber) return false;
    const inv = tx.invoiceNumber.trim().toLowerCase();
    const target = cleanTracking.toLowerCase();
    return (
      inv === target ||
      inv.replace(/^(trk-|inv-|#)/i, "").trim() === target.replace(/^(trk-|inv-|#)/i, "").trim()
    );
  });

  const totalDebitsUsed = matchingDebits.reduce(
    (sum: number, tx: any) => sum + Number(tx.amount ?? 0),
    0
  );

  const availableAdvance = Math.max(0, totalApprovedAdvance - totalDebitsUsed);
  const sample = cashAdvances[0];

  return {
    hasAdvance: cashAdvances.length > 0,
    trackingNumber: cleanTracking,
    customerName: sample?.customerName || sample?.registration?.customerName || null,
    office: sample?.office || sample?.registration?.regionOfRegistration || null,
    totalApprovedAdvance,
    totalDebitsUsed,
    availableAdvance,
  };
}

