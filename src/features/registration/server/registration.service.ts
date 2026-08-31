import { Prisma, FollowupActionType } from "@prisma/client";

import { submitAdvancePaymentApproval, getApprovedAdvanceSum } from "@/features/revenue/server/advance-payment-approval.service";
import { createMovementApprovalRequest } from "@/features/document-movement/server/movement-approval.service";
import { prisma } from "@/lib/prisma";
import type { RegistrationInput } from "@/features/registration/validations/registration.schema";

const registrationInclude = {
  creator: {
    select: { id: true, name: true, email: true },
  },
  corporateDetail: {
    select: { id: true, companyName: true, contactPersonName: true, contactPersonMobile: true },
  },
  files: {
    orderBy: { uploadedAt: "desc" as const },
    include: {
      fileStorage: true,
    },
  },
  auditTrail: { orderBy: { createdAt: "desc" as const } },
  advancePaymentApprovals: {
    orderBy: { requestedAt: "desc" as const },
    take: 1,
  },
};

type RegistrationRecord = Prisma.RegistrationGetPayload<{
  include: typeof registrationInclude;
}>;

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function mapRegistration(registration: RegistrationRecord) {
  const welcomeRegistration = registration as RegistrationRecord & {
    welcomeCallStatus?: string;
    welcomeCalledBy?: string | null;
    welcomeCalledAt?: Date | null;
  };
  const financeRegistration = registration as RegistrationRecord & {
    balanceReceivedAmount?: Prisma.Decimal | number;
    submittedAt?: Date | null;
    approvedAt?: Date | null;
  };

  const latestAdvanceApproval = (registration as any).advancePaymentApprovals?.[0];
  const pendingAdvanceAmount =
    registration.advancePaymentStatus === "Pending Approval" && latestAdvanceApproval?.status === "Pending Approval"
      ? Number(latestAdvanceApproval.advanceAmount)
      : 0;

  return {
    ...registration,
    totalCharges: Number(registration.totalCharges),
    advancePaid: Number(registration.advancePaid),
    requestedAdvanceAmount: pendingAdvanceAmount,
    balanceAmount: Number(registration.balanceAmount),
    balanceReceivedAmount: Number(financeRegistration.balanceReceivedAmount ?? 0),
    subPackage: registration.subPackage ?? null,
    acceptedAt: registration.acceptedAt?.toISOString() ?? null,
    submittedAt: financeRegistration.submittedAt?.toISOString() ?? null,
    approvedAt: financeRegistration.approvedAt?.toISOString() ?? null,
    welcomeCallStatus: welcomeRegistration.welcomeCallStatus ?? "Pending",
    welcomeCalledBy: welcomeRegistration.welcomeCalledBy ?? null,
    welcomeCalledAt: welcomeRegistration.welcomeCalledAt?.toISOString() ?? null,
    documentName: registration.documentName ?? null,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
    createdDate: formatDate(registration.createdAt),
    files: registration.files.map((file) => ({
      id: file.id,
      registrationId: file.registrationId,
      fileCategory: file.fileCategory,
      uploadedAt: file.uploadedAt.toISOString(),
      fileName: file.fileStorage?.originalName || "Unknown",
      mimeType: file.fileStorage?.mimeType || "application/octet-stream",
      fileSize: file.fileStorage?.size || 0,
      url: file.fileStorageId ? `/api/files/${file.fileStorageId}/view` : `/api/registrations/files/${file.id}`,
    })),
    auditTrail: registration.auditTrail.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    transferDate: (registration as any).transferDate ? (registration as any).transferDate.toISOString().split("T")[0] : null,
    chequeDate: (registration as any).chequeDate ? (registration as any).chequeDate.toISOString().split("T")[0] : null,
    ddDate: (registration as any).ddDate ? (registration as any).ddDate.toISOString().split("T")[0] : null,
    upiTransactionId: (registration as any).upiTransactionId ?? null,
    bankName: (registration as any).bankName ?? null,
    transactionRefNo: (registration as any).transactionRefNo ?? null,
    chequeNumber: (registration as any).chequeNumber ?? null,
    ddNumber: (registration as any).ddNumber ?? null,
    cardLast4: (registration as any).cardLast4 ?? null,
    approvalCode: (registration as any).approvalCode ?? null,
    paymentGateway: (registration as any).paymentGateway ?? null,
    onlineTransactionId: (registration as any).onlineTransactionId ?? null,
    walletName: (registration as any).walletName ?? null,
    walletTransactionId: (registration as any).walletTransactionId ?? null,
    paymentReferenceNo: (registration as any).paymentReferenceNo ?? null,
    paymentDescription: (registration as any).paymentDescription ?? null,
    createdById: registration.createdBy,
    createdBy: registration.creator ? {
      id: registration.creator.id,
      name: registration.creator.name,
      email: registration.creator.email,
    } : null,
  };
}

