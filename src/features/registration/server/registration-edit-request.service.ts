import { Prisma, FollowupActionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REGISTRATION_FIELD_DEFINITIONS } from "@/features/registration/server/registration-fields";
import { getApprovedAdvanceSum } from "@/features/revenue/server/advance-payment-approval.service";
import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";
import type {
  FieldChangeItem,
  RegistrationEditRequestItem,
  CreateEditRequestParams,
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
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "object" && "toNumber" in value) return Number(value); // Prisma.Decimal
  const str = String(value).trim();
  return str === "" ? null : str;
}

function areValuesEqual(a: any, b: any): boolean {
  const normA = normalizeValue(a);
  const normB = normalizeValue(b);

  if (normA === null && normB === null) return true;
  if (normA === null || normB === null) return false;

  if (typeof normA === "number" || typeof normB === "number") {
    return Number(normA) === Number(normB);
  }

  return String(normA) === String(normB);
}

export function computeFieldChanges(
  original: Record<string, any>,
  proposed: Record<string, any>
): FieldChangeItem[] {
  const changes: FieldChangeItem[] = [];
  const checkedKeys = new Set<string>();

  // Ignored system fields that are not part of user edits
  const ignoredKeys = new Set([
    "id",
    "trackingNumber",
    "tracking_number",
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
  ]);

  const candidateKeys = Array.from(
    new Set([...Object.keys(proposed), ...Object.keys(original)])
  ).filter((k) => !ignoredKeys.has(k));

  for (const key of candidateKeys) {
    if (checkedKeys.has(key)) continue;
    checkedKeys.add(key);

    const oldVal = original[key];
    const newVal = proposed[key];

    if (!areValuesEqual(oldVal, newVal)) {
      const fieldMeta = getFieldLabel(key);
      changes.push({
        field: key,
        fieldLabel: fieldMeta.label,
        category: fieldMeta.category,
        oldValue: normalizeValue(oldVal),
        newValue: normalizeValue(newVal),
      });
    }
  }

  return changes;
}

export function buildRegistrationDataForApproval(
  input: Record<string, any>,
  options?: { approvedAdvance?: number }
) {
  const totalCharges = new Prisma.Decimal(input.totalCharges ?? 0);
  const approvedAdvance = new Prisma.Decimal(options?.approvedAdvance ?? 0);
  const balanceAmount = Prisma.Decimal.max(new Prisma.Decimal(0), totalCharges.minus(approvedAdvance));
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
  return {
    id: record.id,
    registrationId: record.registrationId,
    trackingNumber: record.trackingNumber,
    customerName: record.customerName ?? null,
    documentType: record.documentType ?? null,
    documentName: record.documentName ?? null,
    registrationOffice: record.registrationOffice ?? null,
    currentOffice: record.currentOffice ?? null,
    originalSnapshot: (record.originalSnapshot as unknown as Record<string, any>) ?? {},
    proposedSnapshot: (record.proposedSnapshot as unknown as Record<string, any>) ?? {},
    fieldChanges: (record.fieldChanges as unknown as FieldChangeItem[]) ?? [],
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

export async function createEditRequest(params: CreateEditRequestParams) {
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
    },
  });

  if (!existing) {
    throw new Error("Registration document not found.");
  }

  if (existing.isBmLocked) {
    throw new Error("This registration is locked for BM Report processing and cannot be edited.");
  }

  // 2. Duplicate Request Prevention: Check if active PENDING request already exists
  const existingPending = await prisma.registrationEditRequest.findFirst({
    where: {
      ownerAdminId,
      registrationId: existing.id,
      status: "PENDING",
    },
  });

  if (existingPending) {
    const error: any = new Error("An edit approval request is already pending for this document.");
    error.statusCode = 409;
    error.isDuplicate = true;
    throw error;
  }

  // 3. Compare original data and proposed data to compute field changes
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
    advancePaid: Number(existing.advancePaid),
    paymentMode: existing.paymentMode,
    upiTransactionId: existing.upiTransactionId,
    bankName: existing.bankName,
    transactionRefNo: existing.transactionRefNo,
    transferDate: existing.transferDate ? existing.transferDate.toISOString().split("T")[0] : null,
    chequeNumber: existing.chequeNumber,
    chequeDate: existing.chequeDate ? existing.chequeDate.toISOString().split("T")[0] : null,
    ddNumber: existing.ddNumber,
    ddDate: existing.ddDate ? existing.ddDate.toISOString().split("T")[0] : null,
    cardLast4: existing.cardLast4,
    approvalCode: existing.approvalCode,
    paymentGateway: existing.paymentGateway,
    onlineTransactionId: existing.onlineTransactionId,
    walletName: existing.walletName,
    walletTransactionId: existing.walletTransactionId,
    paymentReferenceNo: existing.paymentReferenceNo,
    paymentDescription: existing.paymentDescription,
    paymentStatus: existing.paymentStatus,
    collectedPerson: existing.collectedPerson,
    commissionToUserId: existing.commissionToUserId,
    commissionToName: existing.commissionToName,
    commissionToEmail: existing.commissionToEmail,
    registeredPerson: existing.registeredPerson,
    regionOfRegistration: existing.regionOfRegistration,
    approvalStatus: existing.approvalStatus,
    leadId: existing.leadId,
  };

  const proposedSnapshot: Record<string, any> = {
    ...originalSnapshot,
    ...input,
    trackingNumber: existing.trackingNumber,
  };

  const fieldChanges = computeFieldChanges(originalSnapshot, proposedSnapshot);

  if (fieldChanges.length === 0) {
    const error: any = new Error("No field changes detected.");
    error.statusCode = 400;
    throw error;
  }

  // Resolve current office location
  const currentOfficeLocation =
    existing.documentMovements[0]?.currentOffice?.officeName ||
    existing.regionOfRegistration ||
    sourceOfficeName;

  // 4. Create the Edit Request record
  const created = await prisma.registrationEditRequest.create({
    data: {
      registrationId: existing.id,
      trackingNumber: existing.trackingNumber,
      customerName: proposedSnapshot.customerName || existing.customerName || null,
      documentType: proposedSnapshot.documentType || existing.documentType || null,
      documentName: proposedSnapshot.documentName || existing.documentName || null,
      registrationOffice: existing.regionOfRegistration || sourceOfficeName,
      currentOffice: currentOfficeLocation,
      originalSnapshot: originalSnapshot as unknown as Prisma.InputJsonValue,
      proposedSnapshot: proposedSnapshot as unknown as Prisma.InputJsonValue,
      fieldChanges: fieldChanges as unknown as Prisma.InputJsonValue,
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

  return mapEditRequest(created);
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
  } = {}
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 50, 1000));

  const where: Prisma.RegistrationEditRequestWhereInput = {
    ownerAdminId,
    ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
    ...(params.trackingNumber ? { trackingNumber: { contains: params.trackingNumber } } : {}),
    ...(params.registrationId ? { registrationId: params.registrationId } : {}),
    ...(params.office && params.office !== "Select Office" && params.office !== "ALL"
      ? {
          OR: [
            { registrationOffice: params.office },
            { currentOffice: params.office },
          ],
        }
      : {}),
  };

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

