import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REGISTRATION_FIELD_DEFINITIONS } from "@/features/registration/server/registration-fields";
import { getApprovedAdvanceSum, submitAdvancePaymentApproval } from "@/features/revenue/server/advance-payment-approval.service";
import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";
import type {
  FieldChangeItem,
  RegistrationEditRequestItem,
  CreateEditRequestParams,
  CreateEditRequestResult,
  ApproveEditRequestParams,
  RejectEditRequestParams,
} from "@/features/registration/types/registration-edit-request.types";

const FIELD_LABEL_MAP: Record<string, { label: string; category?: string }> = {};

for (const def of REGISTRATION_FIELD_DEFINITIONS) {
  FIELD_LABEL_MAP[def.key] = {
    label: def.label,
    category: def.category,
  };
}

// Additional fields not in import/export definitions
const EXTRA_FIELD_LABELS: Record<string, { label: string; category?: string }> = {
  trackingNumber: { label: "Tracking Number", category: "Registration & Workflow" },
  tracking_number: { label: "Tracking Number", category: "Registration & Workflow" },
  commissionToUserId: { label: "Commission To (User)", category: "Commercial & Payment" },
  commissionToName: { label: "Commission To Name", category: "Commercial & Payment" },
  commissionToEmail: { label: "Commission To Email", category: "Commercial & Payment" },
  approvalStatus: { label: "Approval Status", category: "Registration & Workflow" },
  trackingStatus: { label: "Tracking Status", category: "Registration & Workflow" },
  paymentStatus: { label: "Payment Status", category: "Commercial & Payment" },
  advancePaymentStatus: { label: "Advance Payment Status", category: "Commercial & Payment" },
  leadId: { label: "Linked Lead", category: "Customer Information" },
  corporateDetailId: { label: "Corporate Company", category: "Customer Information" },
  requestedAdvanceAmount: { label: "Requested Advance Amount", category: "Commercial & Payment" },
};

export function getFieldLabel(key: string): { label: string; category?: string } {
  if (FIELD_LABEL_MAP[key]) return FIELD_LABEL_MAP[key];
  if (EXTRA_FIELD_LABELS[key]) return EXTRA_FIELD_LABELS[key];
  // Convert camelCase to Title Case
  const formatted = key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
  return { label: formatted, category: "General" };
}

function normalizeValue(value: any): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "object" && "toNumber" in value) return Number(value); // Prisma.Decimal
  const str = String(value).trim();
  return str === "" ? null : str;
}

export function areFieldValuesEqual(key: string, a: any, b: any): boolean {
  const normA = normalizeValue(a);
  const normB = normalizeValue(b);

  // 1. Both are effectively null/empty
  if (normA === null && normB === null) return true;

  // 2. Field-specific normalization and equivalence rules
  if (key === "trackingNumber" || key === "tracking_number") {
    const strA = normA === null ? "" : String(normA).trim();
    const strB = normB === null ? "" : String(normB).trim();
    return strA === strB;
  }

  if (key === "requestedAdvanceAmount") {
    // In Revenue Registration, requestedAdvanceAmount represents a pending advance request.
    // If no advance was requested, it is 0 / null / empty.
    // Form default is 0. An existing null/empty/0 vs form default 0 is NOT a user modification.
    const numA = normA === null || normA === "" ? 0 : Number(normA);
    const numB = normB === null || normB === "" ? 0 : Number(normB);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      return normA === normB;
    }
    return numA === numB;
  }

  if (key === "advancePaid") {
    // advancePaid default is 0. null/empty/0 are equivalent to 0.
    const numA = normA === null || normA === "" ? 0 : Number(normA);
    const numB = normB === null || normB === "" ? 0 : Number(normB);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      return normA === normB;
    }
    return numA === numB;
  }

  if (key === "trackingStatus") {
    // In Revenue Registration, trackingStatus defaults to "Registered".
    // A document with null/empty trackingStatus is treated as "Registered" by the system.
    // An edit form sending the default "Registered" when the user did not touch the status is NOT a change.
    const strA = normA === null || normA === "" ? "Registered" : String(normA).trim();
    const strB = normB === null || normB === "" ? "Registered" : String(normB).trim();
    return strA.toLowerCase() === strB.toLowerCase();
  }

  if (key === "approvalStatus") {
    // System default is "Pending"
    const strA = normA === null || normA === "" ? "Pending" : String(normA).trim();
    const strB = normB === null || normB === "" ? "Pending" : String(normB).trim();
    return strA.toLowerCase() === strB.toLowerCase();
  }

  if (key === "paymentStatus") {
    // System default is "Pending"
    const strA = normA === null || normA === "" ? "Pending" : String(normA).trim();
    const strB = normB === null || normB === "" ? "Pending" : String(normB).trim();
    return strA.toLowerCase() === strB.toLowerCase();
  }

  // 3. One is null, the other is non-null
  if (normA === null || normB === null) return false;

  // 4. Numeric comparisons
  if (typeof normA === "number" || typeof normB === "number") {
    return Number(normA) === Number(normB);
  }

  // 5. Boolean comparisons
  if (typeof normA === "boolean" || typeof normB === "boolean") {
    return Boolean(normA) === Boolean(normB);
  }

  // 6. String comparisons
  return String(normA) === String(normB);
}