import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";

function buildRegistrationData(
  input: RegistrationInput,
  options?: { approvedAdvance?: number },
) {
  const totalCharges = new Prisma.Decimal(input.totalCharges ?? 0);
  const approvedAdvance = new Prisma.Decimal(options?.approvedAdvance ?? 0);
  const balanceAmount = Prisma.Decimal.max(new Prisma.Decimal(0), totalCharges.minus(approvedAdvance));
  const hasCommissionTarget = Boolean(
    input.commissionToUserId || input.commissionToName || input.commissionToEmail,
  );

  const computedPaymentStatus = calculatePaymentStatus({
    approvalStatus: input.approvalStatus || "Pending",
    advancePaymentStatus: (input as any).advancePaymentStatus || "Pending Approval",
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
    trackingNumber: input.trackingNumber,
    customerName: input.customerName || null,
    mobile: input.mobile || null,
    email: input.email || null,
    address: input.address || null,
    country: input.country || null,
    state: input.state || null,
    city: input.city || null,
    customerType: input.customerType || null,
    corporateDetailId: (input as any).corporateDetailId || null,
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
    approvalStatus: input.approvalStatus,
    trackingStatus: input.trackingStatus || "Registered",
  };
}

function logRegistrationWorkflow(
  message: string,
  payload: Record<string, unknown>,
) {
  console.info(`[registration] ${message}`, payload);
}

import { buildOfficeVisibilityWhereInput } from "@/lib/data-scope";

export async function listRegistrations(
  ownerAdminId: string,
  params: {
    query?: string;
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    trackingNumber?: string;
    customerName?: string;
    mobile?: string;
    createdBy?: string;
    collectedPerson?: string;
    registeredPerson?: string;
    officeLocation?: string;
    processOffice?: string;
    service?: string;
    documentType?: string;
    documentIssuedCountry?: string;
    customerType?: string;
    processType?: string;
    subPackage?: string;
    priority?: string;
    deliveryLocation?: string;
    paymentStatus?: string;
    paymentMode?: string;
    approvalStatus?: string;
    status?: string;
    trackingStatus?: string;
    hasBalance?: string;
    minTotalCharge?: string;
    maxTotalCharge?: string;
    minAdvancePaid?: string;
    maxAdvancePaid?: string;
    isSuperAdmin?: boolean;
    allowedOfficeIds?: string[] | null;
    allowedOfficeNames?: string[] | null;
  },
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 10, 100000));
  const query = params.query?.trim();

  const statusFilter = params.status || params.trackingStatus;

  const where: Prisma.RegistrationWhereInput = {
    ownerAdminId,
    ...(params.trackingNumber ? { trackingNumber: { contains: params.trackingNumber } } : {}),
    ...(params.customerName ? { customerName: { contains: params.customerName } } : {}),
    ...(params.mobile ? { mobile: { contains: params.mobile } } : {}),
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
    ...(params.collectedPerson ? { collectedPerson: params.collectedPerson } : {}),
    ...(params.registeredPerson ? { registeredPerson: params.registeredPerson } : {}),
    ...(params.officeLocation ? { regionOfRegistration: params.officeLocation } : {}),
    ...(params.processOffice ? { documentMovements: { some: { currentOfficeId: params.processOffice } } } : {}),
    ...(params.service ? { processType: params.service } : {}),
    ...(params.documentType ? { documentType: params.documentType } : {}),
    ...(params.documentIssuedCountry ? { documentIssuedCountry: params.documentIssuedCountry } : {}),
    ...(params.customerType ? { customerType: params.customerType } : {}),
    ...(params.processType ? { processType: params.processType } : {}),
    ...(params.subPackage ? { subPackage: params.subPackage } : {}),
    ...(params.priority ? { priority: params.priority } : {}),
    ...(params.deliveryLocation ? { deliveryLocation: params.deliveryLocation } : {}),
    ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
    ...(params.paymentMode ? { paymentMode: params.paymentMode } : {}),
    ...(params.approvalStatus ? { approvalStatus: params.approvalStatus } : {}),
    ...(statusFilter ? { trackingStatus: { contains: statusFilter } } : {}),
  };

  if (params.allowedOfficeNames !== undefined || params.isSuperAdmin !== undefined) {
    const officeCondition = buildOfficeVisibilityWhereInput(
      {
        isSuperAdmin: params.isSuperAdmin,
        allowedOfficeIds: params.allowedOfficeIds,
        allowedOfficeNames: params.allowedOfficeNames,
      },
      { officeNameField: "regionOfRegistration" }
    );
    if (params.officeLocation && !params.isSuperAdmin && params.allowedOfficeNames) {
      if (!params.allowedOfficeNames.includes(params.officeLocation)) {
        where.id = "none";
      }
    }
    Object.assign(where, officeCondition);
  }

  if (params.fromDate || params.toDate) {
    where.createdAt = {};
    if (params.fromDate) where.createdAt.gte = new Date(`${params.fromDate}T00:00:00.000Z`);
    if (params.toDate) where.createdAt.lte = new Date(`${params.toDate}T23:59:59.999Z`);
  }

  if (params.hasBalance === "true") {
    where.balanceAmount = { gt: 0 };
  } else if (params.hasBalance === "false") {
    where.balanceAmount = { lte: 0 };
  }

  if (params.minTotalCharge || params.maxTotalCharge) {
    where.totalCharges = {};
    if (params.minTotalCharge) where.totalCharges.gte = Number(params.minTotalCharge);
    if (params.maxTotalCharge) where.totalCharges.lte = Number(params.maxTotalCharge);
  }

  if (params.minAdvancePaid || params.maxAdvancePaid) {
    where.advancePaid = {};
    if (params.minAdvancePaid) where.advancePaid.gte = Number(params.minAdvancePaid);
    if (params.maxAdvancePaid) where.advancePaid.lte = Number(params.maxAdvancePaid);
  }

  if (query) {
    where.OR = [
      { trackingNumber: { contains: query } },
      { customerName: { contains: query } },
      { mobile: { contains: query } },
      { email: { contains: query } },
      { processType: { contains: query } },
      { subPackage: { contains: query } },
      { documentType: { contains: query } },
      { documentName: { contains: query } },
      { paymentStatus: { contains: query } },
      { approvalStatus: { contains: query } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: registrationInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.registration.count({ where }),
  ]);

  return {
    items: items.map((registration) => mapRegistration(registration)),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
}

export async function getRegistrationById(ownerAdminId: string, id: string) {
  const registration = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    include: registrationInclude,
  });

  return registration ? mapRegistration(registration) : null;
}

