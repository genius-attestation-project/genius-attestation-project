import { prisma } from "@/lib/prisma";
import type {
  AccountStatementsData,
  AccountStatementFiltersInput,
  AccountStatementItem,
  DebitAccountGroup,
} from "../types/account-statements.types";

const db = prisma as any;

/**
 * Fetches unified account statements data combining approved advance payments and account panel transactions.
 */
export async function getAccountStatements(
  ownerAdminId: string,
  filters: AccountStatementFiltersInput
): Promise<AccountStatementsData> {
  const { office, fromDate, toDate, search, transactionType = "ALL" } = filters;

  const officeFilter = office && office !== "All" && office !== "Select Office" ? office.trim() : null;
  const searchFilter = search ? search.trim().toLowerCase() : null;

  // Enforce mandatory parameters: office, fromDate, and toDate
  if (!officeFilter || !fromDate || !toDate) {
    return {
      office: officeFilter || "",
      fromDate: fromDate || "",
      toDate: toDate || "",
      openingBalance: 0,
      credit: {
        advances: [],
        advancesTotal: 0,
        moreAdvances: [],
        moreAdvancesTotal: 0,
        panelCredits: [],
        panelCreditsTotal: 0,
        creditTotal: 0,
      },
      debit: {
        groups: [],
        debitTotal: 0,
      },
      cashInHand: 0,
    };
  }

  // Build Date filters
  const dateFrom = new Date(fromDate);
  const dateTo = new Date(`${toDate}T23:59:59.999Z`);

  // ----------------------------------------------------
  // 1. Fetch APPROVED Advance Payments (Status = 'Approved')
  // CRITICAL RULE: Pending advance payments MUST NEVER appear in Account Statements
  // ----------------------------------------------------
  const advanceWhere: any = {
    ownerAdminId,
    status: "Approved",
  };

  if (officeFilter) {
    advanceWhere.OR = [
      { office: { equals: officeFilter } },
      { registration: { regionOfRegistration: { equals: officeFilter } } },
      { registration: { deliveryLocation: { equals: officeFilter } } },
    ];
  }

  if (dateFrom || dateTo) {
    advanceWhere.paymentDate = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const approvedAdvancesRaw = await db.advancePaymentApproval.findMany({
    where: advanceWhere,
    orderBy: { paymentDate: "desc" },
    include: {
      registration: {
        select: {
          id: true,
          trackingNumber: true,
          customerName: true,
          regionOfRegistration: true,
          registeredPerson: true,
        },
      },
    },
  });

  // Filter advances by search term if provided
  const filteredAdvances = approvedAdvancesRaw.filter((item: any) => {
    if (!searchFilter) return true;
    const tracking = (item.trackingNumber || "").toLowerCase();
    const customer = (item.customerName || "").toLowerCase();
    const collector = (item.collectedBy || item.requestedByName || item.registeredPerson || "").toLowerCase();
    const mode = (item.paymentMode || "").toLowerCase();
    const ref = (item.referenceNumber || "").toLowerCase();
    return (
      tracking.includes(searchFilter) ||
      customer.includes(searchFilter) ||
      collector.includes(searchFilter) ||
      mode.includes(searchFilter) ||
      ref.includes(searchFilter)
    );
  });

  // Split into Cash Advances vs Non-Cash Advances
  const advancesList: AccountStatementItem[] = [];
  const moreAdvancesList: AccountStatementItem[] = [];
  const bankPaymentDebitItems: AccountStatementItem[] = [];

  let advanceSlNo = 1;
  let moreAdvanceSlNo = 1;

  for (const item of filteredAdvances) {
    const isCash = (item.paymentMode || "").trim().toLowerCase() === "cash";
    const dateStr = item.paymentDate
      ? new Date(item.paymentDate).toISOString().split("T")[0]
      : new Date(item.createdAt).toISOString().split("T")[0];

    const proofUrl =
      item.bankProofFileUrl ||
      item.receiptFileUrl ||
      (item.bankProofFileId ? `/api/files/${item.bankProofFileId}/view` : null) ||
      (item.receiptFileId ? `/api/files/${item.receiptFileId}/view` : null);

    const proofName = item.bankProofFileName || item.receiptFileName || "Proof Document";

    const statementItem: AccountStatementItem = {
      id: item.id,
      sourceType: "ADVANCE_PAYMENT",
      date: dateStr,
      collectedBy: item.collectedBy || item.requestedByName || item.registeredPerson || item.registration?.registeredPerson || "Staff",
      invoiceNumber: item.trackingNumber || item.referenceNumber || "-",
      amount: Number(item.advanceAmount ?? 0),
      paymentMode: item.paymentMode || "Cash",
      narration: item.remarks || (isCash ? `Cash Advance for ${item.trackingNumber}` : `${item.paymentMode} Advance for ${item.trackingNumber}`),
      proofFileUrl: proofUrl,
      proofFileName: proofName,
      bankProofFileUrl: item.bankProofFileUrl || null,
      bankProofFileName: item.bankProofFileName || null,
      officeName: item.office || item.registration?.regionOfRegistration || null,
      canEdit: true,
      canDelete: true,
    };

    if (isCash) {
      // CASE 1: Cash Advance -> Credit -> Advances ONLY (No Debit entry)
      statementItem.slNo = advanceSlNo++;
      advancesList.push(statementItem);
    } else {
      // CASE 2: Non-Cash Advance -> Credit -> More Advances AND Debit -> Bank Transaction
      statementItem.slNo = moreAdvanceSlNo++;
      moreAdvancesList.push(statementItem);

      // Create offsetting Debit entry for Bank Payment Transaction
      const bankAccountName = item.referenceNumber
        ? `Bank Payment (${item.paymentMode} Ref: ${item.referenceNumber})`
        : `Bank Transfer - ${item.paymentMode || "Bank Payment"}`;

      bankPaymentDebitItems.push({
        ...statementItem,
        id: `debit_adv_${item.id}`,
        accountName: bankAccountName,
        narration: `Track no: ${item.trackingNumber} advance ${Number(item.advanceAmount)} transfer via ${item.paymentMode || "Bank"}`,
      });
    }
  }

  // ----------------------------------------------------
  // 2. Fetch Account Panel Transactions
  // ----------------------------------------------------
  const panelWhere: any = {
    ownerAdminId,
  };

  if (dateFrom || dateTo) {
    panelWhere.transactionDate = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  if (officeFilter) {
    // Match office location ID or office name
    const matchingOffice = await db.officeLocation.findFirst({
      where: { ownerAdminId, officeName: officeFilter },
      select: { id: true },
    });
    if (matchingOffice) {
      panelWhere.officeId = matchingOffice.id;
    }
  }

  const rawPanelTransactions = await db.accountPanelTransaction.findMany({
    where: panelWhere,
    include: {
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          code: true,
        },
      },
    },
    orderBy: { transactionDate: "desc" },
  });

  const filteredPanelTransactions = rawPanelTransactions.filter((item: any) => {
    if (!searchFilter) return true;
    const inv = (item.invoiceNumber || "").toLowerCase();
    const narr = (item.narration || "").toLowerCase();
    const accName = (item.account?.name || "").toLowerCase();
    const createdBy = (item.createdByName || "").toLowerCase();
    return (
      inv.includes(searchFilter) ||
      narr.includes(searchFilter) ||
      accName.includes(searchFilter) ||
      createdBy.includes(searchFilter)
    );
  });

  const panelCreditItems: AccountStatementItem[] = [];
  const panelDebitItems: { accountName: string; item: AccountStatementItem }[] = [];

  for (const item of filteredPanelTransactions) {
    const dateStr = item.transactionDate
      ? new Date(item.transactionDate).toISOString().split("T")[0]
      : new Date(item.createdAt).toISOString().split("T")[0];

    const proofUrl = item.billAttachment
      ? item.billAttachment.startsWith("/") || item.billAttachment.startsWith("http")
        ? item.billAttachment
        : `/api/files/${item.billAttachment}/view`
      : null;

    const statementItem: AccountStatementItem = {
      id: item.id,
      sourceType: "ACCOUNT_PANEL",
      date: dateStr,
      collectedBy: item.createdByName || "System",
      invoiceNumber: item.invoiceNumber || "-",
      amount: Number(item.amount ?? 0),
      narration: item.narration || item.account?.name || "Account Panel Transaction",
      proofFileUrl: proofUrl,
      proofFileName: item.billAttachment || "Bill Attachment",
      accountId: item.accountId,
      accountName: item.account?.name || "Uncategorized Account",
      officeId: item.officeId || null,
      canEdit: true,
      canDelete: true,
    };

    const isCredit = (item.account?.type || "").toUpperCase() === "CREDIT";

    if (isCredit) {
      panelCreditItems.push(statementItem);
    } else {
      panelDebitItems.push({
        accountName: item.account?.name || "General Debit Expenses",
        item: statementItem,
      });
    }
  }

  // ----------------------------------------------------
  // 3. Group Debit Items by Account Name
  // ----------------------------------------------------
  const debitGroupMap = new Map<string, AccountStatementItem[]>();

  // Add non-cash bank transfer debit entries
  if (bankPaymentDebitItems.length > 0) {
    const bankGroupKey = "Bank Payment Transactions";
    debitGroupMap.set(bankGroupKey, bankPaymentDebitItems);
  }

  // Add Account Panel debit transactions
  for (const { accountName, item } of panelDebitItems) {
    const existing = debitGroupMap.get(accountName) || [];
    existing.push(item);
    debitGroupMap.set(accountName, existing);
  }

  const debitGroups: DebitAccountGroup[] = [];
  let totalDebitAmount = 0;

  for (const [accountName, items] of Array.from(debitGroupMap.entries())) {
    const groupSubTotal = items.reduce((sum, it) => sum + it.amount, 0);
    // Assign sequential SL numbers within each debit group
    const numberedItems = items.map((it, idx) => ({ ...it, slNo: idx + 1 }));

    debitGroups.push({
      accountName,
      subTotal: groupSubTotal,
      items: numberedItems,
    });
    totalDebitAmount += groupSubTotal;
  }

  // ----------------------------------------------------
  // 4. Calculate Totals
  // ----------------------------------------------------
  const advancesTotal = advancesList.reduce((sum, item) => sum + item.amount, 0);
  const moreAdvancesTotal = moreAdvancesList.reduce((sum, item) => sum + item.amount, 0);
  const panelCreditsTotal = panelCreditItems.reduce((sum, item) => sum + item.amount, 0);
  const creditTotal = advancesTotal + moreAdvancesTotal + panelCreditsTotal;

  // Cash in hand formula: Net balance = Credit Total - Debit Total
  const openingBalance = 0; // Default opening balance
  const cashInHand = creditTotal - totalDebitAmount + openingBalance;

  return {
    office: officeFilter || "All Offices",
    fromDate: fromDate || "",
    toDate: toDate || "",
    openingBalance,
    credit: {
      advances: transactionType === "DEBIT" ? [] : advancesList,
      advancesTotal,
      moreAdvances: transactionType === "DEBIT" ? [] : moreAdvancesList,
      moreAdvancesTotal,
      panelCredits: transactionType === "DEBIT" ? [] : panelCreditItems,
      panelCreditsTotal,
      creditTotal,
    },
    debit: {
      groups: transactionType === "CREDIT" ? [] : debitGroups,
      debitTotal: totalDebitAmount,
    },
    cashInHand,
  };
}
