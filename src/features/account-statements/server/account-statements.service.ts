import { prisma } from "@/lib/prisma";
import { hasPermission, hasOfficeAccess } from "@/features/admin/server/rbac.service";
import type {
  AccountStatementsData,
  AccountStatementFiltersInput,
  AccountStatementItem,
  DebitAccountGroup,
  CreditAccountGroup,
} from "../types/account-statements.types";

const db = prisma as any;

/**
 * Fetches unified account statements data combining approved advance payments and account panel transactions.
 * Strictly enforces user's module permissions and Office Visibility Access for "account_statements".
 */
export async function getAccountStatements(
  ownerAdminId: string,
  filters: AccountStatementFiltersInput,
  userAccess?: any
): Promise<AccountStatementsData> {
  const { office, fromDate, toDate, search, transactionType = "ALL" } = filters;

  const officeFilter = office && office !== "All" && office !== "Select Office" ? office.trim() : null;
  const searchFilter = search ? search.trim().toLowerCase() : null;

  const emptyResponse: AccountStatementsData = {
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
      groups: [],
      creditTotal: 0,
    },
    debit: {
      groups: [],
      debitTotal: 0,
    },
    cashInHand: 0,
  };

  // Enforce mandatory parameters: office, fromDate, and toDate
  if (!officeFilter || !fromDate || !toDate) {
    return emptyResponse;
  }

  const isSuperAdmin = Boolean(userAccess?.isSuperAdmin);

  // Extract allowed offices for "account_statements" module
  let allowedOfficeIds: string[] = [];
  let allowedOfficeNames: string[] = [];

  if (userAccess && !isSuperAdmin) {
    if (userAccess.moduleOfficeVisibilities !== null && userAccess.moduleOfficeVisibilities !== undefined) {
      const modConfig = userAccess.moduleOfficeVisibilities["account_statements"];
      allowedOfficeIds = modConfig?.officeIds ?? [];
      allowedOfficeNames = modConfig?.officeNames ?? [];
    } else {
      allowedOfficeIds = Array.isArray(userAccess.allowedOfficeIds) ? userAccess.allowedOfficeIds : [];
      allowedOfficeNames = Array.isArray(userAccess.allowedOfficeNames) ? userAccess.allowedOfficeNames : [];
    }

    // If non-superadmin user has NO allowed offices assigned for account_statements, deny access
    if (allowedOfficeIds.length === 0 && allowedOfficeNames.length === 0) {
      return emptyResponse;
    }
  }

  // Resolve requested office against database office locations
  let targetOfficeId: string | null = null;
  let targetOfficeName: string | null = null;

  if (officeFilter) {
    const matchingOffice = await db.officeLocation.findFirst({
      where: {
        ownerAdminId,
        OR: [
          { id: officeFilter },
          { officeName: officeFilter },
        ],
      },
      select: { id: true, officeName: true },
    });

    if (matchingOffice) {
      targetOfficeId = matchingOffice.id;
      targetOfficeName = matchingOffice.officeName;
    } else {
      targetOfficeName = officeFilter;
    }

    // If user is not superadmin, verify that the requested office is within allowed visibility
    if (userAccess && !isSuperAdmin) {
      const isAllowed = hasOfficeAccess(userAccess, targetOfficeId || targetOfficeName, "account_statements") ||
        hasOfficeAccess(userAccess, targetOfficeName, "account_statements");

      if (!isAllowed) {
        throw new Error("You are not authorized to view account statements for this office.");
      }
    }
  }

  // User action permissions
  const canEdit = !userAccess || isSuperAdmin || hasPermission(userAccess, "account_statements.edit");
  const canDelete = !userAccess || isSuperAdmin || hasPermission(userAccess, "account_statements.delete");

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

  if (targetOfficeName) {
    advanceWhere.OR = [
      { office: { equals: targetOfficeName } },
      { registration: { regionOfRegistration: { equals: targetOfficeName } } },
      { registration: { deliveryLocation: { equals: targetOfficeName } } },
    ];
  } else if (!isSuperAdmin && allowedOfficeNames.length > 0) {
    advanceWhere.OR = [
      { office: { in: allowedOfficeNames } },
      { registration: { regionOfRegistration: { in: allowedOfficeNames } } },
      { registration: { deliveryLocation: { in: allowedOfficeNames } } },
    ];
  }

  if (dateFrom || dateTo) {
    advanceWhere.paymentDate = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  // ----------------------------------------------------
  // Prior Period Filters (Strictly before fromDate)
  // For calculating Credit Opening Balance
  // ----------------------------------------------------
  const priorAdvanceWhere: any = {
    ownerAdminId,
    status: "Approved",
    paymentDate: { lt: dateFrom },
  };

  if (targetOfficeName) {
    priorAdvanceWhere.OR = [
      { office: { equals: targetOfficeName } },
      { registration: { regionOfRegistration: { equals: targetOfficeName } } },
      { registration: { deliveryLocation: { equals: targetOfficeName } } },
    ];
  } else if (!isSuperAdmin && allowedOfficeNames.length > 0) {
    priorAdvanceWhere.OR = [
      { office: { in: allowedOfficeNames } },
      { registration: { regionOfRegistration: { in: allowedOfficeNames } } },
      { registration: { deliveryLocation: { in: allowedOfficeNames } } },
    ];
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

  if (targetOfficeId) {
    panelWhere.OR = [
      { officeId: targetOfficeId },
      { account: { officeAssignments: { some: { officeId: targetOfficeId } } } },
    ];
  } else if (targetOfficeName) {
    panelWhere.OR = [
      { officeId: targetOfficeName },
      { account: { officeAssignments: { some: { office: { officeName: targetOfficeName } } } } },
    ];
  } else if (!isSuperAdmin && allowedOfficeIds.length > 0) {
    panelWhere.OR = [
      { officeId: { in: allowedOfficeIds } },
      { account: { officeAssignments: { some: { officeId: { in: allowedOfficeIds } } } } },
    ];
  }

  const priorPanelWhere: any = {
    ownerAdminId,
    transactionDate: { lt: dateFrom },
  };

  if (targetOfficeId) {
    priorPanelWhere.OR = [
      { officeId: targetOfficeId },
      { account: { officeAssignments: { some: { officeId: targetOfficeId } } } },
    ];
  } else if (targetOfficeName) {
    priorPanelWhere.OR = [
      { officeId: targetOfficeName },
      { account: { officeAssignments: { some: { office: { officeName: targetOfficeName } } } } },
    ];
  } else if (!isSuperAdmin && allowedOfficeIds.length > 0) {
    priorPanelWhere.OR = [
      { officeId: { in: allowedOfficeIds } },
      { account: { officeAssignments: { some: { officeId: { in: allowedOfficeIds } } } } },
    ];
  }

  const [
    approvedAdvancesRaw,
    rawPanelTransactions,
    allAccountMenus,
    priorApprovedAdvancesRaw,
    priorPanelTransactionsRaw,
  ] = await Promise.all([
    db.advancePaymentApproval.findMany({
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
            collectedPerson: true,
            bankName: true,
            transactionRefNo: true,
            transferDate: true,
            paymentMode: true,
            paymentDescription: true,
            upiTransactionId: true,
            chequeNumber: true,
            chequeDate: true,
            ddNumber: true,
            ddDate: true,
            cardLast4: true,
            approvalCode: true,
            paymentGateway: true,
            onlineTransactionId: true,
            walletName: true,
            walletTransactionId: true,
            paymentReferenceNo: true,
            files: {
              where: { fileCategory: "ADVANCE_PAYMENT" },
              include: { fileStorage: true },
              orderBy: { uploadedAt: "desc" },
            },
          },
        },
        auditLogs: {
          where: { action: { in: ["Submitted", "Created"] } },
          select: { remarks: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
    db.accountPanelTransaction.findMany({
      where: panelWhere,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true,
            category: true,
            parent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { transactionDate: "desc" },
    }),
    db.accountMenu.findMany({
      where: { ownerAdminId },
      select: {
        id: true,
        name: true,
        parentId: true,
        type: true,
        category: true,
      },
    }),
    db.advancePaymentApproval.findMany({
      where: priorAdvanceWhere,
      select: {
        id: true,
        advanceAmount: true,
        paymentMode: true,
        trackingNumber: true,
        registration: {
          select: {
            trackingNumber: true,
            paymentMode: true,
          },
        },
      },
    }),
    db.accountPanelTransaction.findMany({
      where: priorPanelWhere,
      select: {
        id: true,
        amount: true,
        invoiceNumber: true,
        account: {
          select: {
            type: true,
          },
        },
      },
    }),
  ]);

  // Filter advances by search term if provided
  const filteredAdvances = approvedAdvancesRaw.filter((item: any) => {
    if (!searchFilter) return true;
    const tracking = (item.trackingNumber || item.registration?.trackingNumber || "").toLowerCase();
    const customer = (item.customerName || item.registration?.customerName || "").toLowerCase();
    const collector = (item.collectedBy || item.requestedByName || item.registration?.collectedPerson || item.registration?.registeredPerson || item.registeredPerson || "").toLowerCase();
    const mode = (item.paymentMode || item.registration?.paymentMode || "").toLowerCase();
    const ref = (item.referenceNumber || item.registration?.transactionRefNo || item.registration?.upiTransactionId || item.registration?.chequeNumber || "").toLowerCase();
    const bank = (item.registration?.bankName || "").toLowerCase();
    const remarks = (item.remarks || item.registration?.paymentDescription || "").toLowerCase();
    return (
      tracking.includes(searchFilter) ||
      customer.includes(searchFilter) ||
      collector.includes(searchFilter) ||
      mode.includes(searchFilter) ||
      ref.includes(searchFilter) ||
      bank.includes(searchFilter) ||
      remarks.includes(searchFilter)
    );
  });

  // Split into Cash Advances vs Non-Cash Advances
  const advancesList: AccountStatementItem[] = [];
  const moreAdvancesList: AccountStatementItem[] = [];
  const bankPaymentDebitItems: AccountStatementItem[] = [];

  // Build account menu map for hierarchy chains
  const accountMenuMap = new Map<
    string,
    { id: string; name: string; parentId: string | null; type: string | null; category: string | null }
  >();
  for (const node of allAccountMenus) {
    accountMenuMap.set(node.id, node);
  }

  const getAccountHierarchy = (accountId?: string | null, fallbackName?: string | null): string[] => {
    if (!accountId || !accountMenuMap.has(accountId)) {
      return fallbackName ? [fallbackName] : [];
    }
    const path: string[] = [];
    let current = accountMenuMap.get(accountId);
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      const isBootstrapRoot =
        !current.parentId &&
        (current.name === "CREDIT" || current.name === "DEBIT" || current.category === "Root");

      if (!isBootstrapRoot) {
        path.unshift(current.name);
      }

      if (!current.parentId) {
        break;
      }
      current = accountMenuMap.get(current.parentId);
    }

    return path.length > 0 ? path : fallbackName ? [fallbackName] : [];
  };

  // Helper to normalize tracking / invoice numbers for comparison
  const normalizeTrackingKey = (str?: string | null): string => {
    if (!str) return "";
    const cleaned = str.trim().toLowerCase();
    return cleaned.replace(/^(trk-|inv-|#)/i, "").trim();
  };

  // Calculate debit usage per tracking number from Account Panel debit transactions
  const debitUsageMap = new Map<string, number>();

  for (const tx of rawPanelTransactions) {
    const isCredit = (tx.account?.type || "").toUpperCase() === "CREDIT";
    if (!isCredit && tx.invoiceNumber) {
      const rawKey = tx.invoiceNumber.trim().toLowerCase();
      const normKey = normalizeTrackingKey(rawKey);
      const amt = Number(tx.amount ?? 0);
      if (amt > 0) {
        debitUsageMap.set(rawKey, (debitUsageMap.get(rawKey) || 0) + amt);
        if (normKey && normKey !== rawKey) {
          debitUsageMap.set(normKey, (debitUsageMap.get(normKey) || 0) + amt);
        }
      }
    }
  }

  // Create a mutable copy to allocate debit amounts to cash advances sequentially
  const remainingDebitMap = new Map<string, number>(debitUsageMap);

  let advanceSlNo = 1;
  let moreAdvanceSlNo = 1;
  let totalAdvanceSettledDebits = 0;

  for (const item of filteredAdvances) {
    const isCash = (item.paymentMode || item.registration?.paymentMode || "").trim().toLowerCase() === "cash";
    
    // Original payment date from Advance Payment Request
    const paymentDateObj = item.paymentDate || item.registration?.transferDate || item.requestedAt || item.createdAt;
    const dateStr = paymentDateObj
      ? new Date(paymentDateObj).toISOString().split("T")[0]
      : new Date(item.createdAt).toISOString().split("T")[0];

    // Original uploaded proof file from Advance Payment Request
    let proofUrl: string | null = null;
    let proofName: string = "Proof Document";

    if (item.receiptFileUrl) {
      proofUrl = item.receiptFileUrl;
      proofName = item.receiptFileName || "Advance Payment Receipt";
    } else if (item.receiptFileId) {
      proofUrl = `/api/files/${item.receiptFileId}/view`;
      proofName = item.receiptFileName || "Advance Payment Receipt";
    } else if (item.registration?.files?.length > 0 && item.registration.files[0].fileStorage) {
      const storage = item.registration.files[0].fileStorage;
      proofUrl = storage.url || `/api/files/${storage.id}/view`;
      proofName = storage.originalName || "Advance Payment Proof";
    } else if (item.bankProofFileUrl || item.bankProofFileId) {
      // Fallback only if no advance request receipt was attached
      proofUrl = item.bankProofFileUrl || `/api/files/${item.bankProofFileId}/view`;
      proofName = item.bankProofFileName || "Proof Document";
    }

    const trackingNum = (item.trackingNumber || item.registration?.trackingNumber || "").trim();
    const effectivePaymentMode = item.paymentMode || item.registration?.paymentMode || (isCash ? "Cash" : "Bank Transfer");
    const effectiveCollectedBy = item.collectedBy || item.requestedByName || item.registration?.collectedPerson || item.registration?.registeredPerson || item.registeredPerson || "Staff";
    const bankName = item.registration?.bankName || null;
    const refNumber = item.referenceNumber || item.registration?.transactionRefNo || item.registration?.upiTransactionId || item.registration?.chequeNumber || item.registration?.paymentReferenceNo || "";
    
    // Original remarks/narration entered in Advance Payment Request
    const createdAuditRemarks = (item.auditLogs?.[0]?.remarks || "").trim();
    const originalRemarks = (item.remarks || item.registration?.paymentDescription || createdAuditRemarks || "").trim();
    const cleanNarration = originalRemarks || (isCash ? `Cash Advance for ${trackingNum}` : `${effectivePaymentMode} Advance for ${trackingNum}`);

    // Bank Account Name for debit Bank Payment Transactions
    const bankAccountName = bankName || effectivePaymentMode;

    const originalAdvanceAmount = Number(item.advanceAmount ?? 0);
    let availableAdvanceAmount = originalAdvanceAmount;
    let utilizedAdvanceAmount = 0;

    const rawTrackKey = trackingNum.toLowerCase();
    const normTrackKey = normalizeTrackingKey(rawTrackKey);

    if (isCash && trackingNum) {
      const currentDebitUsage = remainingDebitMap.get(rawTrackKey) ?? remainingDebitMap.get(normTrackKey) ?? 0;
      if (currentDebitUsage > 0) {
        utilizedAdvanceAmount = Math.min(originalAdvanceAmount, currentDebitUsage);
        availableAdvanceAmount = Math.max(0, originalAdvanceAmount - utilizedAdvanceAmount);

        const newRem = currentDebitUsage - utilizedAdvanceAmount;
        remainingDebitMap.set(rawTrackKey, newRem);
        if (normTrackKey) remainingDebitMap.set(normTrackKey, newRem);
      }
    }

    const statementItem: AccountStatementItem = {
      id: item.id,
      sourceType: "ADVANCE_PAYMENT",
      date: dateStr,
      collectedBy: effectiveCollectedBy,
      invoiceNumber: trackingNum || refNumber || "-",
      amount: isCash ? availableAdvanceAmount : originalAdvanceAmount,
      originalAmount: originalAdvanceAmount,
      utilizedAmount: isCash ? utilizedAdvanceAmount : 0,
      paymentMode: effectivePaymentMode,
      narration: cleanNarration,
      trackingNumber: trackingNum || null,
      bankName,
      referenceNumber: refNumber || null,
      transferDate: item.registration?.transferDate ? new Date(item.registration.transferDate).toISOString().split("T")[0] : dateStr,
      proofFileType: item.proofFileType || "Receipt",
      remarks: originalRemarks || null,
      accountName: bankAccountName,
      proofFileUrl: proofUrl,
      proofFileName: proofName,
      bankProofFileUrl: item.bankProofFileUrl || null,
      bankProofFileName: item.bankProofFileName || null,
      officeName: item.office || item.registration?.regionOfRegistration || null,
      canEdit,
      canDelete,
    };

    if (isCash) {
      totalAdvanceSettledDebits += utilizedAdvanceAmount;

      // CASE 1: Cash Advance -> Credit -> Advances ONLY (No Debit entry)
      // Only include advance in Advances (Cash) if availableAmount > 0 (hide fully consumed advances)
      if (availableAdvanceAmount > 0) {
        statementItem.slNo = advanceSlNo++;
        advancesList.push(statementItem);
      }
    } else {
      // CASE 2: Non-Cash Advance -> Credit -> More Advances AND Debit -> Bank Transaction
      statementItem.slNo = moreAdvanceSlNo++;
      moreAdvancesList.push(statementItem);

      // Create offsetting Debit entry for Bank Payment Transaction
      bankPaymentDebitItems.push({
        ...statementItem,
        id: `debit_adv_${item.id}`,
        accountName: bankAccountName,
        trackingNumber: trackingNum || null,
        narration: cleanNarration,
      });
    }
  }

  const filteredPanelTransactions = rawPanelTransactions.filter((item: any) => {
    if (!searchFilter) return true;
    const inv = (item.invoiceNumber || "").toLowerCase();
    const narr = (item.narration || "").toLowerCase();
    const accName = (item.account?.name || "").toLowerCase();
    const createdBy = (item.createdByName || "").toLowerCase();
    const hierarchy = getAccountHierarchy(item.accountId, item.account?.name);
    const hierarchyStr = hierarchy.join(" ").toLowerCase();
    return (
      inv.includes(searchFilter) ||
      narr.includes(searchFilter) ||
      accName.includes(searchFilter) ||
      hierarchyStr.includes(searchFilter) ||
      createdBy.includes(searchFilter)
    );
  });

  const panelCreditItems: AccountStatementItem[] = [];
  const panelDebitItems: {
    accountName: string;
    accountHierarchy: string[];
    item: AccountStatementItem;
  }[] = [];

  for (const item of filteredPanelTransactions) {
    const dateStr = item.transactionDate
      ? new Date(item.transactionDate).toISOString().split("T")[0]
      : new Date(item.createdAt).toISOString().split("T")[0];

    const proofUrl = item.billAttachment
      ? item.billAttachment.startsWith("/") || item.billAttachment.startsWith("http")
        ? item.billAttachment
        : `/api/files/${item.billAttachment}/view`
      : null;

    const accountHierarchy = getAccountHierarchy(item.accountId, item.account?.name);

    const statementItem: AccountStatementItem = {
      id: item.id,
      sourceType: "ACCOUNT_PANEL",
      date: dateStr,
      collectedBy: item.createdByName || "System",
      invoiceNumber: item.invoiceNumber || "-",
      trackingNumber: item.invoiceNumber || null,
      amount: Number(item.amount ?? 0),
      narration: item.narration || item.account?.name || "Account Panel Transaction",
      proofFileUrl: proofUrl,
      proofFileName: item.billAttachment || "Bill Attachment",
      accountId: item.accountId,
      accountName: item.account?.name || "Uncategorized Account",
      accountHierarchy,
      officeId: item.officeId || null,
      canEdit,
      canDelete,
    };

    const isCredit = (item.account?.type || "").toUpperCase() === "CREDIT";

    if (isCredit) {
      panelCreditItems.push(statementItem);
    } else {
      panelDebitItems.push({
        accountName: item.account?.name || "General Debit Expenses",
        accountHierarchy,
        item: statementItem,
      });
    }
  }

  // ----------------------------------------------------
  // 3. Group Credit Items by Account Hierarchy
  // ----------------------------------------------------
  interface CreditGroupAccumulator {
    accountName: string;
    accountHierarchy: string[];
    items: AccountStatementItem[];
  }
  const creditGroupMap = new Map<string, CreditGroupAccumulator>();

  for (const item of panelCreditItems) {
    const hierarchy =
      item.accountHierarchy && item.accountHierarchy.length > 0
        ? item.accountHierarchy
        : [item.accountName || "Credit Transactions"];
    const groupKey = item.accountId || hierarchy.join(" > ");
    const existing = creditGroupMap.get(groupKey);

    if (existing) {
      existing.items.push(item);
    } else {
      creditGroupMap.set(groupKey, {
        accountName: item.accountName || hierarchy[hierarchy.length - 1] || "Credit Transactions",
        accountHierarchy: hierarchy,
        items: [item],
      });
    }
  }

  const creditGroups: CreditAccountGroup[] = [];
  for (const { accountName, accountHierarchy, items } of Array.from(creditGroupMap.values())) {
    const groupSubTotal = items.reduce((sum, it) => sum + it.amount, 0);
    const numberedItems = items.map((it, idx) => ({ ...it, slNo: idx + 1 }));
    creditGroups.push({
      accountName,
      accountHierarchy,
      subTotal: groupSubTotal,
      items: numberedItems,
    });
  }

  // ----------------------------------------------------
  // 4. Group Debit Items by Account Hierarchy
  // ----------------------------------------------------
  interface DebitGroupAccumulator {
    accountName: string;
    accountHierarchy: string[];
    items: AccountStatementItem[];
  }
  const debitGroupMap = new Map<string, DebitGroupAccumulator>();

  // Add non-cash bank transfer debit entries
  if (bankPaymentDebitItems.length > 0) {
    const bankGroupKey = "Bank Payment Transactions";
    debitGroupMap.set("bank_payment_transactions", {
      accountName: bankGroupKey,
      accountHierarchy: [bankGroupKey],
      items: bankPaymentDebitItems,
    });
  }

  // Add Account Panel debit transactions
  for (const { accountName, accountHierarchy, item } of panelDebitItems) {
    const hierarchy =
      accountHierarchy && accountHierarchy.length > 0
        ? accountHierarchy
        : [accountName || "General Debit Expenses"];
    const groupKey = item.accountId || hierarchy.join(" > ");
    const existing = debitGroupMap.get(groupKey);

    if (existing) {
      existing.items.push(item);
    } else {
      debitGroupMap.set(groupKey, {
        accountName,
        accountHierarchy: hierarchy,
        items: [item],
      });
    }
  }

  const debitGroups: DebitAccountGroup[] = [];
  let totalDebitAmount = 0;

  for (const { accountName, accountHierarchy, items } of Array.from(debitGroupMap.values())) {
    const groupSubTotal = items.reduce((sum, it) => sum + it.amount, 0);
    // Assign sequential SL numbers within each debit group
    const numberedItems = items.map((it, idx) => ({ ...it, slNo: idx + 1 }));

    debitGroups.push({
      accountName,
      accountHierarchy,
      subTotal: groupSubTotal,
      items: numberedItems,
    });
    totalDebitAmount += groupSubTotal;
  }

  // ----------------------------------------------------
  // 5. Calculate Credit Opening Balance & Totals
  // ----------------------------------------------------
  // Calculate debit usage per tracking number from Prior Account Panel debit transactions
  const priorDebitUsageMap = new Map<string, number>();
  let priorGeneralDebitsTotal = 0;
  let priorPanelCreditsTotal = 0;

  for (const tx of priorPanelTransactionsRaw) {
    const isCredit = (tx.account?.type || "").toUpperCase() === "CREDIT";
    const amt = Number(tx.amount ?? 0);
    if (isCredit) {
      priorPanelCreditsTotal += amt;
    } else {
      priorGeneralDebitsTotal += amt;
      if (tx.invoiceNumber) {
        const rawKey = tx.invoiceNumber.trim().toLowerCase();
        const normKey = normalizeTrackingKey(rawKey);
        if (amt > 0) {
          priorDebitUsageMap.set(rawKey, (priorDebitUsageMap.get(rawKey) || 0) + amt);
          if (normKey && normKey !== rawKey) {
            priorDebitUsageMap.set(normKey, (priorDebitUsageMap.get(normKey) || 0) + amt);
          }
        }
      }
    }
  }

  const remainingPriorDebitMap = new Map<string, number>(priorDebitUsageMap);
  let priorAvailableCashAdvancesTotal = 0;
  let priorAdvanceSettledDebits = 0;

  for (const item of priorApprovedAdvancesRaw) {
    const isCash = (item.paymentMode || item.registration?.paymentMode || "").trim().toLowerCase() === "cash";
    if (!isCash) continue; // Non-cash advances offset with bank payment debits, net 0

    const originalAdvanceAmount = Number(item.advanceAmount ?? 0);
    let availableAdvanceAmount = originalAdvanceAmount;
    let utilizedAdvanceAmount = 0;

    const trackingNum = (item.trackingNumber || item.registration?.trackingNumber || "").trim();
    const rawTrackKey = trackingNum.toLowerCase();
    const normTrackKey = normalizeTrackingKey(rawTrackKey);

    if (trackingNum) {
      const currentDebitUsage = remainingPriorDebitMap.get(rawTrackKey) ?? remainingPriorDebitMap.get(normTrackKey) ?? 0;
      if (currentDebitUsage > 0) {
        utilizedAdvanceAmount = Math.min(originalAdvanceAmount, currentDebitUsage);
        availableAdvanceAmount = Math.max(0, originalAdvanceAmount - utilizedAdvanceAmount);

        const newRem = currentDebitUsage - utilizedAdvanceAmount;
        remainingPriorDebitMap.set(rawTrackKey, newRem);
        if (normTrackKey) remainingPriorDebitMap.set(normTrackKey, newRem);
      }
    }

    priorAdvanceSettledDebits += utilizedAdvanceAmount;
    priorAvailableCashAdvancesTotal += availableAdvanceAmount;
  }

  // Credit Opening Balance = Eligible Credit Balance Before From Date - Applicable Credit Adjustments / Consumption Before From Date
  const priorNetBalance = priorAvailableCashAdvancesTotal + priorPanelCreditsTotal - priorGeneralDebitsTotal + priorAdvanceSettledDebits;
  const openingBalance = Math.max(0, priorNetBalance);

  const advancesTotal = advancesList.reduce((sum, item) => sum + item.amount, 0);
  const moreAdvancesTotal = moreAdvancesList.reduce((sum, item) => sum + item.amount, 0);
  const panelCreditsTotal = panelCreditItems.reduce((sum, item) => sum + item.amount, 0);
  const creditTotal = advancesTotal + moreAdvancesTotal + panelCreditsTotal;

  // Cash in hand formula:
  // Net balance = Credit Total (with available advances) - Debit Total + Advance Debits Settled (to avoid double deduction) + Opening Balance
  const cashInHand = creditTotal - totalDebitAmount + totalAdvanceSettledDebits + openingBalance;

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
      groups: transactionType === "DEBIT" ? [] : creditGroups,
      creditTotal,
    },
    debit: {
      groups: transactionType === "CREDIT" ? [] : debitGroups,
      debitTotal: totalDebitAmount,
    },
    cashInHand,
  };
}
