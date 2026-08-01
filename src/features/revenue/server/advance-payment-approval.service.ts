import { Prisma } from "@prisma/client";

import { createNotification } from "@/features/notifications/server/notification.service";
import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";
import { prisma } from "@/lib/prisma";

/**
 * Calculates the current sum of all APPROVED advance payments for a registration.
 */
export async function getApprovedAdvanceSum(registrationId: string): Promise<number> {
  const aggregate = await prisma.advancePaymentApproval.aggregate({
    where: {
      registrationId,
      status: "Approved",
    },
    _sum: { advanceAmount: true },
  });
  return Number(aggregate._sum.advanceAmount ?? 0);
}

export async function submitAdvancePaymentApproval(args: {
  ownerAdminId: string;
  registrationId: string;
  advanceAmount: number;
  paymentDate: string | Date;
  paymentMode: string;
  referenceNumber?: string | null;
  collectedBy?: string | null;
  remarks?: string | null;
  proofFileType?: string | null;
  receiptFileId?: string | null;
  performedByUserId?: string | null;
  ipAddress?: string | null;
}) {
  const advanceAmount = Number(args.advanceAmount);
  if (isNaN(advanceAmount) || advanceAmount <= 0) {
    throw new Error("Advance amount must be greater than zero.");
  }

  if (!args.paymentDate) {
    throw new Error("Payment Date is mandatory.");
  }

  if (!args.paymentMode?.trim()) {
    throw new Error("Payment Mode is mandatory.");
  }

  const registration = await prisma.registration.findFirst({
    where: { id: args.registrationId, ownerAdminId: args.ownerAdminId },
    include: {
      creator: { select: { id: true, name: true, email: true, supervisorUserId: true } },
      files: {
        where: { fileCategory: "ADVANCE_PAYMENT" },
        include: { fileStorage: true },
        orderBy: { uploadedAt: "desc" },
        take: 1,
      },
      lead: { select: { id: true, leadCode: true } },
    },
  });

  if (!registration) {
    throw new Error("Registration not found.");
  }

  // Calculate current approved advance total and current remaining balance
  const currentApprovedAdvance = await getApprovedAdvanceSum(registration.id);
  const totalAmount = Number(registration.totalCharges);
  const currentBalance = Math.max(0, totalAmount - currentApprovedAdvance);

  if (advanceAmount > currentBalance) {
    throw new Error(
      `Advance Amount (₹${advanceAmount.toLocaleString()}) cannot exceed remaining balance (₹${currentBalance.toLocaleString()}).`,
    );
  }

  // Determine proof file details
  let receiptFileId = args.receiptFileId ?? null;
  let receiptFileUrl: string | null = null;
  let receiptFileName: string | null = null;

  if (receiptFileId) {
    const storage = await prisma.fileStorage.findUnique({ where: { id: receiptFileId } });
    if (storage) {
      receiptFileUrl = `/api/files/${storage.id}/view`;
      receiptFileName = storage.originalName;
    }
  } else if (registration.files.length > 0 && registration.files[0].fileStorage) {
    receiptFileId = registration.files[0].fileStorageId;
    receiptFileUrl = `/api/files/${registration.files[0].fileStorage.id}/view`;
    receiptFileName = registration.files[0].fileStorage.originalName;
  }

  if (!receiptFileId && !receiptFileUrl) {
    throw new Error("Proof upload is mandatory for advance payment requests.");
  }

  // Determine user performing action
  let performedByName = "System";
  if (args.performedByUserId) {
    const user = await prisma.user.findUnique({
      where: { id: args.performedByUserId },
      select: { name: true, email: true },
    });
    if (user) {
      performedByName = user.name?.trim() || user.email;
    }
  }

  const parsedPaymentDate = new Date(args.paymentDate);

  // New balance if approved
  const remainingBalance = Math.max(0, currentBalance - advanceAmount);

  // ALWAYS create a NEW AdvancePaymentApproval request entry (Part 8: Multiple Advance Payments)
  const approval = await prisma.advancePaymentApproval.create({
    data: {
      registrationId: registration.id,
      trackingNumber: registration.trackingNumber,
      leadId: registration.lead?.leadCode || registration.leadId || null,
      customerName: registration.customerName,
      mobile: registration.mobile,
      office: registration.regionOfRegistration || registration.deliveryLocation || null,
      registeredPerson: registration.registeredPerson || performedByName,
      registeredDate: registration.createdAt,
      documentName: registration.documentName || registration.documentType || null,
      totalAmount: new Prisma.Decimal(totalAmount),
      advanceAmount: new Prisma.Decimal(advanceAmount),
      remainingBalance: new Prisma.Decimal(remainingBalance),
      currentAdvancePaid: new Prisma.Decimal(currentApprovedAdvance),
      currentBalance: new Prisma.Decimal(currentBalance),
      paymentDate: parsedPaymentDate,
      paymentMode: args.paymentMode.trim(),
      referenceNumber: args.referenceNumber?.trim() || null,
      collectedBy: args.collectedBy?.trim() || registration.collectedPerson || null,
      remarks: args.remarks?.trim() || null,
      proofFileType: args.proofFileType?.trim() || null,
      receiptFileId,
      receiptFileUrl,
      receiptFileName,
      status: "Pending Approval",
      requestedById: args.performedByUserId || registration.createdBy,
      requestedByName: performedByName,
      requestedAt: new Date(),
      ownerAdminId: args.ownerAdminId,
    },
  });

  // Update registration advance payment status flag ONLY (DO NOT modify advancePaid or balanceAmount on creation!)
  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      advancePaymentStatus: "Pending Approval",
      advancePaymentRejectionReason: null,
      auditTrail: {
        create: {
          action: "Advance Payment Requested",
          description: `Advance payment request of ₹${advanceAmount.toLocaleString()} (${args.paymentMode}) submitted for approval by ${performedByName}.`,
          performedBy: performedByName,
        },
      },
    },
  });

  // Log in AdvancePaymentAuditLog (Part 12)
  await prisma.advancePaymentAuditLog.create({
    data: {
      approvalId: approval.id,
      registrationId: registration.id,
      action: "Submitted",
      performedBy: args.performedByUserId || "System",
      performedByName,
      remarks: args.remarks || `Submitted advance payment request of ₹${advanceAmount.toLocaleString()} (${args.paymentMode}).`,
      ipAddress: args.ipAddress || null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  // Notify approvers (Part 11)
  const notifyUserIds = new Set<string>();

  if (registration.creator?.supervisorUserId) {
    notifyUserIds.add(registration.creator.supervisorUserId);
  }

  const adminUsers = await prisma.user.findMany({
    where: {
      ownerAdminId: args.ownerAdminId,
      isActive: true,
      OR: [
        { role: { name: { in: ["Super Admin", "Admin", "Manager"] } } },
        { id: args.ownerAdminId },
      ],
    },
    select: { id: true },
  });

  for (const admin of adminUsers) {
    if (admin.id !== args.performedByUserId) {
      notifyUserIds.add(admin.id);
    }
  }

  for (const recipientId of Array.from(notifyUserIds)) {
    await createNotification({
      userId: recipientId,
      title: "New Advance Payment Approval Request",
      message: `Advance payment approval request of ₹${advanceAmount.toLocaleString()} submitted for Registration ${registration.trackingNumber} (${registration.customerName}).`,
      type: "APPROVAL",
      referenceId: approval.id,
      referenceType: "ADVANCE_PAYMENT",
      ownerAdminId: args.ownerAdminId,
    });
  }

  return approval;
}

export async function listAdvancePaymentApprovals(
  ownerAdminId: string,
  params?: {
    status?: string;
    search?: string;
    registrationId?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(params?.pageSize ?? 50, 100));
  const statusFilter = params?.status?.trim();
  const search = params?.search?.trim();
  const registrationId = params?.registrationId?.trim();

  const where: Prisma.AdvancePaymentApprovalWhereInput = {
    ownerAdminId,
    ...(registrationId ? { registrationId } : {}),
    ...(statusFilter && statusFilter !== "All" ? { status: statusFilter } : {}),
  };

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search } },
      { customerName: { contains: search } },
      { mobile: { contains: search } },
      { leadId: { contains: search } },
      { referenceNumber: { contains: search } },
      { paymentMode: { contains: search } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    prisma.advancePaymentApproval.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        auditLogs: { orderBy: { createdAt: "desc" } },
        registration: {
          select: {
            id: true,
            trackingNumber: true,
            customerName: true,
            mobile: true,
            email: true,
            documentName: true,
            totalCharges: true,
            advancePaid: true,
            balanceAmount: true,
            regionOfRegistration: true,
            registeredPerson: true,
            createdAt: true,
            lead: { select: { id: true, leadCode: true } },
            files: {
              where: { fileCategory: "ADVANCE_PAYMENT" },
              include: { fileStorage: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.advancePaymentApproval.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const receiptStorage = item.registration?.files[0]?.fileStorage;
      const receiptFileId = item.receiptFileId || item.registration?.files[0]?.fileStorageId || null;
      const receiptFileUrl = item.receiptFileUrl || (receiptFileId ? `/api/files/${receiptFileId}/view` : null);

      return {
        id: item.id,
        registrationId: item.registrationId,
        trackingNumber: item.trackingNumber,
        registrationNumber: item.trackingNumber,
        leadId: item.leadId || item.registration?.lead?.leadCode || "-",
        customerName: item.customerName,
        mobile: item.mobile,
        documentName: item.documentName || item.registration?.documentName || "-",
        office: item.office || item.registration?.regionOfRegistration || "-",
        registeredBy: item.registeredPerson || item.requestedByName || "-",
        registeredDate: item.registeredDate ? item.registeredDate.toISOString() : item.createdAt.toISOString(),
        totalAmount: Number(item.totalAmount),
        advanceAmount: Number(item.advanceAmount),
        remainingBalance: Number(item.remainingBalance),
        currentAdvancePaid: item.currentAdvancePaid !== null ? Number(item.currentAdvancePaid) : Number(item.registration?.advancePaid ?? 0),
        currentBalance: item.currentBalance !== null ? Number(item.currentBalance) : Number(item.registration?.balanceAmount ?? 0),
        paymentDate: item.paymentDate ? item.paymentDate.toISOString() : item.requestedAt.toISOString(),
        paymentMode: item.paymentMode || "Cash",
        referenceNumber: item.referenceNumber || "-",
        collectedBy: item.collectedBy || item.requestedByName || "-",
        remarks: item.remarks || null,
        proofFileType: item.proofFileType || null,
        receiptFileId,
        receiptFileUrl,
        receiptFileName: item.receiptFileName || receiptStorage?.originalName || null,
        status: item.status,
        approvalStatus: item.status,
        requestedBy: item.requestedByName || "-",
        requestedById: item.requestedById,
        requestedDate: item.requestedAt.toISOString(),
        approvedBy: item.approvedByName || null,
        approvedDate: item.approvedAt?.toISOString() || null,
        rejectedBy: item.rejectedByName || null,
        rejectedDate: item.rejectedAt?.toISOString() || null,
        rejectionReason: item.rejectionReason || null,
        auditLogs: item.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          performedBy: log.performedByName || log.performedBy,
          remarks: log.remarks,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        })),
      };
    }),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
}