export function computeFieldChanges(
  original: Record<string, any>,
  proposed: Record<string, any>
): FieldChangeItem[] {
  const changes: FieldChangeItem[] = [];
  const checkedKeys = new Set<string>();

  // Ignored system fields and advance payment fields that are not part of document edit approval requests
  const ignoredKeys = new Set([
    "id",
    "createdAt",
    "updatedAt",
    "created_at",
    "updated_at",
    "ownerAdminId",
    "owner_admin_id",
    "createdBy",
    "created_by",
    "creator",
    "files",
    "auditTrail",
    "audit_trail",
    "advancePaymentApprovals",
    "movementApprovals",
    "editRequests",
    "documentMovements",
    "communications",
    "paymentUpdates",
    "accountStatementEntries",
    "processAssignments",
    "isBmLocked",
    "bmLockReason",
    "bmExtensionStatus",
    "bmExtensionRequestedBy",
    "bmExtensionRequestedAt",
    "bmExtensionReason",
    "bmExtensionApprovedBy",
    "bmExtensionApprovedAt",
    "welcomeCalledBy",
    "welcomeCalledAt",
    "welcomeCallStatus",
    "importBatchId",
    "importFileName",
    "importedBy",
    "importedAt",
    "originalRowNumber",
    "deliveryUserId",
    "deliveryUserName",
    "courierCompanyId",
    "courierCompanyName",
    "courierTrackingNumber",
    "deliveryProofFileUrl",
    "deliveryProofFileName",
    "deliveryStatus",
    "advancePaymentApprovedBy",
    "advancePaymentApprovedAt",
    "advancePaymentRejectedBy",
    "advancePaymentRejectedAt",
    "advancePaymentRejectionReason",
    "movementApproved",
    "advancePaymentSubmitted",
    // Advance payment fields & calculated payment state (managed via Advance Payment Approval workflow)
    "requestedAdvanceAmount",
    "advancePaid",
    "advancePaymentStatus",
    "paymentStatus",
    "balanceAmount",
    "balanceReceivedAmount",
    "paymentUpdateStatus",
    "financeApprovalStatus",
    "receiptFileId",
    "proofFileType",
    "proofFiles",
    "proofFileId",
    "upiTransactionId",
    "bankName",
    "transactionRefNo",
    "transferDate",
    "chequeNumber",
    "chequeDate",
    "ddNumber",
    "ddDate",
    "cardLast4",
    "approvalCode",
    "paymentGateway",
    "onlineTransactionId",
    "walletName",
    "walletTransactionId",
    "paymentMode",
    "paymentReferenceNo",
    "paymentDescription",
    "regionOfRegistrationId",
  ]);

  const candidateKeys = Array.from(
    new Set([...Object.keys(proposed), ...Object.keys(original)])
  ).filter((k) => !ignoredKeys.has(k));

  for (const key of candidateKeys) {
    if (checkedKeys.has(key)) continue;
    checkedKeys.add(key);

    const oldVal = original[key];
    const newVal = proposed[key];

    if (!areFieldValuesEqual(key, oldVal, newVal)) {
      const fieldMeta = getFieldLabel(key);
      let formattedOld = normalizeValue(oldVal);
      let formattedNew = normalizeValue(newVal);

      if (key === "requestedAdvanceAmount" || key === "advancePaid") {
        formattedOld = formattedOld === null ? 0 : formattedOld;
        formattedNew = formattedNew === null ? 0 : formattedNew;
      }

      changes.push({
        field: key,
        fieldLabel: fieldMeta.label,
        category: fieldMeta.category,
        oldValue: formattedOld,
        newValue: formattedNew,
      });
    }
  }

  return changes;
}

export function buildRegistrationDataForApproval(
  input: Record<string, any>,
  options?: { approvedAdvance?: number }
) {
  const totalCharges = Number(input.totalCharges ?? 0);
  const approvedAdvance = Number(options?.approvedAdvance ?? 0);
  const balanceAmount = Math.max(0, totalCharges - approvedAdvance);
  const hasCommissionTarget = Boolean(
    input.commissionToUserId || input.commissionToName || input.commissionToEmail
  );

  const computedPaymentStatus = calculatePaymentStatus({
    approvalStatus: input.approvalStatus || "Pending",
    advancePaymentStatus: input.advancePaymentStatus || "Pending Approval",
    totalCharges: Number(totalCharges),
    advancePaid: Number(approvedAdvance),
    balanceAmount: Number(balanceAmount),
  });

  const mode = (input.paymentMode || "").trim().toLowerCase();
  const isUpi = mode === "upi";
  const isBank = mode.includes("bank") || mode === "bank transfer";
  const isCheque = mode === "cheque" || mode === "check";
  const isDD = mode.includes("demand draft") || mode === "dd";
  const isCard = mode === "credit card" || mode === "debit card" || mode.includes("credit") || mode.includes("debit");
  const isOnline = mode.includes("online") || mode === "online payment";
  const isWallet = mode === "wallet";
  const isOther = mode === "other";

  const parseDate = (d?: string | null) => (d ? new Date(d) : null);

  return {
    ...(input.trackingNumber ? { trackingNumber: String(input.trackingNumber).trim() } : {}),
    customerName: input.customerName || null,
    mobile: input.mobile || null,
    email: input.email || null,
    address: input.address || null,
    country: input.country || null,
    state: input.state || null,
    city: input.city || null,
    customerType: input.customerType || null,
    corporateDetailId: input.corporateDetailId || null,
    documentType: input.documentType || null,
    documentName: input.documentName || null,
    documentIssuedCountry: input.documentIssuedCountry || null,
    processType: input.processType || null,
    subPackage: input.subPackage || null,
    externalProcess: input.externalProcess || null,
    priority: input.priority || null,
    committedDuration: input.committedDuration || null,
    deliveryLocation: input.deliveryLocation || null,
    totalCharges,
    advancePaid: approvedAdvance,
    balanceAmount,
    paymentMode: input.paymentMode || null,
    upiTransactionId: isUpi ? input.upiTransactionId || null : null,
    bankName: isBank || isCheque || isDD ? input.bankName || null : null,
    transactionRefNo: isBank ? input.transactionRefNo || null : null,
    transferDate: isBank ? parseDate(input.transferDate) : null,
    chequeNumber: isCheque ? input.chequeNumber || null : null,
    chequeDate: isCheque ? parseDate(input.chequeDate) : null,
    ddNumber: isDD ? input.ddNumber || null : null,
    ddDate: isDD ? parseDate(input.ddDate) : null,
    cardLast4: isCard ? input.cardLast4 || null : null,
    approvalCode: isCard ? input.approvalCode || null : null,
    paymentGateway: isOnline ? input.paymentGateway || null : null,
    onlineTransactionId: isOnline ? input.onlineTransactionId || null : null,
    walletName: isWallet ? input.walletName || null : null,
    walletTransactionId: isWallet ? input.walletTransactionId || null : null,
    paymentReferenceNo: isOther ? input.paymentReferenceNo || null : null,
    paymentDescription: isOther ? input.paymentDescription || null : null,
    paymentStatus: computedPaymentStatus,
    collectedPerson: input.collectedPerson || null,
    leadId: input.leadId || null,
    ...(hasCommissionTarget
      ? {
          commissionToUserId: input.commissionToUserId || null,
          commissionToName: input.commissionToName || null,
          commissionToEmail: input.commissionToEmail || null,
        }
      : {}),
    registeredPerson: input.registeredPerson || null,
    regionOfRegistration: input.regionOfRegistration || null,
    approvalStatus: input.approvalStatus || "Pending",
  };
}