export async function getRegistrationByTrackingNumber(ownerAdminId: string, trackingNumber: string) {
  const registration = await prisma.registration.findFirst({
    where: { ownerAdminId, trackingNumber },
    include: registrationInclude,
  });

  return registration ? mapRegistration(registration) : null;
}

export async function createRegistration(
  ownerAdminId: string,
  input: RegistrationInput,
  sourceOfficeName: string,
  performedBy?: string,
  userId?: string,
) {
  if (!sourceOfficeName.trim()) {
    throw new Error("Office location is required to create a registration.");
  }

  const requestedAdvance = Number(input.requestedAdvanceAmount ?? input.advancePaid ?? 0);
  if (requestedAdvance > (input.totalCharges ?? 0)) {
    throw new Error("Advance amount cannot exceed Total Charges.");
  }

  const isHomeDelivery = input.deliveryLocation?.toLowerCase() === sourceOfficeName.toLowerCase();

  let sourceOffice = await prisma.officeLocation.findFirst({
    where: { officeName: sourceOfficeName, ownerAdminId },
    select: { id: true },
  });

  if (!sourceOffice) {
    sourceOffice = await prisma.officeLocation.create({
      data: {
        officeName: sourceOfficeName,
        location: "Office",
        timezone: "UTC",
        ownerAdminId,
      },
      select: { id: true },
    });
  }

  const registrationResult = await prisma.$transaction(async (tx) => {
    let countryChangedFromLead: { previous: string; new: string } | null = null;

    if (input.leadId) {
      const lead = await tx.lead.findFirst({
        where: { id: input.leadId, ownerAdminId },
        select: { id: true, documentIssuedCountry: true },
      });

      if (lead) {
        const leadCountry = (lead.documentIssuedCountry ?? "").trim();
        const selectedCountry = (input.documentIssuedCountry ?? "").trim();

        if (selectedCountry && selectedCountry !== leadCountry) {
          countryChangedFromLead = {
            previous: leadCountry || "N/A",
            new: selectedCountry,
          };

          // 1. Update linked Lead in the same transaction
          await tx.lead.update({
            where: { id: lead.id },
            data: { documentIssuedCountry: selectedCountry },
          });

          // 2. Lead Audit log
          await tx.leadFollowupHistory.create({
            data: {
              leadId: lead.id,
              actionType: FollowupActionType.Rescheduled,
              description: `Field: Document Issued Country | Old: ${leadCountry || "N/A"} | New: ${selectedCountry} | Updated From: Revenue Registration | Updated By: ${performedBy ?? "Current User"}`,
              userId: userId ?? null,
              ownerAdminId,
            },
          });
        }
      }
    }

    // 3. Create Revenue Registration
    const reg = await tx.registration.create({
      data: {
        ...buildRegistrationData(
          { ...input, regionOfRegistration: sourceOfficeName },
          { approvedAdvance: 0 },
        ),
        welcomeCallStatus: "Pending",
        ownerAdminId,
        createdBy: userId ?? null,
        bmStatus: isHomeDelivery ? "Accepted" : "Pending",
        acceptedAt: isHomeDelivery ? new Date() : null,
        acceptedBy: isHomeDelivery ? (performedBy ?? null) : null,
        auditTrail: {
          create: [
            {
              action: "Registration created",
              description: `Registration ${input.trackingNumber} was created.`,
              performedBy: performedBy ?? null,
            },
            ...(countryChangedFromLead
              ? [
                {
                  action: "Document Issued Country updated",
                  description: `Field: Document Issued Country | Old: ${countryChangedFromLead.previous} | New: ${countryChangedFromLead.new} | Changed By: ${performedBy ?? "Current User"}`,
                  performedBy: performedBy ?? null,
                },
              ]
              : []),
          ],
        },
        documentMovements: {
          create: {
            trackingNumber: input.trackingNumber,
            currentOfficeId: sourceOffice?.id ?? null,
            currentModule: "REGISTRATION",
            status: "HOME",
            movementType: "INITIAL",
            createdBy: performedBy ?? null,
            originOfficeId: sourceOffice?.id ?? null,
            processChain: [],
          },
        },
      },
      include: registrationInclude,
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: input.trackingNumber,
        action: "Created",
        newStatus: "HOME",
        newOffice: sourceOfficeName,
        performedBy: performedBy ?? null,
      },
    });

    return reg;
  }, { timeout: 20000 });

  logRegistrationWorkflow("Created registration.", {
    trackingNumber: registrationResult.trackingNumber,
    currentUserOffice: sourceOfficeName,
    regionOfRegistration: registrationResult.regionOfRegistration,
    deliveryLocation: registrationResult.deliveryLocation,
    approvalStatus: registrationResult.approvalStatus,
    bmStatus: registrationResult.bmStatus,
  });

  if (requestedAdvance > 0) {
    await submitAdvancePaymentApproval({
      ownerAdminId,
      registrationId: registrationResult.id,
      advanceAmount: requestedAdvance,
      paymentDate: new Date(),
      paymentMode: input.paymentMode || "Cash",
      referenceNumber: input.transactionRefNo || input.upiTransactionId || null,
      collectedBy: input.collectedPerson || null,
      performedByUserId: userId,
    }).catch((err) => console.error("[registration] Advance payment approval submission error:", err));
  } else {
    await createMovementApprovalRequest({
      ownerAdminId,
      registrationId: registrationResult.id,
      performedBy: performedBy ?? "System User",
    }).catch((err) => console.error("[registration] Movement approval creation error:", err));
  }

  const reloaded = await prisma.registration.findUnique({
    where: { id: registrationResult.id },
    include: registrationInclude,
  });

  return mapRegistration(reloaded || registrationResult);
}

