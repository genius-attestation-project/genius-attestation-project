import { prisma } from "@/lib/prisma";
import type { ProcessItem, ProcessStats, ProcessLocation } from "../types/process.types";

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
  tab?: string,
  currentOfficeName?: string
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
    // Scope to documents that were transferred FROM the current process office.
    // The document movement's fromOffice should match the user's office so that
    // only this office's outbound records appear — not records from other offices.
    whereClause.AND = [
      {
        OR: [
          { currentModule: { not: "PROCESS_MODULE" } },
          { status: { in: ["COMPLETED", "OUTBOUND", "SEND_TO_OFFICE", "RETURNED", "REJECTED", "Pending Receive", "INBOUND"] } },
        ],
      },
      {
        // Only show movements whose sending office belongs to this ownerAdminId.
        // The fromOffice relation ensures we only see records originating here.
        OR: [
          {
            fromOffice: {
              ownerAdminId,
              ...(currentOfficeName ? { officeName: currentOfficeName } : {}),
            },
          },
          // Fallback: include bundled documents where bundle was created by this org
          {
            bundle: {
              ownerAdminId,
            },
          },
        ],
      },
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
      bundle: { include: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Older records may predate the receivedAt field being set by the Process
  // receive action. Their latest Process receive history is the authoritative
  // stage-entry time and avoids falling back to the registration date.
  const trackingNumbers = movements.map((movement: any) => movement.trackingNumber);
  const receiveHistory = trackingNumbers.length
    ? await prisma.movementHistory.findMany({
        where: { trackingNumber: { in: trackingNumbers }, action: "Received Document" },
        orderBy: { performedAt: "desc" },
      })
    : [];
  const latestReceivedAt = new Map<string, Date>();
  for (const entry of receiveHistory) {
    if (!latestReceivedAt.has(entry.trackingNumber)) {
      latestReceivedAt.set(entry.trackingNumber, entry.performedAt);
    }
  }

  const mappedMovements = (movements as any[]).map((mov: any) => ({
    id: mov.registrationId,
    registrationId: mov.registrationId,
    trackingNumber: mov.trackingNumber,
    customerName: mov.registration?.customerName || mov.trackingNumber,
    clientName: mov.registration?.customerName || mov.trackingNumber,
    mobile: mov.registration?.mobile || "-",
    documentType: mov.registration?.documentType || "-",
    service: mov.registration?.externalProcess || mov.registration?.processType || "-",
    mainProcess: mov.registration?.processType || "-",
    processType: mov.registration?.processType ?? mov.registration?.documentType ?? "-",
    subPackage: mov.registration?.subPackage || "-",
    registeredOffice: mov.registration?.regionOfRegistration || "-",
    currentOffice: mov.toOffice?.officeName || mov.fromOffice?.officeName || mov.registration?.regionOfRegistration || "Process Office",
    deliveryLocation: mov.registration?.deliveryLocation || "-",
    country: mov.registration?.country || "-",
    totalAmount: mov.registration?.totalCharges ? Number(mov.registration.totalCharges) : 0,
    registeredDate: mov.registration?.createdAt ? formatDate(new Date(mov.registration.createdAt)) : "-",
    currentLocation: (mov.status === "HOME" ? "IN_HAND" : mov.status) as ProcessLocation,
    status: mov.status as any,
    receivedDate: formatDate(new Date(mov.createdAt)),
    currentStageEnteredAt: (
      mov.status === "INBOUND"
        ? mov.sentAt || mov.updatedAt
        : mov.receivedAt || latestReceivedAt.get(mov.trackingNumber) || mov.updatedAt
    ).toISOString(),
    daysHeld: Math.floor((new Date().getTime() - new Date(mov.updatedAt).getTime()) / (1000 * 3600 * 24)),
    assignedUserId: mov.acceptedBy,
    assignedToName: mov.acceptedBy,
    remarks: mov.remarks,
    bundleId: mov.bundleId,
    bundleNumber: mov.bundle?.bundleNumber,
    bundleCode: mov.bundle?.bundleNumber,
    fromOfficeName: mov.fromOffice?.officeName || null,
    toOfficeName: mov.toOffice?.officeName || null,
    priority: mov.registration?.priority || "Normal",
  }));

  // Outbound is bundle-oriented: a transferred bundle must be represented by a
  // single row, with its documents retained as child data for view/retrieve.
  if (tab !== "outbound" && tab !== "bundle") return mappedMovements;

  // Gather all tracking numbers — both from bundle items and direct movements.
  // Select the full registration record so all popup fields (mobile, collectedPerson,
  // advancePaid, balanceAmount, deliveryLocation, etc.) are available.
  const allTrackingNumbers: string[] = Array.from(new Set<string>(
    movements.flatMap((movement: any) =>
      movement.bundle?.items?.map((item: any) => item.trackingNumber as string) || [movement.trackingNumber as string]
    )
  ));

  const registrations = await prisma.registration.findMany({
    where: { trackingNumber: { in: allTrackingNumbers } },
  });
  const registrationByTrackingNumber = new Map(registrations.map((registration) => [registration.trackingNumber, registration]));
  const movementByTrackingNumber = new Map(mappedMovements.map((movement: any) => [movement.trackingNumber, movement]));
  const seenBundles = new Set<string>();

  return mappedMovements.flatMap((movement: any) => {
    if (!movement.bundleId) return [movement];
    if (seenBundles.has(movement.bundleId)) return [];
    seenBundles.add(movement.bundleId);

    const sourceMovement = movements.find((candidate: any) => candidate.bundleId === movement.bundleId);
    const documents = (sourceMovement?.bundle?.items || []).map((item: any) => {
      const documentMovement = movementByTrackingNumber.get(item.trackingNumber);
      return {
        ...(documentMovement || { trackingNumber: item.trackingNumber }),
        registration: registrationByTrackingNumber.get(item.trackingNumber) || null,
      };
    });

    return [{
      ...movement,
      id: `bundle-${movement.bundleId}`,
      items: documents,
      documentCount: documents.length,
    }];
  });
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
    const destOffice = await tx.officeLocation.findFirst({
      where: { id: params.toOfficeId },
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
          oldOffice: sourceOffice?.officeName || null,
          newOffice: destOffice?.officeName || null,
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
    const sourceOffice = await tx.officeLocation.findFirst({
      where: { ownerAdminId: params.ownerAdminId, isProcessOffice: true },
    });
    const targetOffice = await tx.officeLocation.findFirst({
      where: { id: params.targetAssignedOfficeId },
    });
    const fromOfficeId = sourceOffice?.id || params.targetAssignedOfficeId;

    // 1. Identify if selected tracking numbers belong to an existing bundle
    const existingMovement = await tx.documentMovement.findFirst({
      where: {
        trackingNumber: { in: params.trackingNumbers },
        bundleId: { not: null },
      },
      select: { bundleId: true },
    });

    let bundle: any = null;

    if (existingMovement?.bundleId) {
      bundle = await tx.bundle.findUnique({
        where: { id: existingMovement.bundleId },
      });
    }

    // 2. Update existing bundle OR create a new bundle for this transfer
    if (bundle) {
      // Preserve existing bundle! Route it to targetAssignedOfficeId with Pending Receive status
      await tx.bundle.update({
        where: { id: bundle.id },
        data: {
          fromOfficeId,
          toOfficeId: params.targetAssignedOfficeId,
          status: "Pending Receive",
        },
      });

      for (const tNum of params.trackingNumbers) {
        const reg = await tx.registration.findUnique({ where: { trackingNumber: tNum } });
        if (!reg) continue;

        const existingItem = await tx.bundleItem.findFirst({
          where: { bundleId: bundle.id, trackingNumber: tNum },
        });

        if (existingItem) {
          await tx.bundleItem.update({
            where: { id: existingItem.id },
            data: { status: "Pending Receive" },
          });
        } else {
          await tx.bundleItem.create({
            data: {
              bundleId: bundle.id,
              registrationId: reg.id,
              trackingNumber: tNum,
              status: "Pending Receive",
            },
          });
        }
      }
    } else {
      // Create new bundle for unbundled documents
      const count = await tx.bundle.count({ where: { ownerAdminId: params.ownerAdminId } });
      const bundleNumber = `BND-OFFICE-${String(count + 1).padStart(5, "0")}`;

      bundle = await tx.bundle.create({
        data: {
          bundleNumber,
          fromOfficeId,
          toOfficeId: params.targetAssignedOfficeId,
          status: "Pending Receive",
          createdBy: params.userName || params.userId,
          ownerAdminId: params.ownerAdminId,
          items: {
            create: params.trackingNumbers.map((tNum) => ({
              trackingNumber: tNum,
              status: "Pending Receive",
            })),
          },
        },
      });
    }

    // 3. Update documentMovement records for all tracking numbers
    for (const trackingNumber of params.trackingNumbers) {
      const reg = await tx.registration.findUnique({ where: { trackingNumber } });
      if (!reg) continue;

      await tx.documentMovement.updateMany({
        where: { trackingNumber },
        data: {
          fromModule: "PROCESS_MODULE",
          toModule: "ASSIGNED_OFFICE",
          currentModule: "ASSIGNED_OFFICE",
          fromOfficeId,
          toOfficeId: params.targetAssignedOfficeId,
          currentOfficeId: params.targetAssignedOfficeId,
          status: "INBOUND",
          currentStatus: "Pending Receive",
          bundleId: bundle.id,
          sentAt: new Date(),
          remarks: params.remarks,
        } as any,
      });

      if (tx.documentWorkflowHistory) {
        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber,
            workflowStep: "Process Transfer to Assigned Office",
            status: "Pending Receive",
            performedBy: params.userName || params.userId,
            remarks: params.remarks || `Transferred to Assigned Office in Bundle ${bundle.bundleNumber}`,
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
          oldOffice: sourceOffice?.officeName || null,
          newOffice: targetOffice?.officeName || null,
          performedBy: params.userName || params.userId,
          remarks: params.remarks || `Added to Bundle ${bundle.bundleNumber}`,
        },
      });
    }

    return { success: true, count: params.trackingNumbers.length, bundleNumber: bundle.bundleNumber, bundleId: bundle.id };
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
          ...(params.action === "RECEIVE"
            ? { receivedAt: new Date(), receivedBy: params.userId }
            : {}),
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

  const rows = await prisma.movementHistory.findMany({
    where: {
      trackingNumber,
    },
    orderBy: { performedAt: "asc" },
  });

  const historyItems = rows.map((r: any) => ({
    id: r.id,
    action: r.action,
    fromModule: r.oldStatus || "N/A",
    toModule: r.newStatus || "N/A",
    remarks: r.remarks,
    userName: r.performedBy,
    createdAt: r.performedAt,
  }));

  const docInfo = registration
    ? {
        trackingNumber: registration.trackingNumber,
        customerName: registration.customerName,
        mobile: registration.mobile,
        documentType: registration.documentType || "-",
        mainProcess: registration.processType || "-",
        subPackage: registration.subPackage || "-",
        registeredOffice: registration.regionOfRegistration || "-",
        currentOffice: registration.regionOfRegistration || "Process Office",
        currentStatus: registration.trackingStatus || "Registered",
        totalAmount: Number(registration.totalCharges || 0),
        country: registration.country || "-",
        deliveryLocation: registration.deliveryLocation || "-",
        registeredDate: registration.createdAt ? formatDate(new Date(registration.createdAt)) : "-",
        priority: registration.priority || "Normal",
      }
    : null;

  return {
    document: docInfo,
    history: historyItems,
    data: historyItems,
  };
}