function mapEditRequest(record: any): RegistrationEditRequestItem {
  const originalSnapshot = (record.originalSnapshot as unknown as Record<string, any>) ?? {};
  const proposedSnapshot = (record.proposedSnapshot as unknown as Record<string, any>) ?? {};
  const rawChanges = (record.fieldChanges as unknown as FieldChangeItem[]) ?? [];
  const fieldChanges =
    originalSnapshot && proposedSnapshot && Object.keys(proposedSnapshot).length > 0
      ? computeFieldChanges(originalSnapshot, proposedSnapshot)
      : rawChanges;

  return {
    id: record.id,
    registrationId: record.registrationId,
    trackingNumber: record.trackingNumber,
    customerName: record.customerName ?? null,
    documentType: record.documentType ?? null,
    documentName: record.documentName ?? null,
    registrationOffice: record.registrationOffice ?? null,
    currentOffice: record.currentOffice ?? null,
    originalSnapshot,
    proposedSnapshot,
    fieldChanges,
    status: record.status,
    requestedById: record.requestedById ?? null,
    requestedBy: record.requestedBy ?? null,
    requestedAt: record.requestedAt instanceof Date ? record.requestedAt.toISOString() : record.requestedAt,
    approvedById: record.approvedById ?? null,
    approvedBy: record.approvedBy ?? null,
    approvedAt: record.approvedAt instanceof Date ? record.approvedAt.toISOString() : record.approvedAt ?? null,
    rejectedById: record.rejectedById ?? null,
    rejectedBy: record.rejectedBy ?? null,
    rejectedAt: record.rejectedAt instanceof Date ? record.rejectedAt.toISOString() : record.rejectedAt ?? null,
    rejectionReason: record.rejectionReason ?? null,
    approvalRemarks: record.approvalRemarks ?? null,
    documentVersion: record.documentVersion ?? null,
    documentUpdatedAtSnapshot:
      record.documentUpdatedAtSnapshot instanceof Date
        ? record.documentUpdatedAtSnapshot.toISOString()
        : record.documentUpdatedAtSnapshot ?? null,
    workspaceId: record.workspaceId ?? null,
    tenantId: record.tenantId ?? null,
    ownerAdminId: record.ownerAdminId,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
  };
}

export async function hasActiveEditRequest(ownerAdminId: string, registrationId: string): Promise<boolean> {
  const count = await prisma.registrationEditRequest.count({
    where: {
      ownerAdminId,
      registrationId,
      status: "PENDING",
    },
  });
  return count > 0;
}

export async function getActiveEditRequestForRegistration(ownerAdminId: string, registrationId: string) {
  const record = await prisma.registrationEditRequest.findFirst({
    where: {
      ownerAdminId,
      registrationId,
      status: "PENDING",
    },
    orderBy: { requestedAt: "desc" },
  });
  return record ? mapEditRequest(record) : null;
}