export async function updateRegistration(
  ownerAdminId: string,
  id: string,
  input: RegistrationInput,
  sourceOfficeName: string,
  performedBy?: string,
) {
  const requestedAdvance = Number(input.requestedAdvanceAmount ?? 0);
  if (requestedAdvance > (input.totalCharges ?? 0)) {
    throw new Error("Advance amount cannot exceed Total Charges.");
  }

  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: {
      id: true,
      paymentStatus: true,
      totalCharges: true,
      advancePaid: true,
      regionOfRegistration: true,
      isBmLocked: true,
      advancePaymentStatus: true,
      documentIssuedCountry: true,
      leadId: true,
    },
  });

  if (!existing) return null;

  if (existing.isBmLocked) {
    throw new Error("This registration is locked for BM Report processing and cannot be updated.");
  }

  const approvedAdvanceSum = await getApprovedAdvanceSum(existing.id);

  const paymentChanged =
    existing.paymentStatus !== input.paymentStatus ||
    Number(existing.totalCharges) !== Number(input.totalCharges);

  const countryChanged =
    Boolean(input.documentIssuedCountry) &&
    (existing.documentIssuedCountry ?? "").trim() !== (input.documentIssuedCountry ?? "").trim();

  const prevCountry = (existing.documentIssuedCountry ?? "").trim() || "N/A";
  const newCountry = (input.documentIssuedCountry ?? "").trim();
  const targetLeadId = existing.leadId || input.leadId;

  const registrationResult = await prisma.$transaction(async (tx) => {
    // Synchronize Lead if country changed and lead exists
    if (countryChanged && targetLeadId) {
      const lead = await tx.lead.findFirst({
        where: { id: targetLeadId, ownerAdminId },
        select: { id: true, documentIssuedCountry: true },
      });

      if (lead) {
        const leadOldCountry = (lead.documentIssuedCountry ?? "").trim() || prevCountry;

        await tx.lead.update({
          where: { id: lead.id },
          data: { documentIssuedCountry: newCountry },
        });

        await tx.leadFollowupHistory.create({
          data: {
            leadId: lead.id,
            actionType: FollowupActionType.Rescheduled,
            description: `Field: Document Issued Country | Old: ${leadOldCountry} | New: ${newCountry} | Updated From: Revenue Registration | Updated By: ${performedBy ?? "Current User"}`,
            userId: null,
            ownerAdminId,
          },
        });
      }
    }

    const reg = await tx.registration.update({
      where: { id: existing.id },
      data: {
        ...buildRegistrationData(
          { ...input, regionOfRegistration: existing.regionOfRegistration ?? sourceOfficeName },
          { approvedAdvance: approvedAdvanceSum },
        ),
        auditTrail: {
          create: [
            {
              action: paymentChanged ? "Payment updated" : "Registration updated",
              description: paymentChanged
                ? "Commercial or payment details were updated."
                : "Registration details were updated.",
              performedBy: performedBy ?? null,
            },
            ...(countryChanged
              ? [
                {
                  action: "Document Issued Country updated",
                  description: `Field: Document Issued Country | Old: ${prevCountry} | New: ${newCountry} | Changed By: ${performedBy ?? "Current User"}`,
                  performedBy: performedBy ?? null,
                },
              ]
              : []),
          ],
        },
      },
      include: registrationInclude,
    });

    return reg;
  }, { timeout: 20000 });

  if (requestedAdvance > 0 && (paymentChanged || existing.advancePaymentStatus === "Rejected" || existing.advancePaymentStatus === "None")) {
    await submitAdvancePaymentApproval({
      ownerAdminId,
      registrationId: registrationResult.id,
      advanceAmount: requestedAdvance,
      paymentDate: new Date(),
      paymentMode: input.paymentMode || "Cash",
      referenceNumber: input.transactionRefNo || input.upiTransactionId || null,
      collectedBy: input.collectedPerson || null,
      performedByUserId: undefined,
    }).catch((err) => console.error("[registration] Advance payment approval update error:", err));
  } else if (Number(registrationResult.advancePaid) <= 0 && !registrationResult.movementApproved) {
    await createMovementApprovalRequest({
      ownerAdminId,
      registrationId: registrationResult.id,
      performedBy: performedBy ?? "System User",
    }).catch((err) => console.error("[registration] Movement approval update request error:", err));
  }

  logRegistrationWorkflow("Updated registration.", {
    trackingNumber: registrationResult.trackingNumber,
    currentUserOffice: sourceOfficeName,
    regionOfRegistration: registrationResult.regionOfRegistration,
    deliveryLocation: registrationResult.deliveryLocation,
    approvalStatus: registrationResult.approvalStatus,
    bmStatus: registrationResult.bmStatus,
  });

  const reloaded = await prisma.registration.findUnique({
    where: { id: registrationResult.id },
    include: registrationInclude,
  });

  return mapRegistration(reloaded || registrationResult);
}

