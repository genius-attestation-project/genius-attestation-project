import { prisma } from "@/lib/prisma";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import type {
  AccountApprovalItem,
  CreateAccountApprovalParams,
  ListAccountApprovalParams,
  ApproveAccountApprovalParams,
  RejectAccountApprovalParams,
} from "../types/account-approval.types";

const db = prisma as any;

function mapApprovalRow(row: any): AccountApprovalItem {
  return {
    id: row.id,
    targetId: row.targetId,
    sourceType: row.sourceType as "ADVANCE_PAYMENT" | "ACCOUNT_PANEL",
    office: row.office ?? null,
    officeId: row.officeId ?? null,
    customerName: row.customerName ?? null,
    trackingNumber: row.trackingNumber ?? null,

    oldAmount: Number(row.oldAmount ?? 0),
    oldDate: row.oldDate ? new Date(row.oldDate).toISOString().split("T")[0] : "",
    oldPaymentMode: row.oldPaymentMode ?? null,
    oldBankName: row.oldBankName ?? null,
    oldCollectedBy: row.oldCollectedBy ?? null,
    oldInvoiceNumber: row.oldInvoiceNumber ?? null,
    oldRemarks: row.oldRemarks ?? null,
    oldProofFileId: row.oldProofFileId ?? null,
    oldProofFileUrl: row.oldProofFileUrl ?? null,
    oldProofFileName: row.oldProofFileName ?? null,

    newAmount: Number(row.newAmount ?? 0),
    newDate: row.newDate ? new Date(row.newDate).toISOString().split("T")[0] : "",
    newPaymentMode: row.newPaymentMode ?? null,
    newBankName: row.newBankName ?? null,
    newCollectedBy: row.newCollectedBy ?? null,
    newInvoiceNumber: row.newInvoiceNumber ?? null,
    newRemarks: row.newRemarks ?? null,
    newProofFileId: row.newProofFileId ?? null,
    newProofFileUrl: row.newProofFileUrl ?? null,
    newProofFileName: row.newProofFileName ?? null,

    status: row.status,
    requestedById: row.requestedById ?? null,
    requestedByName: row.requestedByName ?? null,
    requestedAt: row.requestedAt ? new Date(row.requestedAt).toISOString() : "",
    approvedById: row.approvedById ?? null,
    approvedByName: row.approvedByName ?? null,
    approvedAt: row.approvedAt ? new Date(row.approvedAt).toISOString() : null,
    rejectedById: row.rejectedById ?? null,
    rejectedByName: row.rejectedByName ?? null,
    rejectedAt: row.rejectedAt ? new Date(row.rejectedAt).toISOString() : null,
    rejectionReason: row.rejectionReason ?? null,
    approvalRemarks: row.approvalRemarks ?? null,
  };
}

/**
 * Creates a Pending Approval request for an Account Statement transaction edit.
 * Does NOT modify the original transaction.
 */
export async function createAccountApprovalRequest(params: CreateAccountApprovalParams) {
  const {
    ownerAdminId,
    targetId,
    sourceType,
    userId,
    userName,
    office,
    officeId,
    customerName,
    trackingNumber,
    oldAmount,
    oldDate,
    oldPaymentMode,
    oldBankName,
    oldCollectedBy,
    oldInvoiceNumber,
    oldRemarks,
    oldProofFileId,
    oldProofFileUrl,
    oldProofFileName,
    newAmount,
    newDate,
    newPaymentMode,
    newBankName,
    newCollectedBy,
    newInvoiceNumber,
    newRemarks,
    newProofFileId,
    newProofFileUrl,
    newProofFileName,
    beforeSnapshot,
    afterSnapshot,
  } = params;

  // Check if a pending request already exists for this transaction
  const existingPending = await db.accountApproval.findFirst({
    where: {
      targetId,
      ownerAdminId,
      status: "Pending",
    },
  });

  if (existingPending) {
    // Update the existing pending request with latest proposed changes
    const updated = await db.accountApproval.update({
      where: { id: existingPending.id },
      data: {
        newAmount,
        newDate: new Date(newDate),
        newPaymentMode: newPaymentMode ?? null,
        newBankName: newBankName ?? null,
        newCollectedBy: newCollectedBy ?? null,
        newInvoiceNumber: newInvoiceNumber ?? null,
        newRemarks: newRemarks ?? null,
        newProofFileId: newProofFileId ?? existingPending.newProofFileId ?? null,
        newProofFileUrl: newProofFileUrl ?? existingPending.newProofFileUrl ?? null,
        newProofFileName: newProofFileName ?? existingPending.newProofFileName ?? null,
        afterSnapshot: afterSnapshot ?? existingPending.afterSnapshot ?? null,
        requestedById: userId,
        requestedByName: userName ?? "User",
        requestedAt: new Date(),
      },
    });
    return mapApprovalRow(updated);
  }

  const created = await db.accountApproval.create({
    data: {
      targetId,
      sourceType,
      office: office ?? null,
      officeId: officeId ?? null,
      customerName: customerName ?? null,
      trackingNumber: trackingNumber ?? null,

      oldAmount,
      oldDate: new Date(oldDate),
      oldPaymentMode: oldPaymentMode ?? null,
      oldBankName: oldBankName ?? null,
      oldCollectedBy: oldCollectedBy ?? null,
      oldInvoiceNumber: oldInvoiceNumber ?? null,
      oldRemarks: oldRemarks ?? null,
      oldProofFileId: oldProofFileId ?? null,
      oldProofFileUrl: oldProofFileUrl ?? null,
      oldProofFileName: oldProofFileName ?? null,

      newAmount,
      newDate: new Date(newDate),
      newPaymentMode: newPaymentMode ?? null,
      newBankName: newBankName ?? null,
      newCollectedBy: newCollectedBy ?? null,
      newInvoiceNumber: newInvoiceNumber ?? null,
      newRemarks: newRemarks ?? null,
      newProofFileId: newProofFileId ?? null,
      newProofFileUrl: newProofFileUrl ?? null,
      newProofFileName: newProofFileName ?? null,

      beforeSnapshot: beforeSnapshot ?? null,
      afterSnapshot: afterSnapshot ?? null,

      status: "Pending",
      requestedById: userId,
      requestedByName: userName ?? "User",
      requestedAt: new Date(),
      ownerAdminId,
    },
  });

  return mapApprovalRow(created);
}