export async function createEditRequest(params: CreateEditRequestParams): Promise<CreateEditRequestResult> {
  const { ownerAdminId, registrationId, input, sourceOfficeName, requestedById, requestedByName } = params;

  // 1. Fetch current document from DB
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id: registrationId },
    include: {
      documentMovements: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { currentOffice: true },
      },
      advancePaymentApprovals: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!existing) {
    throw new Error("Registration document not found.");
  }

  if (existing.isBmLocked) {
    throw new Error("This registration is locked for BM Report processing and cannot be edited.");
  }

  // 2. Check if active PENDING edit request already exists
  const existingPendingEdit = await prisma.registrationEditRequest.findFirst({
    where: {
      ownerAdminId,
      registrationId: existing.id,
      status: "PENDING",
    },
  });

  // 3. Compare original data and proposed data to compute document field changes
  const originalSnapshot: Record<string, any> = {
    trackingNumber: existing.trackingNumber,
    customerName: existing.customerName,
    mobile: existing.mobile,
    email: existing.email,
    address: existing.address,
    country: existing.country,
    state: existing.state,
    city: existing.city,
    customerType: existing.customerType,
    corporateDetailId: existing.corporateDetailId,
    documentType: existing.documentType,
    documentName: existing.documentName,
    documentIssuedCountry: existing.documentIssuedCountry,
    processType: existing.processType,
    subPackage: existing.subPackage,
    externalProcess: existing.externalProcess,
    priority: existing.priority,
    committedDuration: existing.committedDuration,
    deliveryLocation: existing.deliveryLocation,
    totalCharges: Number(existing.totalCharges),
    collectedPerson: existing.collectedPerson,
    commissionToUserId: existing.commissionToUserId,
    commissionToName: existing.commissionToName,
    commissionToEmail: existing.commissionToEmail,
    registeredPerson: existing.registeredPerson,
    regionOfRegistration: existing.regionOfRegistration,
    approvalStatus: existing.approvalStatus,
    trackingStatus: existing.trackingStatus || "Registered",
    leadId: existing.leadId,
  };

  const proposedTrackingNumber =
    input.trackingNumber !== undefined && input.trackingNumber !== null
      ? String(input.trackingNumber).trim()
      : existing.trackingNumber;

  if (!proposedTrackingNumber) {
    const error: any = new Error("Tracking number is required.");
    error.statusCode = 400;
    throw error;
  }

  const isSwap = Boolean(input.isSwap);
  let targetReg: any = null;

  // Duplicate Tracking Number Validation before creating edit request
  if (proposedTrackingNumber !== existing.trackingNumber) {
    if (!isSwap) {
      const duplicateReg = await prisma.registration.findFirst({
        where: {
          ownerAdminId,
          trackingNumber: proposedTrackingNumber,
          NOT: { id: existing.id },
        },
        select: { id: true },
      });
      if (duplicateReg) {
        const error: any = new Error(`Tracking number ${proposedTrackingNumber} is already assigned to another document.`);
        error.statusCode = 409;
        error.status = 409;
        throw error;
      }

      const duplicateMov = await prisma.documentMovement.findFirst({
        where: {
          trackingNumber: proposedTrackingNumber,
          NOT: { registrationId: existing.id },
        },
        select: { id: true },
      });
      if (duplicateMov) {
        const error: any = new Error(`Tracking number ${proposedTrackingNumber} is already assigned to another document movement.`);
        error.statusCode = 409;
        error.status = 409;
        throw error;
      }
    } else {
      // Validate tracking number swap request
      targetReg = await prisma.registration.findFirst({
        where: {
          ownerAdminId,
          OR: [
            ...(input.targetRegistrationId ? [{ id: input.targetRegistrationId }] : []),
            { trackingNumber: proposedTrackingNumber },
          ],
        },
        select: {
          id: true,
          trackingNumber: true,
          customerName: true,
          documentType: true,
          documentName: true,
          regionOfRegistration: true,
        },
      });

      if (!targetReg) {
        const error: any = new Error(`Target document for tracking number swap not found.`);
        error.statusCode = 404;
        throw error;
      }

      if (targetReg.id === existing.id) {
        const error: any = new Error(`Cannot swap tracking number with the same document.`);
        error.statusCode = 400;
        throw error;
      }

      if (targetReg.trackingNumber !== proposedTrackingNumber) {
        const error: any = new Error(`Target document tracking number mismatch (${targetReg.trackingNumber} vs ${proposedTrackingNumber}).`);
        error.statusCode = 400;
        throw error;
      }

      // Check if target registration already has a pending edit request
      const targetPending = await prisma.registrationEditRequest.findFirst({
        where: {
          ownerAdminId,
          registrationId: targetReg.id,
          status: "PENDING",
        },
        select: { id: true },
      });
      if (targetPending) {
        const error: any = new Error(
          `Target document (${targetReg.trackingNumber}) already has a pending edit request. Please resolve it first.`
        );
        error.statusCode = 409;
        throw error;
      }

      // Check if another pending edit request already involves either document in a swap
      const existingSwap = await prisma.registrationEditRequest.findFirst({
        where: {
          ownerAdminId,
          status: "PENDING",
          OR: [
            { trackingNumber: existing.trackingNumber },
            { trackingNumber: targetReg.trackingNumber },
          ],
        },
        select: { id: true, trackingNumber: true },
      });
      if (existingSwap) {
        const error: any = new Error(
          `A pending edit request already involves document #${existingSwap.trackingNumber}. Please resolve it first.`
        );
        error.statusCode = 409;
        throw error;
      }
    }
  }

  const proposedSnapshot: Record<string, any> = {
    ...originalSnapshot,
    ...input,
    trackingNumber: proposedTrackingNumber,
    ...(isSwap && targetReg
      ? {
          isSwap: true,
          targetRegistrationId: targetReg.id,
          targetTrackingNumber: targetReg.trackingNumber,
          sourceTrackingNumber: existing.trackingNumber,
          targetCustomerName: targetReg.customerName,
          targetDocumentType: targetReg.documentType || targetReg.documentName,
        }
      : {}),
  };

  const fieldChanges = computeFieldChanges(originalSnapshot, proposedSnapshot);

  if (isSwap && targetReg) {
    const tnIndex = fieldChanges.findIndex((c) => c.field === "trackingNumber");
    const swapItem: FieldChangeItem = {
      field: "trackingNumber",
      fieldLabel: "Tracking Number (Swap)",
      category: "Document Information",
      oldValue: `${existing.trackingNumber} (Doc A)`,
      newValue: `${targetReg.trackingNumber} (Swapping with Doc B: ${targetReg.customerName || "Customer"})`,
    };
    if (tnIndex >= 0) {
      fieldChanges[tnIndex] = swapItem;
    } else {
      fieldChanges.unshift(swapItem);
    }
  }

  // 4. Handle Advance Payment changes
  const requestedAdvance = Number(input.requestedAdvanceAmount ?? 0);
  const latestAdvanceApproval = existing.advancePaymentApprovals?.[0];
  const hasPendingAdvance =
    existing.advancePaymentStatus === "Pending Approval" && latestAdvanceApproval?.status === "Pending Approval";

  let advanceApprovalCreated = false;
  let createdAdvanceApproval: any = null;

  // If requestedAdvance > 0 and no advance approval is pending, submit advance payment approval
  if (requestedAdvance > 0 && !hasPendingAdvance) {
    try {
      createdAdvanceApproval = await submitAdvancePaymentApproval({
        ownerAdminId,
        registrationId: existing.id,
        advanceAmount: requestedAdvance,
        paymentDate: input.paymentDate || new Date(),
        paymentMode: input.paymentMode || "Cash",
        referenceNumber: input.transactionRefNo || input.upiTransactionId || input.referenceNumber || null,
        collectedBy: input.collectedPerson || null,
        remarks: input.remarks || input.paymentDescription || null,
        proofFileType: input.proofFileType || null,
        receiptFileId: input.receiptFileId || input.proofFileId || null,
        performedByUserId: requestedById,
        bankName: input.bankName || null,
        transactionRefNo: input.transactionRefNo || null,
        transferDate: input.transferDate || null,
        upiTransactionId: input.upiTransactionId || null,
        chequeNumber: input.chequeNumber || null,
        chequeDate: input.chequeDate || null,
        ddNumber: input.ddNumber || null,
        ddDate: input.ddDate || null,
        cardLast4: input.cardLast4 || null,
        approvalCode: input.approvalCode || null,
        paymentGateway: input.paymentGateway || null,
        onlineTransactionId: input.onlineTransactionId || null,
        walletName: input.walletName || null,
        walletTransactionId: input.walletTransactionId || null,
        paymentReferenceNo: input.paymentReferenceNo || null,
        paymentDescription: input.paymentDescription || null,
      });
      advanceApprovalCreated = true;
    } catch (err) {
      console.error("[createEditRequest] Failed to create advance payment approval:", err);
    }
  }

  // 5. WORKFLOW SEPARATION:
  // IF NO normal document field changes exist:
  if (fieldChanges.length === 0) {
    if (advanceApprovalCreated) {
      return {
        isEditRequest: false,
        editRequest: null,
        advanceApprovalCreated: true,
        advancePaymentApproval: createdAdvanceApproval,
        message: "Advance payment approval request created successfully. No document field changes detected.",
        id: existing.id,
        registrationId: existing.id,
        trackingNumber: existing.trackingNumber,
      };
    }

    if (hasPendingAdvance) {
      return {
        isEditRequest: false,
        editRequest: null,
        advanceApprovalCreated: false,
        message: "Advance payment approval request is already pending. No document field changes detected.",
        id: existing.id,
        registrationId: existing.id,
        trackingNumber: existing.trackingNumber,
      };
    }

    const error: any = new Error("No field changes detected.");
    error.statusCode = 400;
    throw error;
  }

  // IF document field changes exist:
  if (existingPendingEdit) {
    const error: any = new Error("An edit approval request is already pending for this document.");
    error.statusCode = 409;
    error.isDuplicate = true;
    throw error;
  }

  // Resolve current office location
  const currentOfficeLocation =
    existing.documentMovements[0]?.currentOffice?.officeName ||
    existing.regionOfRegistration ||
    sourceOfficeName;

  // 6. Create the Edit Request record for normal document changes
  const created = await prisma.registrationEditRequest.create({
    data: {
      registrationId: existing.id,
      trackingNumber: existing.trackingNumber,
      customerName: proposedSnapshot.customerName || existing.customerName || null,
      documentType: proposedSnapshot.documentType || existing.documentType || null,
      documentName: proposedSnapshot.documentName || existing.documentName || null,
      registrationOffice: existing.regionOfRegistration || sourceOfficeName,
      currentOffice: currentOfficeLocation,
      originalSnapshot: originalSnapshot as any,
      proposedSnapshot: proposedSnapshot as any,
      fieldChanges: fieldChanges as any,
      status: "PENDING",
      requestedById: requestedById || null,
      requestedBy: requestedByName || "System User",
      documentVersion: existing.updatedAt.toISOString(),
      documentUpdatedAtSnapshot: existing.updatedAt,
      workspaceId: ownerAdminId,
      tenantId: ownerAdminId,
      ownerAdminId,
    },
  });

  // Log audit trail for edit request creation
  const changesSummary = fieldChanges
    .map((c) => `${c.fieldLabel}: ${c.oldValue ?? "Empty"} → ${c.newValue ?? "Empty"}`)
    .join(", ");

  await prisma.auditTrail.create({
    data: {
      registrationId: existing.id,
      action: isSwap ? "Tracking number swap requested" : "Edit request created",
      description: isSwap && targetReg
        ? `Tracking number swap requested by ${requestedByName || "User"}. Swap proposed: ${existing.trackingNumber} ↔ ${targetReg.trackingNumber} (${targetReg.customerName || "Customer"}). Pending approval.`
        : `Edit request created by ${requestedByName || "User"}. Changes proposed: ${changesSummary}`,
      performedBy: requestedByName || null,
    },
  }).catch(() => null);

  if (isSwap && targetReg) {
    await prisma.auditTrail.create({
      data: {
        registrationId: targetReg.id,
        action: "Tracking number swap requested",
        description: `Tracking number swap requested by ${requestedByName || "User"}. Swap proposed: ${targetReg.trackingNumber} ↔ ${existing.trackingNumber} (${existing.customerName || "Customer"}). Pending approval.`,
        performedBy: requestedByName || null,
      },
    }).catch(() => null);
  }

  const mapped = mapEditRequest(created);
  return {
    ...mapped,
    isEditRequest: true,
    editRequest: mapped,
    advanceApprovalCreated,
    advancePaymentApproval: createdAdvanceApproval,
    message: advanceApprovalCreated
      ? "Edit approval request and Advance Payment approval request created successfully."
      : "Edit approval request created successfully. Document changes will apply upon approval.",
  };
}