export async function deleteRegistration(ownerAdminId: string, id: string, performedBy?: string) {
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true, trackingNumber: true, isBmLocked: true },
  });

  if (!existing) return false;

  if (existing.isBmLocked) {
    throw new Error("This registration is locked for BM Report processing and cannot be deleted.");
  }

  await prisma.$transaction(
    async (tx) => {
      await Promise.all([
        tx.auditTrail.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.documentMovement.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.registrationFile.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.paymentUpdate.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.accountStatementEntry.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.processAssignment.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.documentCommunication.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.advancePaymentAuditLog.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.advancePaymentApproval.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        tx.movementApproval.deleteMany({ where: { registrationId: existing.id } }).catch(() => {}),
        (tx as any).movementHistory?.deleteMany({
          where: { trackingNumber: existing.trackingNumber },
        }).catch(() => {}),
        tx.bundleItem.deleteMany({
          where: { trackingNumber: existing.trackingNumber },
        }).catch(() => {}),
        (tx as any).branchMovementRecord?.deleteMany({
          where: { trackingNumber: existing.trackingNumber, ownerAdminId },
        }).catch(() => {}),
        (tx as any).documentWorkflowHistory?.deleteMany({
          where: { trackingNumber: existing.trackingNumber },
        }).catch(() => {}),
      ]);

      await tx.registration.delete({ where: { id: existing.id } });
    },
    { timeout: 30000, maxWait: 10000 }
  );

  return true;
}

