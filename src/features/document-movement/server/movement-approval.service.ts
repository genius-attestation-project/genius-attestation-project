import { prisma } from "@/lib/prisma";

export async function listPendingMovementApprovals(
  param:
    | string
    | {
        ownerAdminId: string;
        officeId?: string;
        officeName?: string;
        isSuperAdmin?: boolean;
        allowedOfficeNames?: string[] | null;
        allowedOfficeIds?: string[] | null;
      }
) {
  const ownerAdminId = typeof param === "string" ? param : param.ownerAdminId;
  const targetOfficeId = typeof param === "string" ? undefined : param.officeId?.trim();
  const targetOfficeName = typeof param === "string" ? undefined : param.officeName?.trim();

  let resolvedTargetOfficeName = targetOfficeName;
  if (!resolvedTargetOfficeName && targetOfficeId) {
    const off = await prisma.officeLocation.findFirst({
      where: { id: targetOfficeId, ownerAdminId },
      select: { officeName: true },
    });
    if (off?.officeName) {
      resolvedTargetOfficeName = off.officeName.trim();
    }
  }

  // Ensure any existing zero-advance unapproved registrations lacking a movement approval record create a pending request
  const unapprovedZeroAdvanceRegs = await prisma.registration.findMany({
    where: {
      ownerAdminId,
      movementApproved: false,
      advancePaid: { lte: 0 },
      trackingStatus: {
        notIn: ["In Transfer", "Transferred", "INBOUND_PENDING", "In Transit", "Ready for Delivery", "Delivered", "Cancelled"],
      },
      movementApprovals: {
        none: {
          status: { in: ["Pending", "Approved", "Rejected"] },
        },
      },
    },
    select: { id: true },
  });

  if (unapprovedZeroAdvanceRegs.length > 0) {
    for (const reg of unapprovedZeroAdvanceRegs) {
      await createMovementApprovalRequest({
        ownerAdminId,
        registrationId: reg.id,
        performedBy: "System User",
      }).catch(() => {});
    }
  }

  const items = await prisma.movementApproval.findMany({
    where: {
      ownerAdminId,
      status: "Pending",
    },
    include: {
      registration: {
        select: {
          id: true,
          trackingNumber: true,
          customerName: true,
          documentName: true,
          documentType: true,
          regionOfRegistration: true,
          advancePaid: true,
          totalCharges: true,
          mobile: true,
          documentMovements: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              currentOffice: true,
            },
          },
        },
      },
    },
    orderBy: { requestedDate: "desc" },
  });

  const mapped = items.map((item) => {
    const reg = item.registration;
    const currentMov = reg?.documentMovements?.[0];
    const currentOfficeName = currentMov?.currentOffice?.officeName || reg?.regionOfRegistration || item.currentOffice || "-";
    const currentOfficeId = currentMov?.currentOfficeId || currentMov?.currentOffice?.id || null;

    return {
      id: item.id,
      registrationId: item.registrationId,
      trackingNumber: item.trackingNumber,
      customerName: item.customerName || reg?.customerName || "-",
      documentName: item.documentName || reg?.documentName || "-",
      documentType: reg?.documentType || "-",
      registrationOffice: item.registrationOffice || reg?.regionOfRegistration || "-",
      currentOffice: currentOfficeName,
      currentOfficeId,
      advanceAmount: Math.max(Number(item.advanceAmount ?? 0), Number(reg?.advancePaid ?? 0)),
      totalAmount: Number(reg?.totalCharges ?? 0),
      status: item.status,
      requestedBy: item.requestedByName || "System User",
      requestedDate: item.requestedDate.toISOString(),
      mobile: reg?.mobile || "-",
    };
  });

  const pendingOnly = mapped.filter((item) => item.advanceAmount <= 0);
  let result = pendingOnly;

  if (typeof param !== "string" && (param.allowedOfficeNames !== undefined || param.isSuperAdmin !== undefined)) {
    if (!param.isSuperAdmin && param.allowedOfficeNames !== null && param.allowedOfficeNames !== undefined) {
      if (param.allowedOfficeNames.length === 0) {
        return [];
      }
      const allowedNames = param.allowedOfficeNames.map((n) => n.toLowerCase());
      const allowedIds = param.allowedOfficeIds || [];
      result = result.filter((item) => {
        const inRegOffice = item.registrationOffice && allowedNames.includes(item.registrationOffice.toLowerCase());
        const inCurOffice = item.currentOffice && allowedNames.includes(item.currentOffice.toLowerCase());
        const inCurOfficeId = item.currentOfficeId && allowedIds.includes(item.currentOfficeId);
        return inRegOffice || inCurOffice || inCurOfficeId;
      });
    }
  }

  if (targetOfficeId || resolvedTargetOfficeName) {
    result = result.filter((item) => {
      const matchId = targetOfficeId && item.currentOfficeId && item.currentOfficeId === targetOfficeId;
      const matchName =
        resolvedTargetOfficeName &&
        item.currentOffice &&
        item.currentOffice.toLowerCase() === resolvedTargetOfficeName.toLowerCase();
      return Boolean(matchId || matchName);
    });
  }

  return result;
}

