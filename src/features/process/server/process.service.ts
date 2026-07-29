import { prisma } from "@/lib/prisma";
import type { ProcessItem, ProcessStats, ProcessLocation } from "../types/process.types";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function getProcessStats(ownerAdminId: string, officeLocationName: string, processType?: string): Promise<ProcessStats> {
  const baseWhere: any = {
    registration: { ownerAdminId },
  };

  if (processType && processType !== "All") {
    baseWhere.registration.processType = processType;
  }

  const [inHand, inbound, completed, rejected, outbound, total] = await Promise.all([
    prisma.documentMovement.count({
      where: {
        ...baseWhere,
        currentModule: "PROCESS_MODULE",
        status: { in: ["HOME", "IN_HAND", "Received", "Document In Hand"] },
      },
    }),
    prisma.documentMovement.count({
      where: {
        ...baseWhere,
        currentModule: "PROCESS_MODULE",
        status: { in: ["INBOUND", "Pending Receive", "Pending"] },
      },
    }),
    prisma.documentMovement.count({
      where: {
        ...baseWhere,
        currentModule: "PROCESS_MODULE",
        status: "COMPLETED",
      },
    }),
    prisma.documentMovement.count({
      where: {
        ...baseWhere,
        currentModule: "PROCESS_MODULE",
        status: "REJECTED",
      },
    }),
    prisma.documentMovement.count({
      where: {
        ...baseWhere,
        OR: [
          { currentModule: { not: "PROCESS_MODULE" } },
          { status: { in: ["COMPLETED", "OUTBOUND", "SEND_TO_OFFICE", "RETURNED", "REJECTED"] } },
        ],
      },
    }),
    prisma.documentMovement.count({ where: baseWhere }),
  ]);

  return { inbound, inHand, completed, rejected, outbound, total };
}

