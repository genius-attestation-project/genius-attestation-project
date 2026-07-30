import { Prisma } from "@prisma/client";

import { createNotification } from "@/features/notifications/server/notification.service";
import { prisma } from "@/lib/prisma";

export async function submitAdvancePaymentApproval(args: {
  ownerAdminId: string;
  registrationId: string;
  advanceAmount: number;
  receiptFileId?: string | null;
  performedByUserId?: string | null;
  ipAddress?: string | null;
  remarks?: string | null;
}) {
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

  // Determine receipt details
  let receiptFileId = args.receiptFileId ?? null;
  let receiptFileUrl: string | null = null;
  let receiptFileName: string | null = null;

  if (receiptFileId) {
    const storage = await prisma.fileStorage.findUnique({ where: { id: receiptFileId } });
    if (storage) {
      receiptFileUrl = storage.url;
      receiptFileName = storage.originalName;
    }
  } else if (registration.files.length > 0 && registration.files[0].fileStorage) {
    receiptFileId = registration.files[0].fileStorageId;
    receiptFileUrl = registration.files[0].fileStorage.url;
    receiptFileName = registration.files[0].fileStorage.originalName;
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

  const isResubmit = registration.advancePaymentStatus === "Rejected";

  const totalAmount = Number(registration.totalCharges);
  const advanceAmount = Number(args.advanceAmount);
  const remainingBalance = Math.max(0, totalAmount - advanceAmount);

  const existingApproval = await prisma.advancePaymentApproval.findFirst({
    where: { registrationId: registration.id },
    orderBy: { createdAt: "desc" },
  });

  let approval;
  if (existingApproval) {
    approval = await prisma.advancePaymentApproval.update({
      where: { id: existingApproval.id },
      data: {
        trackingNumber: registration.trackingNumber,
        leadId: registration.lead?.leadCode || registration.leadId || null,
        customerName: registration.customerName,
        mobile: registration.mobile,
        office: registration.regionOfRegistration || registration.deliveryLocation || null,
        registeredPerson: registration.registeredPerson || performedByName,
        registeredDate: registration.createdAt,
        totalAmount: new Prisma.Decimal(totalAmount),
        advanceAmount: new Prisma.Decimal(advanceAmount),
        remainingBalance: new Prisma.Decimal(remainingBalance),
        receiptFileId,
        receiptFileUrl,
        receiptFileName,
        status: "Pending Approval",
        requestedById: args.performedByUserId || registration.createdBy,
        requestedByName: performedByName,
        requestedAt: new Date(),
        approvedById: null,
        approvedByName: null,
        approvedAt: null,
        rejectedById: null,
        rejectedByName: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    });
  } else {
    approval = await prisma.advancePaymentApproval.create({
      data: {
        registrationId: registration.id,
        trackingNumber: registration.trackingNumber,
        leadId: registration.lead?.leadCode || registration.leadId || null,
        customerName: registration.customerName,
        mobile: registration.mobile,
        office: registration.regionOfRegistration || registration.deliveryLocation || null,
        registeredPerson: registration.registeredPerson || performedByName,
        registeredDate: registration.createdAt,
        totalAmount: new Prisma.Decimal(totalAmount),
        advanceAmount: new Prisma.Decimal(advanceAmount),
        remainingBalance: new Prisma.Decimal(remainingBalance),
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
  }

  // Update registration advance payment status & amounts
  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      advancePaymentStatus: "Pending Approval",
      advancePaymentRejectionReason: null,
      advancePaid: new Prisma.Decimal(advanceAmount),
      balanceAmount: new Prisma.Decimal(remainingBalance),
      auditTrail: {
        create: {
          action: isResubmit ? "Advance Payment Re-submitted" : "Advance Payment Submitted",
          description: `Advance payment of ₹${advanceAmount.toLocaleString()} submitted for approval by ${performedByName}.`,
          performedBy: performedByName,
        },
      },
    },
  });

  // Log in AdvancePaymentAuditLog
  await prisma.advancePaymentAuditLog.create({
    data: {
      approvalId: approval.id,
      registrationId: registration.id,
      action: isResubmit ? "Re-submitted" : "Submitted",
      performedBy: args.performedByUserId || "System",
      performedByName,
      remarks: args.remarks || (isResubmit ? "Re-submitted advance payment request." : "Initial advance payment submission."),
      ipAddress: args.ipAddress || null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  // Notify Supervisor, Reporting Manager & Super Admin
  const notifyUserIds = new Set<string>();

  if (registration.creator?.supervisorUserId) {
    notifyUserIds.add(registration.creator.supervisorUserId);
  }

  // Find Super Admins & Admins for this ownerAdmin
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
      message: `Advance payment approval of ₹${advanceAmount.toLocaleString()} requested for Registration ${registration.trackingNumber} (${registration.customerName}).`,
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
    page?: number;
    pageSize?: number;
  },
) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(params?.pageSize ?? 50, 100));
  const statusFilter = params?.status?.trim();
  const search = params?.search?.trim();

  const where: Prisma.AdvancePaymentApprovalWhereInput = {
    ownerAdminId,
    ...(statusFilter && statusFilter !== "All" ? { status: statusFilter } : {}),
  };

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search } },
      { customerName: { contains: search } },
      { mobile: { contains: search } },
      { leadId: { contains: search } },
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
      return {
        id: item.id,
        registrationId: item.registrationId,
        trackingNumber: item.trackingNumber,
        registrationNumber: item.trackingNumber,
        leadId: item.leadId || item.registration?.lead?.leadCode || "-",
        customerName: item.customerName,
        mobile: item.mobile,
        office: item.office || item.registration?.regionOfRegistration || "-",
        registeredBy: item.registeredPerson || item.requestedByName || "-",
        registeredDate: item.registeredDate ? item.registeredDate.toISOString() : item.createdAt.toISOString(),
        totalAmount: Number(item.totalAmount),
        advanceAmount: Number(item.advanceAmount),
        remainingBalance: Number(item.remainingBalance),
        receiptFileId: item.receiptFileId || item.registration?.files[0]?.fileStorageId || null,
        receiptFileUrl: item.receiptFileUrl || receiptStorage?.url || null,
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
  const advanceAmount = Number(approval.advanceAmount);
  const totalAmount = Number(approval.totalAmount);
  const remainingBalance = Math.max(0, totalAmount - advanceAmount);

  // Update approval
  const updatedApproval = await prisma.advancePaymentApproval.update({
    where: { id: approval.id },
    data: {
      status: "Approved",
      approvedById: args.approvedByUserId,
      approvedByName,
      approvedAt: now,
    },
  });

  // Update registration officially confirming advance
  await prisma.registration.update({
    where: { id: approval.registrationId },
    data: {
      advancePaid: new Prisma.Decimal(advanceAmount),
      balanceAmount: new Prisma.Decimal(remainingBalance),
      advancePaymentStatus: "Approved",
      advancePaymentApprovedBy: approvedByName,
      advancePaymentApprovedAt: now,
      advancePaymentRejectionReason: null,
      auditTrail: {
        create: {
          action: "Advance Payment Approved",
          description: `Advance payment of ₹${advanceAmount.toLocaleString()} was approved by ${approvedByName}.`,
          performedBy: approvedByName,
        },
      },
    },
  });

  // Log in AdvancePaymentAuditLog
  await prisma.advancePaymentAuditLog.create({
    data: {
      approvalId: approval.id,
      registrationId: approval.registrationId,
      action: "Approved",
      performedBy: args.approvedByUserId,
      performedByName: approvedByName,
      remarks: args.remarks || `Advance payment approved by ${approvedByName}.`,
      ipAddress: args.ipAddress || null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  // Notify requester
  if (approval.requestedById) {
    await createNotification({
      userId: approval.requestedById,
      title: "Advance Payment Approved",
      message: `Your advance payment approval request of ₹${advanceAmount.toLocaleString()} for ${approval.trackingNumber} (${approval.customerName}) has been Approved by ${approvedByName}.`,
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

  const rejecter = await prisma.user.findUnique({
    where: { id: args.rejectedByUserId },
    select: { name: true, email: true },
  });
  const rejectedByName = rejecter?.name?.trim() || rejecter?.email || "Admin";

  const now = new Date();
  const rejectionReason = args.rejectionReason.trim();

  // Update approval
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

  // Update registration (do NOT delete registration or receipt file)
  await prisma.registration.update({
    where: { id: approval.registrationId },
    data: {
      advancePaymentStatus: "Rejected",
      advancePaymentRejectedBy: rejectedByName,
      advancePaymentRejectedAt: now,
      advancePaymentRejectionReason: rejectionReason,
      auditTrail: {
        create: {
          action: "Advance Payment Rejected",
          description: `Advance payment request was rejected by ${rejectedByName}. Reason: ${rejectionReason}`,
          performedBy: rejectedByName,
        },
      },
    },
  });

  // Log in AdvancePaymentAuditLog
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

  // Notify requester
  if (approval.requestedById) {
    await createNotification({
      userId: approval.requestedById,
      title: "Advance Payment Rejected",
      message: `Your advance payment request for ${approval.trackingNumber} (${approval.customerName}) was Rejected. Reason: ${rejectionReason}`,
      type: "APPROVAL",
      referenceId: approval.id,
      referenceType: "ADVANCE_PAYMENT",
      ownerAdminId: args.ownerAdminId,
    });
  }

  return updatedApproval;
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