export async function bulkDeleteRegistrations(
  ownerAdminId: string,
  ids: string[],
  performedBy?: string
) {
  if (!ids || ids.length === 0) {
    return { deletedCount: 0, failedCount: 0, skippedCount: 0, skippedDetails: [] };
  }

  // 1. Fetch registrations for ownerAdminId
  const registrations = await prisma.registration.findMany({
    where: {
      ownerAdminId,
      id: { in: ids },
    },
    select: {
      id: true,
      trackingNumber: true,
      isBmLocked: true,
      trackingStatus: true,
    },
  });

  const foundIds = new Set(registrations.map((r) => r.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  const deletableRegs: typeof registrations = [];
  const skippedDetails: Array<{ id: string; trackingNumber?: string; reason: string }> = [];

  for (const reg of registrations) {
    if (reg.isBmLocked) {
      skippedDetails.push({
        id: reg.id,
        trackingNumber: reg.trackingNumber,
        reason: "Registration is locked for BM Report processing and cannot be deleted.",
      });
      continue;
    }
    deletableRegs.push(reg);
  }

  for (const mId of missingIds) {
    skippedDetails.push({
      id: mId,
      reason: "Registration not found or access denied.",
    });
  }

  if (deletableRegs.length === 0) {
    return {
      deletedCount: 0,
      failedCount: missingIds.length,
      skippedCount: skippedDetails.length,
      skippedDetails,
    };
  }

  const deletableIds = deletableRegs.map((r) => r.id);
  const deletableTrackingNumbers = deletableRegs.map((r) => r.trackingNumber);

  // 2. Perform atomic deletion in transaction with concurrent batch child cleanup
  await prisma.$transaction(
    async (tx) => {
      await Promise.all([
        tx.auditTrail.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.documentMovement.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.registrationFile.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.paymentUpdate.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.accountStatementEntry.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.processAssignment.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.documentCommunication.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.advancePaymentAuditLog.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.advancePaymentApproval.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        tx.movementApproval.deleteMany({ where: { registrationId: { in: deletableIds } } }).catch(() => {}),
        (tx as any).movementHistory?.deleteMany({
          where: { trackingNumber: { in: deletableTrackingNumbers } },
        }).catch(() => {}),
        tx.bundleItem.deleteMany({
          where: { trackingNumber: { in: deletableTrackingNumbers } },
        }).catch(() => {}),
        (tx as any).branchMovementRecord?.deleteMany({
          where: { trackingNumber: { in: deletableTrackingNumbers }, ownerAdminId },
        }).catch(() => {}),
        (tx as any).documentWorkflowHistory?.deleteMany({
          where: { trackingNumber: { in: deletableTrackingNumbers } },
        }).catch(() => {}),
      ]);

      await tx.registration.deleteMany({
        where: {
          ownerAdminId,
          id: { in: deletableIds },
        },
      });
    },
    { timeout: 30000, maxWait: 10000 }
  );

  return {
    deletedCount: deletableIds.length,
    failedCount: missingIds.length,
    skippedCount: skippedDetails.length,
    skippedDetails,
  };
}

export async function addRegistrationFile(
  ownerAdminId: string,
  id: string,
  file: {
    fileStorageId: string;
    fileCategory: string;
  },
  performedBy?: string,
) {
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true, advancePaid: true },
  });

  if (!existing) return null;

  await prisma.registrationFile.create({
    data: {
      registrationId: existing.id,
      fileStorageId: file.fileStorageId,
      fileCategory: file.fileCategory,
    },
  });

  const fileStorage = await prisma.fileStorage.findUnique({
    where: { id: file.fileStorageId },
  });

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      auditTrail: {
        create: {
          action: "Document uploaded",
          description: `${fileStorage?.originalName || "A file"} was uploaded.`,
          performedBy: performedBy ?? null,
        },
      },
    },
    include: registrationInclude,
  });

  if (file.fileCategory === "ADVANCE_PAYMENT" && Number(registration.advancePaid) > 0) {
    await submitAdvancePaymentApproval({
      ownerAdminId,
      registrationId: registration.id,
      advanceAmount: Number(registration.advancePaid),
      paymentDate: new Date(),
      paymentMode: registration.paymentMode || "Cash",
      receiptFileId: file.fileStorageId,
    }).catch((err) => console.error("[registration] Advance payment file upload approval error:", err));
  }

  const reloaded = await prisma.registration.findUnique({
    where: { id: registration.id },
    include: registrationInclude,
  });

  return mapRegistration(reloaded || registration);
}