export async function listProcessAssignments(
  ownerAdminId: string,
  officeLocationName: string,
  processType?: string,
  tab?: string
) {
  const whereClause: any = {
    registration: { ownerAdminId },
  };

  if (processType && processType !== "All") {
    whereClause.registration.processType = processType;
  }

  if (tab === "inbound") {
    whereClause.currentModule = "PROCESS_MODULE";
    whereClause.status = { in: ["INBOUND", "Pending Receive", "Pending"] };
  } else if (tab === "outbound") {
    whereClause.OR = [
      { currentModule: { not: "PROCESS_MODULE" } },
      { status: { in: ["COMPLETED", "OUTBOUND", "SEND_TO_OFFICE", "RETURNED", "REJECTED"] } },
    ];
  } else if (tab === "bundle") {
    whereClause.bundleId = { not: null };
  } else {
    // Default: 'in_hand'
    whereClause.currentModule = "PROCESS_MODULE";
    whereClause.status = { in: ["HOME", "IN_HAND", "Received", "Document In Hand"] };
  }

  const movements = await (prisma as any).documentMovement.findMany({
    where: whereClause,
    include: {
      registration: true,
      fromOffice: true,
      toOffice: true,
      bundle: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (movements as any[]).map((mov: any) => ({
    id: mov.registrationId,
    registrationId: mov.registrationId,
    trackingNumber: mov.trackingNumber,
    clientName: mov.registration?.customerName || mov.trackingNumber,
    processType: mov.registration?.processType ?? mov.registration?.documentType ?? "-",
    currentLocation: (mov.status === "HOME" ? "IN_HAND" : mov.status) as ProcessLocation,
    status: mov.status as any,
    receivedDate: formatDate(new Date(mov.createdAt)),
    daysHeld: Math.floor((new Date().getTime() - new Date(mov.updatedAt).getTime()) / (1000 * 3600 * 24)),
    assignedUserId: mov.acceptedBy,
    assignedToName: mov.acceptedBy,
    remarks: mov.remarks,
    bundleCode: mov.bundle?.bundleNumber,
    fromOfficeName: mov.fromOffice?.officeName || null,
    toOfficeName: mov.toOffice?.officeName || null,
  }));
}

export async function transferProcessDocumentsToHome(params: {
  trackingNumbers: string[];
  toOfficeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
  remarks?: string;
}) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    throw new Error("No documents selected.");
  }
  if (!params.toOfficeId) {
    throw new Error("Destination office is required.");
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bundleNumber = `HOME-PROC-${dateStr}-${randomSuffix}`;

  return prisma.$transaction(async (tx: any) => {
    const sourceOffice = await tx.officeLocation.findFirst({
      where: { ownerAdminId: params.ownerAdminId, isProcessOffice: true },
    });

    const fromOfficeId = sourceOffice?.id || params.toOfficeId;

    let bundle: any = null;
    if (tx.bundle) {
      bundle = await tx.bundle.create({
        data: {
          bundleNumber,
          fromOfficeId,
          toOfficeId: params.toOfficeId,
          status: "Pending Receive",
          createdBy: params.userName || params.userId,
          ownerAdminId: params.ownerAdminId,
        },
      });
    }

    for (const trackingNumber of params.trackingNumbers) {
      const reg = await tx.registration.findUnique({ where: { trackingNumber } });
      if (!reg) continue;

      if (bundle && tx.bundleItem) {
        await tx.bundleItem.create({
          data: {
            bundleId: bundle.id,
            registrationId: reg.id,
            trackingNumber,
            status: "Pending Receive",
          },
        });
      }

      await tx.documentMovement.updateMany({
        where: { trackingNumber },
        data: {
          fromModule: "PROCESS_MODULE",
          toModule: "HOME",
          currentModule: "HOME",
          fromOfficeId,
          toOfficeId: params.toOfficeId,
          currentOfficeId: params.toOfficeId,
          status: "Pending Receive",
          bundleId: bundle ? bundle.id : undefined,
          sentAt: new Date(),
          remarks: params.remarks,
        } as any,
      });

      await tx.registration.update({
        where: { trackingNumber },
        data: {
          trackingStatus: "In Transfer",
          bmStatus: "Transferred",
        },
      });

      if (tx.documentWorkflowHistory) {
        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber,
            workflowStep: "Process Transfer to Home",
            status: "Pending Receive",
            performedBy: params.userName || params.userId,
            remarks: params.remarks || `Transferred to Home in Bundle ${bundleNumber}`,
            ownerAdminId: params.ownerAdminId,
          },
        });
      }

      await tx.movementHistory.create({
        data: {
          trackingNumber,
          action: "Transfer to Home",
          oldStatus: "IN_HAND",
          newStatus: "Pending Receive",
          performedBy: params.userName || params.userId,
          remarks: `Added to Bundle ${bundleNumber}`,
        },
      });
    }

    return { success: true, bundleNumber };
  });
}

export async function transferProcessDocumentsToAssignedOffice(params: {
  trackingNumbers: string[];
  targetAssignedOfficeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
  remarks?: string;
}) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    throw new Error("No documents selected.");
  }
  if (!params.targetAssignedOfficeId) {
    throw new Error("Target Assigned Office is required.");
  }

  return prisma.$transaction(async (tx: any) => {
    for (const trackingNumber of params.trackingNumbers) {
      const reg = await tx.registration.findUnique({ where: { trackingNumber } });
      if (!reg) continue;

      await tx.documentMovement.updateMany({
        where: { trackingNumber },
        data: {
          fromModule: "PROCESS_MODULE",
          toModule: "ASSIGNED_OFFICE",
          currentModule: "ASSIGNED_OFFICE",
          toOfficeId: params.targetAssignedOfficeId,
          currentOfficeId: params.targetAssignedOfficeId,
          status: "Pending Receive",
          sentAt: new Date(),
          remarks: params.remarks,
        },
      });

      if (tx.documentWorkflowHistory) {
        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber,
            workflowStep: "Process Transfer to Assigned Office",
            status: "Pending Receive",
            performedBy: params.userName || params.userId,
            remarks: params.remarks || `Transferred to Assigned Office ID: ${params.targetAssignedOfficeId}`,
            ownerAdminId: params.ownerAdminId,
          },
        });
      }

      await tx.movementHistory.create({
        data: {
          trackingNumber,
          action: "Transfer to Assigned Office",
          oldStatus: "IN_HAND",
          newStatus: "Pending Receive",
          performedBy: params.userName || params.userId,
          remarks: params.remarks,
        },
      });
    }

    return { success: true, count: params.trackingNumbers.length };
  });
}