export async function createMovementApprovalRequest(params: {
  ownerAdminId: string;
  registrationId: string;
  performedBy?: string;
  requestedByUserId?: string;
}) {
  const reg = await prisma.registration.findFirst({
    where: { id: params.registrationId, ownerAdminId: params.ownerAdminId },
    include: {
      documentMovements: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { currentOffice: true },
      },
    },
  });

  if (!reg) return null;

  // Documents with an advance amount > 0 do not require movement approval
  if (Number(reg.advancePaid ?? 0) > 0) {
    return null;
  }

  // Prevent creating duplicate pending movement approvals for the same document
  const existingPending = await prisma.movementApproval.findFirst({
    where: {
      registrationId: reg.id,
      ownerAdminId: params.ownerAdminId,
      status: "Pending",
    },
  });

  if (existingPending) {
    return existingPending;
  }

  const currentOfficeName = reg.documentMovements?.[0]?.currentOffice?.officeName || reg.regionOfRegistration || null;

  return prisma.$transaction(async (tx) => {
    const approval = await tx.movementApproval.create({
      data: {
        registrationId: reg.id,
        trackingNumber: reg.trackingNumber,
        customerName: reg.customerName || null,
        documentName: reg.documentName,
        registrationOffice: reg.regionOfRegistration,
        currentOffice: currentOfficeName,
        advanceAmount: reg.advancePaid,
        status: "Pending",
        requestedById: params.requestedByUserId ?? null,
        requestedByName: params.performedBy ?? "System User",
        requestedDate: new Date(),
        ownerAdminId: params.ownerAdminId,
      },
    });

    await tx.registration.update({
      where: { id: reg.id },
      data: { movementApproved: false },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: reg.trackingNumber,
        action: "Movement Approval Requested",
        oldOffice: currentOfficeName,
        newOffice: currentOfficeName,
        performedBy: params.performedBy ?? "System User",
        remarks: "Advance amount is 0. Movement approval requested automatically.",
      },
    });

    await tx.auditTrail.create({
      data: {
        registrationId: reg.id,
        action: "MOVEMENT_APPROVAL_REQUESTED",
        performedBy: params.performedBy ?? "System User",
        description: "Movement approval requested due to zero advance amount.",
      },
    });

    return approval;
  }, { timeout: 20000 });
}

export async function approveMovementApproval(params: {
  id: string;
  ownerAdminId: string;
  approvedByUserId: string;
  approvedByName?: string;
  remarks?: string;
}) {
  const movApp = await prisma.movementApproval.findFirst({
    where: { id: params.id, ownerAdminId: params.ownerAdminId },
    include: { registration: true },
  });

  if (!movApp) {
    throw new Error("Movement approval request not found.");
  }

  if (movApp.status === "Approved") {
    return movApp;
  }

  const approverName = params.approvedByName || params.approvedByUserId;
  const currentOffice = movApp.currentOffice || movApp.registrationOffice || null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.movementApproval.update({
      where: { id: movApp.id },
      data: {
        status: "Approved",
        approvedById: params.approvedByUserId,
        approvedByName: approverName,
        approvedAt: new Date(),
        remarks: params.remarks ?? "Movement approved",
      },
    });

    await tx.registration.update({
      where: { id: movApp.registrationId },
      data: { movementApproved: true },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movApp.trackingNumber,
        action: "Movement Approved",
        oldOffice: currentOffice,
        newOffice: currentOffice,
        performedBy: approverName,
        remarks: params.remarks || "Movement approval granted",
      },
    });

    await tx.auditTrail.create({
      data: {
        registrationId: movApp.registrationId,
        action: "MOVEMENT_APPROVED",
        performedBy: approverName,
        description: `Movement approval granted by ${approverName}.`,
      },
    });

    return updated;
  }, { timeout: 20000 });
}