export async function getRegistrationFile(ownerAdminId: string, fileId: string) {
  return prisma.registrationFile.findFirst({
    where: {
      id: fileId,
      registration: {
        ownerAdminId,
      },
    },
    include: {
      fileStorage: true,
    },
  });
}

export async function deleteRegistrationFile(ownerAdminId: string, fileId: string, performedBy?: string) {
  const file = await prisma.registrationFile.findFirst({
    where: {
      id: fileId,
      registration: { ownerAdminId }
    },
    include: { fileStorage: true }
  });

  if (!file) return null;

  const registrationId = file.registrationId;
  const fileName = file.fileStorage?.originalName || "A file";

  await prisma.registrationFile.delete({
    where: { id: fileId }
  });

  const registration = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      auditTrail: {
        create: {
          action: "Document deleted",
          description: `${fileName} was deleted.`,
          performedBy: performedBy ?? null,
        }
      }
    },
    include: registrationInclude,
  });

  return { registration, fileStorageId: file.fileStorageId };
}

export async function setRegistrationApproval(
  ownerAdminId: string,
  id: string,
  approvalStatus: "Approved" | "Rejected",
  performedBy?: string,
) {
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true, trackingNumber: true, totalCharges: true, advancePaid: true, balanceAmount: true, balanceReceivedAmount: true, advancePaymentStatus: true },
  });

  if (!existing) return null;

  const newPaymentStatus = calculatePaymentStatus({
    approvalStatus,
    advancePaymentStatus: existing.advancePaymentStatus,
    totalCharges: Number(existing.totalCharges),
    advancePaid: Number(existing.advancePaid),
    balanceAmount: Number(existing.balanceAmount),
    receivedAmount: existing.balanceReceivedAmount ? Number(existing.balanceReceivedAmount) : undefined,
  });

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      approvalStatus,
      paymentStatus: newPaymentStatus,
      auditTrail: {
        create: {
          action: approvalStatus,
          description: `Registration ${existing.trackingNumber} was ${approvalStatus.toLowerCase()}.`,
          performedBy: performedBy ?? null,
        },
      },
    },
    include: registrationInclude,
  });

  return mapRegistration(registration);
}