/**
 * Lists Account Approval requests with office visibility filtering and search.
 */
export async function listAccountApprovals(params: ListAccountApprovalParams) {
  const {
    ownerAdminId,
    status = "Pending",
    office,
    search,
    page = 1,
    pageSize = 50,
    isSuperAdmin = false,
    allowedOfficeNames,
  } = params;

  const where: any = {
    ownerAdminId,
  };

  if (status && status !== "ALL") {
    where.status = status;
  }

  // Office filtering
  if (office && office !== "All" && office !== "Select Office") {
    where.office = office;
  } else if (!isSuperAdmin && allowedOfficeNames && allowedOfficeNames.length > 0) {
    where.OR = [
      { office: { in: allowedOfficeNames } },
      { office: null },
    ];
  } else if (!isSuperAdmin && allowedOfficeNames && allowedOfficeNames.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // Search filtering
  if (search && search.trim()) {
    const term = search.trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { trackingNumber: { contains: term } },
          { customerName: { contains: term } },
          { oldInvoiceNumber: { contains: term } },
          { newInvoiceNumber: { contains: term } },
          { oldCollectedBy: { contains: term } },
          { newCollectedBy: { contains: term } },
          { oldRemarks: { contains: term } },
          { newRemarks: { contains: term } },
          { requestedByName: { contains: term } },
          { oldBankName: { contains: term } },
          { newBankName: { contains: term } },
        ],
      },
    ];
  }

  const [total, rows] = await Promise.all([
    db.accountApproval.count({ where }),
    db.accountApproval.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapApprovalRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Fetches a single Account Approval request by ID.
 */
export async function getAccountApprovalById(ownerAdminId: string, id: string) {
  const row = await db.accountApproval.findFirst({
    where: { id, ownerAdminId },
  });
  if (!row) return null;
  return mapApprovalRow(row);
}

/**
 * Approves an Account Approval request and applies updates to the original transaction.
 */
export async function approveAccountApproval(params: ApproveAccountApprovalParams) {
  const {
    id,
    ownerAdminId,
    userId,
    userName,
    approvalRemarks,
    isSuperAdmin = false,
    allowedOfficeNames,
  } = params;

  const approval = await db.accountApproval.findFirst({
    where: { id, ownerAdminId },
  });

  if (!approval) {
    throw new Error("Account approval request not found.");
  }

  if (approval.status !== "Pending") {
    throw new Error(`This request has already been ${approval.status.toLowerCase()}.`);
  }

  // Check office access for non-superadmins
  if (!isSuperAdmin && approval.office && allowedOfficeNames) {
    const hasAccess = allowedOfficeNames.some(
      (name) => name.toLowerCase() === approval.office?.toLowerCase()
    );
    if (!hasAccess) {
      throw new Error("You are not authorized to approve requests for this office.");
    }
  }

  return await db.$transaction(async (tx: any) => {
    // 1. Update the original target transaction
    if (approval.sourceType === "ADVANCE_PAYMENT") {
      const advance = await tx.advancePaymentApproval.findFirst({
        where: { id: approval.targetId, ownerAdminId },
        include: { registration: true },
      });

      if (advance) {
        const updateData: any = {
          advanceAmount: approval.newAmount,
          paymentDate: approval.newDate,
          paymentMode: approval.newPaymentMode || advance.paymentMode,
          referenceNumber: approval.newInvoiceNumber || advance.referenceNumber,
          collectedBy: approval.newCollectedBy || advance.collectedBy,
          remarks: approval.newRemarks || advance.remarks,
        };

        if (approval.newProofFileId) {
          updateData.receiptFileId = approval.newProofFileId;
          updateData.receiptFileUrl = approval.newProofFileUrl;
          updateData.receiptFileName = approval.newProofFileName;
          updateData.bankProofFileId = approval.newProofFileId;
          updateData.bankProofFileUrl = approval.newProofFileUrl;
          updateData.bankProofFileName = approval.newProofFileName;
        }

        await tx.advancePaymentApproval.update({
          where: { id: approval.targetId },
          data: updateData,
        });

        // Update registration payment references if linked
        if (advance.registrationId) {
          const regUpdate: any = {};
          if (approval.newPaymentMode) regUpdate.paymentMode = approval.newPaymentMode;
          if (approval.newBankName) regUpdate.bankName = approval.newBankName;
          if (approval.newInvoiceNumber) regUpdate.transactionRefNo = approval.newInvoiceNumber;
          if (approval.newDate) regUpdate.transferDate = approval.newDate;
          if (approval.newRemarks) regUpdate.paymentDescription = approval.newRemarks;

          if (Object.keys(regUpdate).length > 0) {
            await tx.registration.update({
              where: { id: advance.registrationId },
              data: regUpdate,
            });
          }
        }

        // Add audit log
        await tx.advancePaymentAuditLog.create({
          data: {
            approvalId: advance.id,
            registrationId: advance.registrationId || advance.id,
            action: "AccountEditApproved",
            performedBy: userId,
            performedByName: userName || "Approver",
            remarks: approvalRemarks || `Account statement transaction edit approved. Amount: ₹${approval.newAmount}`,
            ownerAdminId,
          },
        });
      }
    } else if (approval.sourceType === "ACCOUNT_PANEL") {
      const panelTx = await tx.accountPanelTransaction.findFirst({
        where: { id: approval.targetId, ownerAdminId },
      });

      if (panelTx) {
        const updateData: any = {
          amount: approval.newAmount,
          transactionDate: approval.newDate,
          invoiceNumber: approval.newInvoiceNumber || panelTx.invoiceNumber,
          narration: approval.newRemarks || panelTx.narration,
        };

        if (approval.newProofFileUrl || approval.newProofFileId) {
          updateData.billAttachment = approval.newProofFileUrl || approval.newProofFileId;
        }

        await tx.accountPanelTransaction.update({
          where: { id: approval.targetId },
          data: updateData,
        });
      }
    }

    // 2. Mark the AccountApproval record as Approved
    const updatedApproval = await tx.accountApproval.update({
      where: { id },
      data: {
        status: "Approved",
        approvedById: userId,
        approvedByName: userName || "Approver",
        approvedAt: new Date(),
        approvalRemarks: approvalRemarks || null,
      },
    });

    return mapApprovalRow(updatedApproval);
  });
}

/**
 * Rejects an Account Approval request. Keeps original transaction unchanged.
 */
export async function rejectAccountApproval(params: RejectAccountApprovalParams) {
  const {
    id,
    ownerAdminId,
    userId,
    userName,
    rejectionReason,
    isSuperAdmin = false,
    allowedOfficeNames,
  } = params;

  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error("Rejection reason is required.");
  }

  const approval = await db.accountApproval.findFirst({
    where: { id, ownerAdminId },
  });

  if (!approval) {
    throw new Error("Account approval request not found.");
  }

  if (approval.status !== "Pending") {
    throw new Error(`This request has already been ${approval.status.toLowerCase()}.`);
  }

  if (!isSuperAdmin && approval.office && allowedOfficeNames) {
    const hasAccess = allowedOfficeNames.some(
      (name) => name.toLowerCase() === approval.office?.toLowerCase()
    );
    if (!hasAccess) {
      throw new Error("You are not authorized to reject requests for this office.");
    }
  }

  const updatedApproval = await db.accountApproval.update({
    where: { id },
    data: {
      status: "Rejected",
      rejectedById: userId,
      rejectedByName: userName || "Rejector",
      rejectedAt: new Date(),
      rejectionReason: rejectionReason.trim(),
    },
  });

  return mapApprovalRow(updatedApproval);
}