export async function approveAdvancePayment(args: {
  ownerAdminId: string;
  approvalId: string;
  approvedByUserId: string;
  remarks?: string | null;
  ipAddress?: string | null;
}) {
  const approval = await prisma.advancePaymentApproval.findFirst({
    where: { id: args.approvalId, ownerAdminId: args.ownerAdminId },
  });

  if (!approval) {
    throw new Error("Advance payment approval request not found.");
  }

  if (approval.status === "Approved") {
    throw new Error("This advance payment request is already approved.");
  }

  const approver = await prisma.user.findUnique({
    where: { id: args.approvedByUserId },
    select: { name: true, email: true },
  });
  const approvedByName = approver?.name?.trim() || approver?.email || "Admin";

  const now = new Date();

  // 1. Mark approval as Approved
  const updatedApproval = await prisma.advancePaymentApproval.update({
    where: { id: approval.id },
    data: {
      status: "Approved",
      approvedById: args.approvedByUserId,
      approvedByName,
      approvedAt: now,
    },
  });

  // 2. Recalculate sum of ALL Approved advance payments for registration (Part 6 & Part 13)
  const newTotalApprovedAdvance = await getApprovedAdvanceSum(approval.registrationId);

  const reg = await prisma.registration.findUnique({
    where: { id: approval.registrationId },
    select: { totalCharges: true, approvalStatus: true },
  });

  const totalCharges = Number(reg?.totalCharges ?? approval.totalAmount);
  const newBalanceAmount = Math.max(0, totalCharges - newTotalApprovedAdvance);

  const newPaymentStatus = calculatePaymentStatus({
    approvalStatus: reg?.approvalStatus || "Pending",
    advancePaymentStatus: "Approved",
    totalCharges,
    advancePaid: newTotalApprovedAdvance,
    balanceAmount: newBalanceAmount,
  });

  // Check if there are any remaining pending approvals for this registration
  const remainingPendingCount = await prisma.advancePaymentApproval.count({
    where: {
      registrationId: approval.registrationId,
      status: "Pending Approval",
    },
  });

  // 3. Update registration officially confirming advance & new balance
  await prisma.registration.update({
    where: { id: approval.registrationId },
    data: {
      advancePaid: new Prisma.Decimal(newTotalApprovedAdvance),
      balanceAmount: new Prisma.Decimal(newBalanceAmount),
      paymentStatus: newPaymentStatus,
      advancePaymentStatus: remainingPendingCount > 0 ? "Pending Approval" : "Approved",
      advancePaymentApprovedBy: approvedByName,
      advancePaymentApprovedAt: now,
      advancePaymentRejectionReason: null,
      auditTrail: {
        create: {
          action: "Advance Payment Approved",
          description: `Advance payment request of ₹${Number(approval.advanceAmount).toLocaleString()} was approved by ${approvedByName}. Total Advance Paid is now ₹${newTotalApprovedAdvance.toLocaleString()}, Balance: ₹${newBalanceAmount.toLocaleString()}.`,
          performedBy: approvedByName,
        },
      },
    },
  });

  // 4. Log in AdvancePaymentAuditLog (Part 12)
  await prisma.advancePaymentAuditLog.create({
    data: {
      approvalId: approval.id,
      registrationId: approval.registrationId,
      action: "Approved",
      performedBy: args.approvedByUserId,
      performedByName: approvedByName,
      remarks: args.remarks || `Advance payment of ₹${Number(approval.advanceAmount).toLocaleString()} approved by ${approvedByName}.`,
      ipAddress: args.ipAddress || null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  // 5. Notify requester (Part 11)
  if (approval.requestedById) {
    await createNotification({
      userId: approval.requestedById,
      title: "Advance Payment Approved",
      message: `Your advance payment approval request of ₹${Number(approval.advanceAmount).toLocaleString()} for ${approval.trackingNumber} (${approval.customerName}) has been Approved by ${approvedByName}.`,
      type: "APPROVAL",
      referenceId: approval.id,
      referenceType: "ADVANCE_PAYMENT",
      ownerAdminId: args.ownerAdminId,
    });
  }

  return updatedApproval;
}

export async function rejectAdvancePayment(args: {
  ownerAdminId: string;
  approvalId: string;
  rejectedByUserId: string;
  rejectionReason: string;
  ipAddress?: string | null;
}) {
  if (!args.rejectionReason?.trim()) {
    throw new Error("Rejection reason is required.");
  }

  const approval = await prisma.advancePaymentApproval.findFirst({
    where: { id: args.approvalId, ownerAdminId: args.ownerAdminId },
  });

  if (!approval) {
    throw new Error("Advance payment approval request not found.");
  }

  if (approval.status === "Approved") {
    throw new Error("Cannot reject an advance payment that has already been approved.");
  }

  const rejecter = await prisma.user.findUnique({
    where: { id: args.rejectedByUserId },
    select: { name: true, email: true },
  });
  const rejectedByName = rejecter?.name?.trim() || rejecter?.email || "Admin";

  const now = new Date();
  const rejectionReason = args.rejectionReason.trim();

  // 1. Update approval request
  const updatedApproval = await prisma.advancePaymentApproval.update({
    where: { id: approval.id },
    data: {
      status: "Rejected",
      rejectedById: args.rejectedByUserId,
      rejectedByName,
      rejectedAt: now,
      rejectionReason,
    },
  });

  // Check remaining pending approvals
  const remainingPendingCount = await prisma.advancePaymentApproval.count({
    where: {
      registrationId: approval.registrationId,
      status: "Pending Approval",
    },
  });

  const approvedSum = await getApprovedAdvanceSum(approval.registrationId);

  // 2. Update registration status flag ONLY (Advance Paid and Balance remain UNCHANGED per Part 7)
  await prisma.registration.update({
    where: { id: approval.registrationId },
    data: {
      advancePaymentStatus:
        remainingPendingCount > 0 ? "Pending Approval" : approvedSum > 0 ? "Approved" : "Rejected",
      advancePaymentRejectedBy: rejectedByName,
      advancePaymentRejectedAt: now,
      advancePaymentRejectionReason: rejectionReason,
      auditTrail: {
        create: {
          action: "Advance Payment Rejected",
          description: `Advance payment request of ₹${Number(approval.advanceAmount).toLocaleString()} was rejected by ${rejectedByName}. Reason: ${rejectionReason}`,
          performedBy: rejectedByName,
        },
      },
    },
  });

  // 3. Log in AdvancePaymentAuditLog (Part 12)
  await prisma.advancePaymentAuditLog.create({
    data: {
      approvalId: approval.id,
      registrationId: approval.registrationId,
      action: "Rejected",
      performedBy: args.rejectedByUserId,
      performedByName: rejectedByName,
      remarks: rejectionReason,
      ipAddress: args.ipAddress || null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  // 4. Notify requester (Part 11)
  if (approval.requestedById) {
    await createNotification({
      userId: approval.requestedById,
      title: "Advance Payment Rejected",
      message: `Your advance payment request of ₹${Number(approval.advanceAmount).toLocaleString()} for ${approval.trackingNumber} (${approval.customerName}) was Rejected. Reason: ${rejectionReason}`,
      type: "APPROVAL",
      referenceId: approval.id,
      referenceType: "ADVANCE_PAYMENT",
      ownerAdminId: args.ownerAdminId,
    });
  }

  return updatedApproval;
}

export async function getAdvancePaymentHistory(ownerAdminId: string, registrationId: string) {
  const items = await prisma.advancePaymentApproval.findMany({
    where: { registrationId, ownerAdminId },
    orderBy: { requestedAt: "desc" },
    include: {
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    registrationId: item.registrationId,
    trackingNumber: item.trackingNumber,
    leadId: item.leadId || "-",
    customerName: item.customerName,
    documentName: item.documentName || "-",
    totalAmount: Number(item.totalAmount),
    advanceAmount: Number(item.advanceAmount),
    remainingBalance: Number(item.remainingBalance),
    currentAdvancePaid: item.currentAdvancePaid ? Number(item.currentAdvancePaid) : 0,
    currentBalance: item.currentBalance ? Number(item.currentBalance) : 0,
    paymentDate: item.paymentDate ? item.paymentDate.toISOString() : item.requestedAt.toISOString(),
    paymentMode: item.paymentMode || "Cash",
    referenceNumber: item.referenceNumber || "-",
    collectedBy: item.collectedBy || item.requestedByName || "-",
    remarks: item.remarks || null,
    proofFileType: item.proofFileType || null,
    receiptFileId: item.receiptFileId || null,
    receiptFileUrl: item.receiptFileUrl || null,
    receiptFileName: item.receiptFileName || null,
    status: item.status,
    requestedBy: item.requestedByName || "-",
    requestedById: item.requestedById,
    requestedDate: item.requestedAt.toISOString(),
    approvedBy: item.approvedByName || null,
    approvedDate: item.approvedAt?.toISOString() || null,
    rejectedBy: item.rejectedByName || null,
    rejectedDate: item.rejectedAt?.toISOString() || null,
    rejectionReason: item.rejectionReason || null,
    auditLogs: item.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      performedBy: log.performedByName || log.performedBy,
      remarks: log.remarks,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    })),
  }));
}

export async function getAdvancePaymentStats(ownerAdminId: string) {
  const [pendingCount, approvedCount, rejectedCount, totalAdvanceAggregate, approvedAdvanceAggregate] =
    await Promise.all([
      prisma.advancePaymentApproval.count({
        where: { ownerAdminId, status: "Pending Approval" },
      }),
      prisma.advancePaymentApproval.count({
        where: { ownerAdminId, status: "Approved" },
      }),
      prisma.advancePaymentApproval.count({
        where: { ownerAdminId, status: "Rejected" },
      }),
      prisma.advancePaymentApproval.aggregate({
        where: { ownerAdminId },
        _sum: { advanceAmount: true },
      }),
      prisma.advancePaymentApproval.aggregate({
        where: { ownerAdminId, status: "Approved" },
        _sum: { advanceAmount: true },
      }),
    ]);

  return {
    pendingAdvanceApprovals: pendingCount,
    approvedAdvances: approvedCount,
    rejectedAdvances: rejectedCount,
    totalAdvanceAmount: Number(totalAdvanceAggregate._sum.advanceAmount ?? 0),
    approvedAdvanceAmount: Number(approvedAdvanceAggregate._sum.advanceAmount ?? 0),
  };
}