export async function recalculateAllRegistrationPaymentStatuses() {
  try {
    const registrations = await prisma.registration.findMany({
      select: {
        id: true,
        approvalStatus: true,
        advancePaymentStatus: true,
        totalCharges: true,
        advancePaid: true,
        balanceAmount: true,
        balanceReceivedAmount: true,
        paymentStatus: true,
      },
    });

    for (const reg of registrations) {
      const correctStatus = calculatePaymentStatus({
        approvalStatus: reg.approvalStatus,
        advancePaymentStatus: reg.advancePaymentStatus,
        totalCharges: Number(reg.totalCharges),
        advancePaid: Number(reg.advancePaid),
        balanceAmount: Number(reg.balanceAmount),
        receivedAmount: reg.balanceReceivedAmount ? Number(reg.balanceReceivedAmount) : undefined,
      });

      if (reg.paymentStatus !== correctStatus) {
        await prisma.registration.update({
          where: { id: reg.id },
          data: { paymentStatus: correctStatus },
        });
      }
    }
  } catch (err) {
    console.error("[recalculateAllRegistrationPaymentStatuses] Error:", err);
  }
}

export async function listRegistrationAuditTrail(ownerAdminId: string, id: string) {
  const registration = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true },
  });

  if (!registration) return null;

  return prisma.auditTrail.findMany({
    where: { registrationId: registration.id },
    orderBy: { createdAt: "desc" },
  });
}