export async function processBulkMove(params: {
  trackingNumbers: string[];
  action: "COMPLETED" | "REJECTED" | "RECEIVE" | "RETURN";
  userId: string;
  ownerAdminId: string;
  remarks?: string;
  officeLocationName?: string;
}) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    throw new Error("No documents selected.");
  }

  return prisma.$transaction(async (tx: any) => {
    for (const trackingNumber of params.trackingNumbers) {
      const movement = await tx.documentMovement.findFirst({
        where: {
          trackingNumber,
          registration: { ownerAdminId: params.ownerAdminId },
        },
      });

      if (!movement) continue;

      let nextStatus = "";
      if (params.action === "RECEIVE") {
        nextStatus = "IN_HAND";
      } else if (params.action === "RETURN") {
        nextStatus = "RETURNED";
      } else {
        nextStatus = params.action;
      }

      await tx.documentMovement.updateMany({
        where: { trackingNumber },
        data: {
          status: nextStatus,
          currentModule: "PROCESS_MODULE",
          remarks: params.remarks,
          updatedAt: new Date(),
        },
      });

      const actionLabel =
        params.action === "RECEIVE"
          ? "Received Document"
          : params.action === "RETURN"
          ? "Returned Document"
          : `Marked as ${params.action}`;

      await tx.movementHistory.create({
        data: {
          trackingNumber,
          action: actionLabel,
          oldStatus: movement.status,
          newStatus: nextStatus,
          performedBy: params.userId,
          remarks: params.remarks,
        },
      });
    }

    return { success: true, count: params.trackingNumbers.length };
  });
}

export async function moveProcessAssignment(params: {
  assignmentId: string;
  action: "COMPLETED" | "REJECTED" | "SEND_TO_OFFICE" | "RECEIVE" | "RETURN";
  targetOfficeId?: string;
  userId: string;
  ownerAdminId: string;
  remarks?: string;
  officeLocationName?: string;
}) {
  const reg = await prisma.registration.findUnique({
    where: { id: params.assignmentId },
    select: { trackingNumber: true },
  });
  const trackingNumber = reg?.trackingNumber || params.assignmentId;

  if (params.action === "SEND_TO_OFFICE") {
    return transferProcessDocumentsToAssignedOffice({
      trackingNumbers: [trackingNumber],
      targetAssignedOfficeId: params.targetOfficeId!,
      userId: params.userId,
      ownerAdminId: params.ownerAdminId,
      remarks: params.remarks,
    });
  }

  return processBulkMove({
    trackingNumbers: [trackingNumber],
    action: params.action as any,
    userId: params.userId,
    ownerAdminId: params.ownerAdminId,
    remarks: params.remarks,
    officeLocationName: params.officeLocationName,
  });
}

export async function getProcessHistory(trackingNumber: string, ownerAdminId: string) {
  const registration = await prisma.registration.findFirst({
    where: { trackingNumber, ownerAdminId },
  });
  
  if (!registration) return [];

  const rows = await prisma.movementHistory.findMany({
    where: {
      trackingNumber,
    },
    orderBy: { performedAt: "asc" },
  });

  return rows.map((r: any) => ({
    id: r.id,
    action: r.action,
    fromModule: r.oldStatus || "N/A",
    toModule: r.newStatus || "N/A",
    remarks: r.remarks,
    userName: r.performedBy,
    createdAt: r.performedAt,
  }));
}