export async function listEditRequests(
  ownerAdminId: string,
  params: {
    status?: string;
    trackingNumber?: string;
    registrationId?: string;
    office?: string;
    page?: number;
    pageSize?: number;
    allowedOfficeNames?: string[] | null;
    isSuperAdmin?: boolean;
  } = {}
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 50, 1000));

  // If user is restricted by office and allowedOfficeNames is empty, return empty
  if (!params.isSuperAdmin && params.allowedOfficeNames !== null && params.allowedOfficeNames !== undefined) {
    if (params.allowedOfficeNames.length === 0) {
      return {
        items: [],
        pagination: { page, pageSize, totalItems: 0, totalPages: 1 },
      };
    }
  }

  const where: Record<string, any> = {
    ownerAdminId,
    ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
    ...(params.trackingNumber ? { trackingNumber: { contains: params.trackingNumber } } : {}),
    ...(params.registrationId ? { registrationId: params.registrationId } : {}),
  };

  const hasSpecificOffice = Boolean(params.office && params.office !== "Select Office" && params.office !== "ALL");
  const isRestricted = !params.isSuperAdmin && params.allowedOfficeNames !== null && params.allowedOfficeNames !== undefined;

  if (isRestricted) {
    const allowed = params.allowedOfficeNames!;
    if (hasSpecificOffice) {
      if (!allowed.some((a) => a.toLowerCase() === params.office!.toLowerCase())) {
        return {
          items: [],
          pagination: { page, pageSize, totalItems: 0, totalPages: 1 },
        };
      }
      where.OR = [
        { registrationOffice: params.office },
        { currentOffice: params.office },
      ];
    } else {
      where.OR = [
        { registrationOffice: { in: allowed } },
        { currentOffice: { in: allowed } },
      ];
    }
  } else if (hasSpecificOffice) {
    where.OR = [
      { registrationOffice: params.office },
      { currentOffice: params.office },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.registrationEditRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.registrationEditRequest.count({ where }),
  ]);

  return {
    items: items.map(mapEditRequest),
    pagination: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getEditRequestById(ownerAdminId: string, id: string) {
  const record = await prisma.registrationEditRequest.findFirst({
    where: { ownerAdminId, id },
  });
  return record ? mapEditRequest(record) : null;
}

async function syncTrackingForDoc(tx: any, regId: string, newTracking: string) {
  await tx.documentMovement.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.bundleItem.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.processAssignment.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.paymentUpdate.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.accountStatementEntry.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.advancePaymentApproval.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.rDApproval.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.documentCommunication.updateMany({
    where: { registrationId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.subPackageMovement.updateMany({
    where: { documentId: regId },
    data: { trackingNumber: newTracking },
  });
  await tx.documentWorkflowHistory.updateMany({
    where: { documentId: regId },
    data: { trackingNumber: newTracking },
  });
}

export async function approveEditRequest(params: ApproveEditRequestParams) {
  const { ownerAdminId, approvedById, approvedByName } = params;
  const id = params.id || (params as any).editRequestId;

  if (!id) {
    throw new Error("Edit request ID is required for approval.");
  }

  return prisma.$transaction(async (tx: any) => {
    // 1. Verify request is still PENDING
    const editRequest = await tx.registrationEditRequest.findFirst({
      where: { ownerAdminId, id },
    });

    if (!editRequest) {
      throw new Error("Edit request not found.");
    }

    if (editRequest.status !== "PENDING") {
      throw new Error(`Cannot approve request with status '${editRequest.status}'. Only PENDING requests can be approved.`);
    }

    // 2. Fetch current registration document state
    const currentReg = await tx.registration.findFirst({
      where: { ownerAdminId, id: editRequest.registrationId },
      include: {
        documentMovements: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { currentOffice: true },
        },
      },
    });

    if (!currentReg) {
      throw new Error("Registration document not found.");
    }

    // 3. Stale Request Protection: Compare document updatedAt with snapshot
    if (editRequest.documentUpdatedAtSnapshot) {
      const snapshotTime = new Date(editRequest.documentUpdatedAtSnapshot).getTime();
      const currentDocTime = new Date(currentReg.updatedAt).getTime();

      // If document was modified after request creation (tolerance of 1000ms for clock precision)
      if (currentDocTime - snapshotTime > 1000) {
        await prisma.registrationEditRequest.update({
          where: { id: editRequest.id },
          data: { status: "FAILED_REVIEW" },
        });

        // Log audit trail for transparency
        await prisma.auditTrail.create({
          data: {
            registrationId: editRequest.registrationId,
            action: "Edit request failed review",
            description: `Edit request #${editRequest.id} marked as FAILED_REVIEW. The document was modified after the request snapshot was taken.`,
            performedBy: approvedByName || "System Approver",
          },
        }).catch(() => null);

        const error: any = new Error(
          "Document changed after request creation. Please review and create a new request."
        );
        error.statusCode = 409;
        error.status = 409;
        error.isStale = true;
        throw error;
      }
    }

    const proposed = (editRequest.proposedSnapshot as unknown as Record<string, any>) || {};
    const fieldChanges = (editRequest.fieldChanges as unknown as FieldChangeItem[]) || [];
    const isSwap = Boolean(proposed.isSwap);
    const targetRegistrationId = proposed.targetRegistrationId;
    const targetTrackingNumber = proposed.targetTrackingNumber;

    const newTrackingNumber = proposed.trackingNumber ? String(proposed.trackingNumber).trim() : null;
    const oldTrackingNumber = currentReg.trackingNumber;
    const isTrackingNumberChanged = Boolean(newTrackingNumber && newTrackingNumber !== oldTrackingNumber);

    let targetReg: any = null;
    if (isSwap) {
      targetReg = await tx.registration.findFirst({
        where: {
          ownerAdminId,
          id: targetRegistrationId,
        },
        include: {
          documentMovements: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { currentOffice: true },
          },
        },
      });

      if (!targetReg) {
        const error: any = new Error(
          "Target document for tracking number swap not found."
        );
        error.statusCode = 404;
        throw error;
      }

      // Revalidate live tracking numbers before swapping to prevent stale race conditions
      if (currentReg.trackingNumber !== editRequest.trackingNumber || targetReg.trackingNumber !== targetTrackingNumber) {
        const error: any = new Error(
          "Document tracking numbers have changed since the swap request was created. Please review and create a new request."
        );
        error.statusCode = 409;
        error.status = 409;
        throw error;
      }
    } else if (isTrackingNumberChanged) {
      // Revalidate uniqueness at approval time against live database
      const duplicateReg = await tx.registration.findFirst({
        where: {
          ownerAdminId,
          trackingNumber: newTrackingNumber!,
          NOT: { id: currentReg.id },
        },
        select: { id: true },
      });
      if (duplicateReg) {
        const error: any = new Error(`Tracking number ${newTrackingNumber} is already assigned to another document.`);
        error.statusCode = 409;
        error.status = 409;
        throw error;
      }

      const duplicateMov = await tx.documentMovement.findFirst({
        where: {
          trackingNumber: newTrackingNumber!,
          NOT: { registrationId: currentReg.id },
        },
        select: { id: true },
      });
      if (duplicateMov) {
        const error: any = new Error(`Tracking number ${newTrackingNumber} is already assigned to another document movement.`);
        error.statusCode = 409;
        error.status = 409;
        throw error;
      }
    }

    // 4. Ready For Delivery Special Workflow Check
    const isCurrentlyInRfd =
      currentReg.trackingStatus === "Ready for Delivery" ||
      currentReg.trackingStatus === "Ready For Delivery" ||
      currentReg.bmStatus === "Ready for Delivery" ||
      currentReg.bmStatus === "Ready For Delivery" ||
      currentReg.documentMovements[0]?.status === "Ready for Delivery" ||
      currentReg.documentMovements[0]?.currentModule === "READY_FOR_DELIVERY" ||
      currentReg.documentMovements[0]?.currentStatus === "READY_FOR_DELIVERY";

    const oldDeliveryLocation = (currentReg.deliveryLocation || "").trim();
    const newDeliveryLocation = (proposed.deliveryLocation || "").trim();

    const deliveryLocationChanged =
      Boolean(newDeliveryLocation) &&
      Boolean(oldDeliveryLocation) &&
      oldDeliveryLocation.toLowerCase() !== newDeliveryLocation.toLowerCase();

    let rfdSpecialHandled = false;

    if (isCurrentlyInRfd && deliveryLocationChanged) {
      // Return document to old office Home -> Document In Hand
      const mov = currentReg.documentMovements[0];
      if (mov) {
        await tx.documentMovement.update({
          where: { id: mov.id },
          data: {
            status: "HOME",
            currentModule: "HOME",
            currentStatus: "Document In Hand",
            movementType: "RETURN_FROM_RFD",
            updatedAt: new Date(),
          },
        });
      }

      await tx.movementHistory.create({
        data: {
          trackingNumber: currentReg.trackingNumber,
          action: "Delivery Location Changed",
          oldStatus: "Ready for Delivery",
          newStatus: "HOME",
          oldOffice: oldDeliveryLocation,
          newOffice: oldDeliveryLocation,
          performedBy: approvedByName || "System Approver",
          remarks: `Delivery to ${newDeliveryLocation}: returned to Home Document In Hand.`.slice(0, 190),
        },
      });

      rfdSpecialHandled = true;
    }

    // 5. Build and apply registration updates
    const approvedAdvanceSum = await getApprovedAdvanceSum(currentReg.id);
    const updateData = buildRegistrationDataForApproval(
      {
        ...proposed,
        regionOfRegistration: currentReg.regionOfRegistration,
      },
      { approvedAdvance: approvedAdvanceSum }
    );

    // If RFD special handling occurred, set tracking status back to Document In Hand
    const finalTrackingStatus = rfdSpecialHandled
      ? "Document In Hand"
      : updateData.deliveryLocation &&
        updateData.deliveryLocation !== currentReg.deliveryLocation &&
        isCurrentlyInRfd
        ? "Document In Hand"
        : currentReg.trackingStatus;

    const finalBmStatus = rfdSpecialHandled ? "Accepted" : currentReg.bmStatus;

    // Check if documentIssuedCountry changed to synchronize linked Lead
    const oldCountry = (currentReg.documentIssuedCountry || "").trim();
    const newCountry = (proposed.documentIssuedCountry || "").trim();
    const countryChanged = Boolean(newCountry) && oldCountry !== newCountry;
    const targetLeadId = currentReg.leadId || proposed.leadId;

    if (countryChanged && targetLeadId) {
      const lead = await tx.lead.findFirst({
        where: { id: targetLeadId, ownerAdminId },
        select: { id: true, documentIssuedCountry: true },
      });

      if (lead) {
        const leadOldCountry = (lead.documentIssuedCountry || "").trim() || oldCountry || "N/A";
        await tx.lead.update({
          where: { id: lead.id },
          data: { documentIssuedCountry: newCountry },
        });

        await tx.leadFollowupHistory.create({
          data: {
            leadId: lead.id,
            actionType: "Rescheduled",
            description: `Field: Document Issued Country | Old: ${leadOldCountry} | New: ${newCountry} | Updated From: Approved Edit Request | Approved By: ${approvedByName || "Current Approver"}`,
            userId: approvedById || null,
            ownerAdminId,
          },
        });
      }
    }

    // Build audit description from field changes
    const changesSummary = fieldChanges
      .map((c) => `${c.fieldLabel}: ${c.oldValue ?? "Empty"} → ${c.newValue ?? "Empty"}`)
      .join(", ");

    const remarksText = params.approvalRemarks?.trim() ? ` | Approval Remarks: ${params.approvalRemarks.trim()}` : "";
    const auditEntries = [
      {
        action: "Edit request approved",
        description: `Edit request approved by ${approvedByName || "Approver"}. Changes applied: ${changesSummary}${remarksText}`,
        performedBy: approvedByName || null,
      },
    ];

    if (rfdSpecialHandled) {
      auditEntries.push({
        action: "Delivery location changed",
        description: `Delivery location changed from ${oldDeliveryLocation} to ${newDeliveryLocation} through approved edit request. Document returned to Home Document In Hand for normal transfer workflow.`,
        performedBy: approvedByName || null,
      });
    }

    let updatedReg: any;
    if (isSwap && targetReg) {
      // ATOMIC SWAP WORKFLOW
      const tempTrackingNumber = `__SWAP_${Date.now()}_${currentReg.id.slice(-6)}__`;

      // 1. Temporarily update Doc A to placeholder
      await tx.registration.update({
        where: { id: currentReg.id },
        data: { trackingNumber: tempTrackingNumber },
      });

      // Also temporarily set MovementApproval for Doc A if exists (due to unique constraint)
      await tx.movementApproval.updateMany({
        where: { registrationId: currentReg.id },
        data: { trackingNumber: tempTrackingNumber },
      });

      // 2. Update Doc B's tracking number to Doc A's original tracking number (oldTrackingNumber)
      await tx.registration.update({
        where: { id: targetReg.id },
        data: { trackingNumber: oldTrackingNumber },
      });

      // 3. Update Doc A's tracking number to Doc B's original tracking number (newTrackingNumber) + apply update data
      updatedReg = await tx.registration.update({
        where: { id: currentReg.id },
        data: {
          ...updateData,
          trackingNumber: newTrackingNumber!,
          trackingStatus: finalTrackingStatus,
          bmStatus: finalBmStatus,
          movementApproved: rfdSpecialHandled ? true : currentReg.movementApproved,
          auditTrail: {
            create: [
              ...auditEntries,
              {
                action: "Tracking numbers swapped",
                description: `Tracking number swapped: ${oldTrackingNumber} → ${newTrackingNumber} (interchanged with Document #${targetReg.id} - ${targetReg.customerName || "Customer"}) via approved Edit Request #${editRequest.id} by ${approvedByName || "Approver"}.${remarksText}`,
                performedBy: approvedByName || null,
              },
            ],
          },
        },
      });

      // 4. Synchronize denormalized tables for Doc B (now has oldTrackingNumber)
      await syncTrackingForDoc(tx, targetReg.id, oldTrackingNumber);
      await tx.movementApproval.updateMany({
        where: { registrationId: targetReg.id },
        data: { trackingNumber: oldTrackingNumber },
      });

      // 5. Synchronize denormalized tables for Doc A (now has newTrackingNumber)
      await syncTrackingForDoc(tx, currentReg.id, newTrackingNumber!);
      await tx.movementApproval.updateMany({
        where: { registrationId: currentReg.id },
        data: { trackingNumber: newTrackingNumber! },
      });

      // 6. Log movement history and audit trail for Doc B
      await tx.movementHistory.create({
        data: {
          trackingNumber: oldTrackingNumber,
          action: "Tracking Number Swapped",
          oldStatus: newTrackingNumber!,
          newStatus: oldTrackingNumber,
          oldOffice: targetReg.regionOfRegistration || null,
          newOffice: targetReg.regionOfRegistration || null,
          performedBy: approvedByName || "System Approver",
          remarks: `Tracking number swapped with Document #${currentReg.id} (${newTrackingNumber} → ${oldTrackingNumber}) via Edit Request #${editRequest.id}${remarksText}`.slice(0, 190),
        },
      });

      await tx.auditTrail.create({
        data: {
          registrationId: targetReg.id,
          action: "Tracking numbers swapped",
          description: `Tracking number swapped: ${newTrackingNumber} → ${oldTrackingNumber} (interchanged with Document #${currentReg.id} - ${currentReg.customerName || "Customer"}) via approved Edit Request #${editRequest.id} by ${approvedByName || "Approver"}.${remarksText}`,
          performedBy: approvedByName || null,
        },
      });

      // 7. Log movement history for Doc A
      await tx.movementHistory.create({
        data: {
          trackingNumber: newTrackingNumber!,
          action: "Tracking Number Swapped",
          oldStatus: oldTrackingNumber,
          newStatus: newTrackingNumber!,
          oldOffice: currentReg.regionOfRegistration || null,
          newOffice: currentReg.regionOfRegistration || null,
          performedBy: approvedByName || "System Approver",
          remarks: `Tracking number swapped with Document #${targetReg.id} (${oldTrackingNumber} → ${newTrackingNumber}) via Edit Request #${editRequest.id}${remarksText}`.slice(0, 190),
        },
      });
    } else {
      // NORMAL UPDATE WORKFLOW (Non-swap)
      updatedReg = await tx.registration.update({
        where: { id: currentReg.id },
        data: {
          ...updateData,
          ...(isTrackingNumberChanged ? { trackingNumber: newTrackingNumber! } : {}),
          trackingStatus: finalTrackingStatus,
          bmStatus: finalBmStatus,
          movementApproved: rfdSpecialHandled ? true : currentReg.movementApproved,
          auditTrail: {
            create: auditEntries,
          },
        },
      });

      // Synchronize related operational references across the system if Tracking Number changed
      if (isTrackingNumberChanged) {
        await syncTrackingForDoc(tx, currentReg.id, newTrackingNumber!);

        // Synchronize MovementApproval
        await tx.movementApproval.updateMany({
          where: { registrationId: currentReg.id },
          data: { trackingNumber: newTrackingNumber! },
        });

        // Synchronize AccountApproval
        const advanceApprovals = await tx.advancePaymentApproval.findMany({
          where: { registrationId: currentReg.id },
          select: { id: true },
        });
        const advIds = advanceApprovals.map((a: any) => a.id);
        await tx.accountApproval.updateMany({
          where: {
            OR: [
              ...(advIds.length > 0 ? [{ targetId: { in: advIds } }] : []),
              { trackingNumber: oldTrackingNumber, office: currentReg.regionOfRegistration },
            ],
          },
          data: { trackingNumber: newTrackingNumber! },
        });

        // Synchronize DocumentReadState
        await tx.documentReadState.updateMany({
          where: { trackingNumber: oldTrackingNumber, ownerAdminId },
          data: { trackingNumber: newTrackingNumber! },
        });

        // Synchronize MovementHistory and record tracking change event
        await tx.movementHistory.updateMany({
          where: { trackingNumber: oldTrackingNumber },
          data: { trackingNumber: newTrackingNumber! },
        });
        await tx.movementHistory.create({
          data: {
            trackingNumber: newTrackingNumber!,
            action: "Tracking Number Changed",
            oldStatus: oldTrackingNumber,
            newStatus: newTrackingNumber!,
            oldOffice: currentReg.regionOfRegistration || null,
            newOffice: currentReg.regionOfRegistration || null,
            performedBy: approvedByName || "System Approver",
            remarks: `Tracking number changed from ${oldTrackingNumber} to ${newTrackingNumber}${params.approvalRemarks ? ` | Remarks: ${params.approvalRemarks.trim()}` : ""}`.slice(0, 190),
          },
        });

        // Synchronize BranchMovementRecord
        await tx.branchMovementRecord.updateMany({
          where: { trackingNumber: oldTrackingNumber, ownerAdminId },
          data: { trackingNumber: newTrackingNumber! },
        });

        // Synchronize FileStorage
        await tx.fileStorage.updateMany({
          where: { recordId: oldTrackingNumber },
          data: { recordId: newTrackingNumber! },
        });
      }
    }

    // 6. Update Edit Request Status to APPROVED
    const updatedRequest = await tx.registrationEditRequest.update({
      where: { id: editRequest.id },
      data: {
        status: "APPROVED",
        approvedById: approvedById || null,
        approvedBy: approvedByName || "System Approver",
        approvedAt: new Date(),
        approvalRemarks: params.approvalRemarks?.trim() || null,
      },
    });

    return {
      editRequest: mapEditRequest(updatedRequest),
      registration: updatedReg,
      rfdSpecialHandled,
    };
  }, { timeout: 30000 });
}

export async function rejectEditRequest(params: RejectEditRequestParams) {
  const { ownerAdminId, rejectionReason, rejectedById, rejectedByName } = params;
  const id = params.id || (params as any).editRequestId;

  if (!id) {
    throw new Error("Edit request ID is required for rejection.");
  }

  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error("Rejection reason is required to reject an edit request.");
  }

  return prisma.$transaction(async (tx: any) => {
    const editRequest = await tx.registrationEditRequest.findFirst({
      where: { ownerAdminId, id },
    });

    if (!editRequest) {
      throw new Error("Edit request not found.");
    }

    if (editRequest.status !== "PENDING") {
      throw new Error(`Cannot reject request with status '${editRequest.status}'. Only PENDING requests can be rejected.`);
    }

    // Update Edit Request status to REJECTED (original document remains completely untouched)
    const updatedRequest = await tx.registrationEditRequest.update({
      where: { id: editRequest.id },
      data: {
        status: "REJECTED",
        rejectedById: rejectedById || null,
        rejectedBy: rejectedByName || "System Approver",
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
    });

    const proposed = (editRequest.proposedSnapshot as unknown as Record<string, any>) || {};
    const trackingInfo =
      proposed.trackingNumber && proposed.trackingNumber !== editRequest.trackingNumber
        ? (proposed.isSwap
            ? ` Proposed Tracking Number Swap: ${editRequest.trackingNumber} ↔ ${proposed.targetTrackingNumber}.`
            : ` Proposed Tracking Number: ${editRequest.trackingNumber} → ${proposed.trackingNumber}.`)
        : "";

    // Log audit trail on Registration
    await tx.auditTrail.create({
      data: {
        registrationId: editRequest.registrationId,
        action: proposed.isSwap ? "Tracking number swap rejected" : "Edit request rejected",
        description: `Edit request rejected by ${rejectedByName || "Approver"}.${trackingInfo} Reason: ${rejectionReason.trim()}`,
        performedBy: rejectedByName || null,
      },
    });

    if (proposed.isSwap && proposed.targetRegistrationId) {
      await tx.auditTrail.create({
        data: {
          registrationId: proposed.targetRegistrationId,
          action: "Tracking number swap rejected",
          description: `Tracking number swap request involving ${editRequest.trackingNumber} and ${proposed.targetTrackingNumber} was rejected by ${rejectedByName || "Approver"}. Reason: ${rejectionReason.trim()}`,
          performedBy: rejectedByName || null,
        },
      }).catch(() => null);
    }

    return mapEditRequest(updatedRequest);
  }, { timeout: 30000, maxWait: 10000 });
}
