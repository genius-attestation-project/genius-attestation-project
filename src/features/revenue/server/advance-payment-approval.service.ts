import { Prisma } from "@prisma/client";

import { createNotification } from "@/features/notifications/server/notification.service";
import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";
import { recalculateRunningBalances } from "@/features/revenue/server/running-balance.service";
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

  const targetId = (args.registrationId || "").trim();
  if (!targetId) {
    throw new Error("Registration ID is required.");
  }

  const registration = await prisma.registration.findFirst({
    where: {
      ownerAdminId: args.ownerAdminId,
      OR: [
        { id: targetId },
        { trackingNumber: targetId },
      ],
    },
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
    throw new Error(`Registration not found for ID or tracking number "${targetId}".`);
  }

  // Calculate current approved advance total and current remaining balance
  const currentApprovedAdvance = await getApprovedAdvanceSum(registration.id);
  const totalAmount = Number(registration.totalCharges);
  const currentBalance = Math.max(0, totalAmount - currentApprovedAdvance);

  if (totalAmount > 0 && advanceAmount > currentBalance) {
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

      // Link fileStorage to registration files if not already linked
      const existingRef = await prisma.registrationFile.findFirst({
        where: { registrationId: registration.id, fileStorageId: storage.id },
      });
      if (!existingRef) {
        await prisma.registrationFile.create({
          data: {
            registrationId: registration.id,
            fileStorageId: storage.id,
            fileCategory: "ADVANCE_PAYMENT",
          },
        }).catch(() => null);
      }
    }
  } else if (registration.files.length > 0 && registration.files[0].fileStorage) {
    receiptFileId = registration.files[0].fileStorageId;
    receiptFileUrl = `/api/files/${registration.files[0].fileStorage.id}/view`;
    receiptFileName = registration.files[0].fileStorage.originalName;
  }

  // Proof file is optional on initial submission; proof can be attached during file upload or approval.

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

  // ALWAYS create a NEW AdvancePaymentApproval request entry
  const approval = await prisma.advancePaymentApproval.create({
    data: {
      registrationId: registration.id,
      trackingNumber: registration.trackingNumber,
      leadId: registration.lead?.leadCode || registration.leadId || null,
      customerName: registration.customerName || null,
      mobile: registration.mobile || null,
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

  // Update registration advance payment status flag ONLY
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

  // Log in AdvancePaymentAuditLog
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

  // Notify approvers
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
      message: `Advance payment approval request of ₹${advanceAmount.toLocaleString()} submitted for Registration ${registration.trackingNumber}${registration.customerName ? ` (${registration.customerName})` : ""}.`,
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
    office?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    registrationId?: string;
    page?: number;
    pageSize?: number;
    isSuperAdmin?: boolean;
    allowedOfficeNames?: string[] | null;
    allowedOfficeIds?: string[] | null;
  },
) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(params?.pageSize ?? 50, 200));
  const statusFilter = params?.status?.trim();
  const officeFilter = params?.office?.trim();
  const fromDate = params?.fromDate?.trim();
  const toDate = params?.toDate?.trim();
  const search = params?.search?.trim();
  const registrationId = params?.registrationId?.trim();

  const where: Prisma.AdvancePaymentApprovalWhereInput = {
    ownerAdminId,
    ...(registrationId ? { registrationId } : {}),
    ...(statusFilter && statusFilter !== "All" ? { status: statusFilter } : {}),
    ...(officeFilter && officeFilter !== "All" ? { office: { equals: officeFilter } } : {}),
  };

  // Enforce office visibility access
  if (params?.allowedOfficeNames !== undefined || params?.isSuperAdmin !== undefined) {
    if (!params?.isSuperAdmin && params?.allowedOfficeNames !== null && params?.allowedOfficeNames !== undefined) {
      if (params.allowedOfficeNames.length === 0) {
        where.id = "none";
      } else {
        where.office = { in: params.allowedOfficeNames };
        if (officeFilter && officeFilter !== "All") {
          if (!params.allowedOfficeNames.includes(officeFilter)) {
            where.id = "none";
          }
        }
      }
    }
  }

  if (fromDate || toDate) {
    where.requestedAt = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
    };
  }

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
        approvalRemarks: (item as any).approvalRemarks || null,
        proofFileType: item.proofFileType || null,
        receiptFileId,
        receiptFileUrl,
        receiptFileName: item.receiptFileName || receiptStorage?.originalName || null,
        bankProofFileId: (item as any).bankProofFileId || null,
        bankProofFileUrl: (item as any).bankProofFileUrl || null,
        bankProofFileName: (item as any).bankProofFileName || null,
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
  bankProofFileId: string;
  approvalDate?: string | Date | null;
  remarks: string;
  ipAddress?: string | null;
}) {
  if (!args.bankProofFileId?.trim()) {
    throw new Error("Please provide Bank Proof, Date and Remarks before approving this advance payment.");
  }

  if (!args.remarks?.trim()) {
    throw new Error("Please provide Bank Proof, Date and Remarks before approving this advance payment.");
  }

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

  const approvalDate = args.approvalDate ? new Date(args.approvalDate) : new Date();

  // Resolve Bank Proof details
  let bankProofFileUrl: string | null = null;
  let bankProofFileName: string | null = null;

  const storage = await prisma.fileStorage.findUnique({ where: { id: args.bankProofFileId.trim() } });
  if (storage) {
    bankProofFileUrl = `/api/files/${storage.id}/view`;
    bankProofFileName = storage.originalName;

    await prisma.registrationFile.create({
      data: {
        registrationId: approval.registrationId,
        fileStorageId: storage.id,
        fileCategory: "BANK_PROOF",
      },
    }).catch(() => null);
  }

  // 1. Mark approval as Approved with Bank Proof & Remarks
  const updatedApproval = await prisma.advancePaymentApproval.update({
    where: { id: approval.id },
    data: {
      status: "Approved",
      approvedById: args.approvedByUserId,
      approvedByName,
      approvedAt: approvalDate,
      bankProofFileId: args.bankProofFileId.trim(),
      bankProofFileUrl,
      bankProofFileName,
      approvalRemarks: args.remarks.trim(),
      remarks: args.remarks.trim(),
    } as any,
  });

  // 2. Recalculate sum of ALL Approved advance payments for registration
  const newTotalApprovedAdvance = await getApprovedAdvanceSum(approval.registrationId);

  const reg = await prisma.registration.findUnique({
    where: { id: approval.registrationId },
    select: { totalCharges: true, approvalStatus: true, deliveryType: true, deliveryStatus: true, trackingStatus: true },
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

  const shouldAutoDeliver = newBalanceAmount === 0 && Boolean(reg?.deliveryType || reg?.deliveryStatus);

  // 3. Update registration officially confirming advance & new balance
  await prisma.registration.update({
    where: { id: approval.registrationId },
    data: {
      advancePaid: new Prisma.Decimal(newTotalApprovedAdvance),
      balanceAmount: new Prisma.Decimal(newBalanceAmount),
      paymentStatus: newPaymentStatus,
      advancePaymentStatus: remainingPendingCount > 0 ? "Pending Approval" : "Approved",
      advancePaymentApprovedBy: approvedByName,
      advancePaymentApprovedAt: approvalDate,
      advancePaymentRejectionReason: null,
      ...(shouldAutoDeliver
        ? {
          trackingStatus: "Delivered",
          deliveryStatus: "Delivered",
          bmStatus: "Delivered",
        }
        : {}),
      auditTrail: {
        create: [
          {
            action: "Advance Payment Approved",
            description: `Advance payment request of ₹${Number(approval.advanceAmount).toLocaleString()} was approved by ${approvedByName}. Total Advance Paid is now ₹${newTotalApprovedAdvance.toLocaleString()}, Balance: ₹${newBalanceAmount.toLocaleString()}. Remarks: ${args.remarks.trim()}`,
            performedBy: approvedByName,
          },
          ...(shouldAutoDeliver
            ? [
              {
                action: "DELIVERED",
                description: `Document status automatically updated to Delivered after advance payment approval (Balance = 0).`,
                performedBy: approvedByName,
              },
            ]
            : []),
        ],
      },
    },
  });

  // 4. Create or update AccountStatementEntry credit entry for financial ledger
  const existingEntry = await prisma.accountStatementEntry.findFirst({
    where: {
      ownerAdminId: args.ownerAdminId,
      sourceType: "AdvancePaymentApproval",
      sourceId: approval.id,
      reversedAt: null,
    },
  });

  if (existingEntry) {
    await prisma.accountStatementEntry.update({
      where: { id: existingEntry.id },
      data: {
        date: approvalDate,
        credit: approval.advanceAmount,
        particulars: `Advance Payment - ${approval.trackingNumber}`,
      },
    });
  } else {
    await prisma.accountStatementEntry.create({
      data: {
        date: approvalDate,
        trackingNumber: approval.trackingNumber,
        particulars: `Advance Payment - ${approval.trackingNumber}`,
        entryType: "Credit",
        credit: approval.advanceAmount,
        debit: new Prisma.Decimal(0),
        sourceType: "AdvancePaymentApproval",
        sourceId: approval.id,
        registrationId: approval.registrationId,
        ownerAdminId: args.ownerAdminId,
        createdBy: approvedByName,
      },
    });
  }

  // Recalculate running balance in ledger
  await recalculateRunningBalances(args.ownerAdminId);

  // 5. Log in AdvancePaymentAuditLog
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

  // 6. Notify requester
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

  // 2. Update registration status flag ONLY
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

  // 3. Log in AdvancePaymentAuditLog
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

  // 4. Notify requester
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

export async function updateAdvancePaymentApproval(args: {
  ownerAdminId: string;
  approvalId: string;
  performedByUserId: string;
  advanceAmount?: number;
  paymentDate?: string | Date;
  paymentMode?: string;
  referenceNumber?: string | null;
  collectedBy?: string | null;
  remarks?: string | null;
  bankProofFileId?: string | null;
  ipAddress?: string | null;
}) {
  const approval = await prisma.advancePaymentApproval.findFirst({
    where: { id: args.approvalId, ownerAdminId: args.ownerAdminId },
    include: { registration: true },
  });

  if (!approval) {
    throw new Error("Advance payment approval request not found.");
  }

  const user = await prisma.user.findUnique({
    where: { id: args.performedByUserId },
    select: { name: true, email: true },
  });
  const performedByName = user?.name?.trim() || user?.email || "Admin";

  const totalCharges = Number(approval.registration?.totalCharges ?? approval.totalAmount);

  let newAdvanceAmount = Number(approval.advanceAmount);
  if (args.advanceAmount !== undefined) {
    const parsedAmount = Number(args.advanceAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Advance amount must be greater than zero.");
    }

    // Check remaining allowed capacity
    const otherApprovedSum = await prisma.advancePaymentApproval.aggregate({
      where: {
        registrationId: approval.registrationId,
        status: "Approved",
        id: { not: approval.id },
      },
      _sum: { advanceAmount: true },
    });
    const otherApproved = Number(otherApprovedSum._sum.advanceAmount ?? 0);
    const maxAllowed = Math.max(0, totalCharges - otherApproved);

    if (parsedAmount > maxAllowed) {
      throw new Error(`Advance amount (₹${parsedAmount.toLocaleString()}) cannot exceed remaining balance (₹${maxAllowed.toLocaleString()}).`);
    }
    newAdvanceAmount = parsedAmount;
  }

  const updatedPaymentDate = args.paymentDate ? new Date(args.paymentDate) : approval.paymentDate;

  // Process Bank Proof File if updated
  let bankProofFileUrl = (approval as any).bankProofFileUrl;
  let bankProofFileName = (approval as any).bankProofFileName;
  let bankProofFileId = (approval as any).bankProofFileId;

  if (args.bankProofFileId !== undefined) {
    if (args.bankProofFileId) {
      const fileStorage = await prisma.fileStorage.findUnique({
        where: { id: args.bankProofFileId },
      });
      if (fileStorage) {
        bankProofFileId = fileStorage.id;
        bankProofFileUrl = (fileStorage as any).fileUrl || `/api/files/${fileStorage.id}/view`;
        bankProofFileName = fileStorage.originalName || (fileStorage as any).fileName || "Company Bank Proof";
      }
    } else {
      bankProofFileId = null;
      bankProofFileUrl = null;
      bankProofFileName = null;
    }
  }

  // Update approval record
  const updated = await prisma.advancePaymentApproval.update({
    where: { id: approval.id },
    data: {
      advanceAmount: new Prisma.Decimal(newAdvanceAmount),
      paymentDate: updatedPaymentDate,
      paymentMode: args.paymentMode !== undefined ? args.paymentMode.trim() : approval.paymentMode,
      referenceNumber: args.referenceNumber !== undefined ? (args.referenceNumber?.trim() || null) : approval.referenceNumber,
      collectedBy: args.collectedBy !== undefined ? (args.collectedBy?.trim() || null) : approval.collectedBy,
      remarks: args.remarks !== undefined ? (args.remarks?.trim() || null) : approval.remarks,
      bankProofFileId,
      bankProofFileUrl,
      bankProofFileName,
    },
  });

  // Synchronize across dependent financial records if already Approved
  if (approval.status === "Approved") {
    const newTotalApprovedAdvance = await getApprovedAdvanceSum(approval.registrationId);
    const newBalanceAmount = Math.max(0, totalCharges - newTotalApprovedAdvance);

    const newPaymentStatus = calculatePaymentStatus({
      approvalStatus: approval.registration?.approvalStatus || "Pending",
      advancePaymentStatus: "Approved",
      totalCharges,
      advancePaid: newTotalApprovedAdvance,
      balanceAmount: newBalanceAmount,
    });

    await prisma.registration.update({
      where: { id: approval.registrationId },
      data: {
        advancePaid: new Prisma.Decimal(newTotalApprovedAdvance),
        balanceAmount: new Prisma.Decimal(newBalanceAmount),
        paymentStatus: newPaymentStatus,
        auditTrail: {
          create: {
            action: "Advance Payment Updated",
            description: `Advance payment (${approval.trackingNumber}) updated to ₹${newAdvanceAmount.toLocaleString()} by ${performedByName}. Total Advance: ₹${newTotalApprovedAdvance.toLocaleString()}, Balance: ₹${newBalanceAmount.toLocaleString()}.`,
            performedBy: performedByName,
          },
        },
      },
    });

    // Update AccountStatementEntry
    const existingEntry = await prisma.accountStatementEntry.findFirst({
      where: {
        ownerAdminId: args.ownerAdminId,
        sourceType: "AdvancePaymentApproval",
        sourceId: approval.id,
        reversedAt: null,
      },
    });

    if (existingEntry) {
      await prisma.accountStatementEntry.update({
        where: { id: existingEntry.id },
        data: {
          credit: new Prisma.Decimal(newAdvanceAmount),
          date: updatedPaymentDate || existingEntry.date,
        },
      });
      await recalculateRunningBalances(args.ownerAdminId);
    }
  }

  // Audit log
  await prisma.advancePaymentAuditLog.create({
    data: {
      approvalId: approval.id,
      registrationId: approval.registrationId,
      action: "Updated",
      performedBy: args.performedByUserId,
      performedByName,
      remarks: `Updated advance payment details. New amount: ₹${newAdvanceAmount.toLocaleString()}.`,
      ipAddress: args.ipAddress || null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  return updated;
}

export async function deleteAdvancePaymentApproval(args: {
  ownerAdminId: string;
  approvalId: string;
  performedByUserId: string;
  ipAddress?: string | null;
}) {
  const approval = await prisma.advancePaymentApproval.findFirst({
    where: { id: args.approvalId, ownerAdminId: args.ownerAdminId },
    include: { registration: true },
  });

  if (!approval) {
    throw new Error("Advance payment approval request not found.");
  }

  const user = await prisma.user.findUnique({
    where: { id: args.performedByUserId },
    select: { name: true, email: true },
  });
  const performedByName = user?.name?.trim() || user?.email || "Admin";

  const registrationId = approval.registrationId;
  const wasApproved = approval.status === "Approved";

  // Delete approval record
  await prisma.advancePaymentApproval.delete({
    where: { id: approval.id },
  });

  // Recalculate totals
  const newTotalApprovedAdvance = await getApprovedAdvanceSum(registrationId);
  const totalCharges = Number(approval.registration?.totalCharges ?? approval.totalAmount);
  const newBalanceAmount = Math.max(0, totalCharges - newTotalApprovedAdvance);

  const remainingPendingCount = await prisma.advancePaymentApproval.count({
    where: { registrationId, status: "Pending Approval" },
  });

  let newAdvancePaymentStatus = "None";
  if (remainingPendingCount > 0) {
    newAdvancePaymentStatus = "Pending Approval";
  } else if (newTotalApprovedAdvance > 0) {
    newAdvancePaymentStatus = "Approved";
  }

  const newPaymentStatus = calculatePaymentStatus({
    approvalStatus: approval.registration?.approvalStatus || "Pending",
    advancePaymentStatus: newAdvancePaymentStatus,
    totalCharges,
    advancePaid: newTotalApprovedAdvance,
    balanceAmount: newBalanceAmount,
  });

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      advancePaid: new Prisma.Decimal(newTotalApprovedAdvance),
      balanceAmount: new Prisma.Decimal(newBalanceAmount),
      paymentStatus: newPaymentStatus,
      advancePaymentStatus: newAdvancePaymentStatus,
      auditTrail: {
        create: {
          action: "Advance Payment Deleted",
          description: `Advance payment request of ₹${Number(approval.advanceAmount).toLocaleString()} was deleted by ${performedByName}. Remaining Advance: ₹${newTotalApprovedAdvance.toLocaleString()}, Balance: ₹${newBalanceAmount.toLocaleString()}.`,
          performedBy: performedByName,
        },
      },
    },
  });

  if (wasApproved) {
    const existingEntry = await prisma.accountStatementEntry.findFirst({
      where: {
        ownerAdminId: args.ownerAdminId,
        sourceType: "AdvancePaymentApproval",
        sourceId: approval.id,
      },
    });

    if (existingEntry) {
      await prisma.accountStatementEntry.delete({
        where: { id: existingEntry.id },
      });
      await recalculateRunningBalances(args.ownerAdminId);
    }
  }

  return { success: true };
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
    approvalRemarks: (item as any).approvalRemarks || null,
    proofFileType: item.proofFileType || null,
    receiptFileId: item.receiptFileId || null,
    receiptFileUrl: item.receiptFileUrl || null,
    receiptFileName: item.receiptFileName || null,
    bankProofFileId: (item as any).bankProofFileId || null,
    bankProofFileUrl: (item as any).bankProofFileUrl || null,
    bankProofFileName: (item as any).bankProofFileName || null,
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
