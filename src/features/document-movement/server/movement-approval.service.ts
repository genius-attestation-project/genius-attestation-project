import { prisma } from "@/lib/prisma";

export async function listPendingMovementApprovals(
  param: string | { ownerAdminId: string; officeId?: string; officeName?: string }
) {
  const ownerAdminId = typeof param === "string" ? param : param.ownerAdminId;
  const targetOfficeId = typeof param === "string" ? undefined : param.officeId?.trim();
  const targetOfficeName = typeof param === "string" ? undefined : param.officeName?.trim();

  // Ensure every registration requiring movement approval (advancePaid <= 0 & movementApproved = false)
  // has a corresponding pending MovementApproval record so both Home and Pending Approval use the same source of truth.
  const unapprovedZeroAdvanceRegs = await prisma.registration.findMany({
    where: {
      ownerAdminId,
      advancePaid: { lte: 0 },
      movementApproved: false,
    },
    select: { id: true, trackingNumber: true, createdBy: true },
  });

  for (const reg of unapprovedZeroAdvanceRegs) {
    await createMovementApprovalRequest({
      ownerAdminId,
      registrationId: reg.id,
      performedBy: "System User",
      requestedByUserId: reg.createdBy ?? undefined,
    }).catch((err) => console.error("[listPendingMovementApprovals] Reconcile error:", err));
  }

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
      registrationOffice: item.registrationOffice || reg?.regionOfRegistration || "-",
      currentOffice: currentOfficeName,
      currentOfficeId,
      advanceAmount: Number(item.advanceAmount ?? reg?.advancePaid ?? 0),
      totalAmount: Number(reg?.totalCharges ?? 0),
      status: item.status,
      requestedBy: item.requestedByName || "System User",
      requestedDate: item.requestedDate.toISOString(),
      mobile: reg?.mobile || "-",
    };
  });

  if (targetOfficeId || resolvedTargetOfficeName) {
    return mapped.filter((item) => {
      const matchId = targetOfficeId && item.currentOfficeId && item.currentOfficeId === targetOfficeId;
      const matchName =
        resolvedTargetOfficeName &&
        item.currentOffice &&
        item.currentOffice.toLowerCase() === resolvedTargetOfficeName.toLowerCase();
      return Boolean(matchId || matchName);
    });
  }

  return mapped;
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
        customerName: reg.customerName,
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
