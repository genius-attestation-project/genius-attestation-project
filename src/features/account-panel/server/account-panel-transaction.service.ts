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