export async function approveEditRequest(params: ApproveEditRequestParams) {
  const { ownerAdminId, id, approvedById, approvedByName } = params;

  return prisma.$transaction(async (tx) => {
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

        const error: any = new Error(
          "Document changed after request creation. Please review and create a new request."
        );
        error.statusCode = 409;
        error.isStale = true;
        throw error;
      }
    }

    const proposed = (editRequest.proposedSnapshot as unknown as Record<string, any>) || {};
    const fieldChanges = (editRequest.fieldChanges as unknown as FieldChangeItem[]) || [];

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
            actionType: FollowupActionType.Rescheduled,
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

    const auditEntries: Prisma.AuditTrailCreateWithoutRegistrationInput[] = [
      {
        action: "Edit request approved",
        description: `Edit request approved by ${approvedByName || "Approver"}. Changes applied: ${changesSummary}`,
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

    // Apply updates to Registration
    const updatedReg = await tx.registration.update({
      where: { id: currentReg.id },
      data: {
        ...updateData,
        trackingStatus: finalTrackingStatus,
        bmStatus: finalBmStatus,
        movementApproved: rfdSpecialHandled ? true : currentReg.movementApproved,
        auditTrail: {
          create: auditEntries,
        },
      },
    });

    // 6. Update Edit Request Status to APPROVED
    const updatedRequest = await tx.registrationEditRequest.update({
      where: { id: editRequest.id },
      data: {
        status: "APPROVED",
        approvedById: approvedById || null,
        approvedBy: approvedByName || "System Approver",
        approvedAt: new Date(),
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
  const { ownerAdminId, id, rejectionReason, rejectedById, rejectedByName } = params;

  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error("Rejection reason is required to reject an edit request.");
  }

  return prisma.$transaction(async (tx) => {
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

    // Log audit trail on Registration
    await tx.auditTrail.create({
      data: {
        registrationId: editRequest.registrationId,
        action: "Edit request rejected",
        description: `Edit request rejected by ${rejectedByName || "Approver"}. Reason: ${rejectionReason.trim()}`,
        performedBy: rejectedByName || null,
      },
    });

    return mapEditRequest(updatedRequest);
  });
}