export async function rejectMovementApproval(params: {
  id: string;
  ownerAdminId: string;
  rejectedByUserId: string;
  rejectedByName?: string;
  rejectionReason?: string;
}) {
  const movApp = await prisma.movementApproval.findFirst({
    where: { id: params.id, ownerAdminId: params.ownerAdminId },
    include: { registration: true },
  });

  if (!movApp) {
    throw new Error("Movement approval request not found.");
  }

  const rejectorName = params.rejectedByName || params.rejectedByUserId;
  const currentOffice = movApp.currentOffice || movApp.registrationOffice || null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.movementApproval.update({
      where: { id: movApp.id },
      data: {
        status: "Rejected",
        rejectedById: params.rejectedByUserId,
        rejectedByName: rejectorName,
        rejectedAt: new Date(),
        rejectionReason: params.rejectionReason ?? "Movement approval rejected",
      },
    });

    await tx.registration.update({
      where: { id: movApp.registrationId },
      data: { movementApproved: false },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movApp.trackingNumber,
        action: "Movement Rejected",
        oldOffice: currentOffice,
        newOffice: currentOffice,
        performedBy: rejectorName,
        remarks: params.rejectionReason || "Movement approval rejected",
      },
    });

    await tx.auditTrail.create({
      data: {
        registrationId: movApp.registrationId,
        action: "MOVEMENT_REJECTED",
        performedBy: rejectorName,
        description: `Movement approval rejected by ${rejectorName}.`,
      },
    });

    return updated;
  }, { timeout: 20000 });
}

export async function bulkApproveMovementApprovals(params: {
  ids: string[];
  ownerAdminId: string;
  approvedByUserId: string;
  approvedByName?: string;
  remarks?: string;
}) {
  if (!params.ids || !Array.isArray(params.ids) || params.ids.length === 0) {
    throw new Error("No movement approval IDs provided.");
  }

  const approverName = params.approvedByName || params.approvedByUserId;
  const remarks = params.remarks ?? "Movement approved";

  // Revalidate all requested IDs in backend before processing
  const movApps = await prisma.movementApproval.findMany({
    where: {
      id: { in: params.ids },
      ownerAdminId: params.ownerAdminId,
    },
    include: { registration: true },
  });

  if (movApps.length !== params.ids.length) {
    throw new Error("One or more selected movement approval requests were not found or belong to another account.");
  }

  // Verify eligibility for every document (advance amount must be <= 0)
  for (const movApp of movApps) {
    const advancePaid = Math.max(Number(movApp.advanceAmount ?? 0), Number(movApp.registration?.advancePaid ?? 0));
    if (advancePaid > 0) {
      throw new Error(`Document ${movApp.trackingNumber} has an advance payment (> ₹0) and cannot be processed via Movement Approval.`);
    }
  }

  const pendingMovApps = movApps.filter((m) => m.status === "Pending");
  if (pendingMovApps.length === 0) {
    return { count: 0, items: [] };
  }

  return prisma.$transaction(async (tx) => {
    const results = [];
    const now = new Date();

    for (const movApp of pendingMovApps) {
      const currentOffice = movApp.currentOffice || movApp.registrationOffice || null;

      const updated = await tx.movementApproval.update({
        where: { id: movApp.id },
        data: {
          status: "Approved",
          approvedById: params.approvedByUserId,
          approvedByName: approverName,
          approvedAt: now,
          remarks,
        },
      });

      await tx.registration.update({
        where: { id: movApp.registrationId },
        data: { movementApproved: true },
      });

      await tx.movementHistory.create({
        data: {
          trackingNumber: movApp.trackingNumber,
          action: "Movement Approved",
          oldOffice: currentOffice,
          newOffice: currentOffice,
          performedBy: approverName,
          remarks,
        },
      });

      await tx.auditTrail.create({
        data: {
          registrationId: movApp.registrationId,
          action: "MOVEMENT_APPROVED",
          performedBy: approverName,
          description: `Bulk movement approval granted by ${approverName}.`,
        },
      });

      results.push(updated);
    }

    return { count: results.length, items: results };
  }, { timeout: 30000 });
}
