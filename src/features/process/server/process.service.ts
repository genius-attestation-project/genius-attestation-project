import { prisma } from "@/lib/prisma";
import type { ProcessItem, ProcessStats, ProcessLocation } from "../types/process.types";

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function buildProcessWhereClause(
  ownerAdminId: string,
  officeLocationName?: string,
  processType?: string,
  tab?: "inhand" | "inbound" | "completed" | "rejected" | "outbound" | "bundle" | "total"
) {
  const where: any = {
    registration: { ownerAdminId },
  };

  if (processType && processType !== "All") {
    where.registration.processType = processType;
  }

  const officeFilter = officeLocationName
    ? [
        { currentOffice: { officeName: officeLocationName } },
        { toOffice: { officeName: officeLocationName } },
      ]
    : null;

  if (tab === "inbound") {
    where.currentModule = "PROCESS_MODULE";
    where.status = { in: ["INBOUND", "Pending Receive", "Pending"] };
    if (officeFilter) {
      where.OR = officeFilter;
    }
  } else if (tab === "inhand") {
    where.currentModule = "PROCESS_MODULE";
    where.status = { in: ["HOME", "IN_HAND", "Received", "Document In Hand"] };
    if (officeFilter) {
      where.OR = officeFilter;
    }
  } else if (tab === "completed") {
    where.currentModule = "PROCESS_MODULE";
    where.status = "COMPLETED";
    if (officeFilter) {
      where.OR = officeFilter;
    }
  } else if (tab === "rejected") {
    where.currentModule = "PROCESS_MODULE";
    where.status = "REJECTED";
    if (officeFilter) {
      where.OR = officeFilter;
    }
  } else if (tab === "outbound") {
    where.fromModule = "PROCESS_MODULE";
    where.status = {
      in: [
        "Pending Receive",
        "INBOUND",
        "OUTBOUND",
        "SEND_TO_OFFICE",
        "INBOUND_PENDING",
        "In Transfer",
        "In Transit",
        "Partially Received",
      ],
    };
    if (officeLocationName) {
      where.OR = [
        { fromOffice: { officeName: officeLocationName } },
        { bundle: { fromOffice: { officeName: officeLocationName } } },
      ];
    }
  } else if (tab === "bundle") {
    where.bundleId = { not: null };
    if (officeFilter) {
      where.OR = officeFilter;
    }
  } else {
    // Total / default
    if (officeFilter) {
      where.OR = officeFilter;
    }
  }

  return where;
}

export async function getProcessStats(ownerAdminId: string, officeLocationName: string, processType?: string): Promise<ProcessStats> {
  const [inHand, inboundMovements, completed, rejected, outboundMovements, total] = await Promise.all([
    prisma.documentMovement.count({
      where: buildProcessWhereClause(ownerAdminId, officeLocationName, processType, "inhand"),
    }),
    prisma.documentMovement.findMany({
      where: buildProcessWhereClause(ownerAdminId, officeLocationName, processType, "inbound"),
      select: { id: true, bundleId: true },
    }),
    prisma.documentMovement.count({
      where: buildProcessWhereClause(ownerAdminId, officeLocationName, processType, "completed"),
    }),
    prisma.documentMovement.count({
      where: buildProcessWhereClause(ownerAdminId, officeLocationName, processType, "rejected"),
    }),
    prisma.documentMovement.findMany({
      where: buildProcessWhereClause(ownerAdminId, officeLocationName, processType, "outbound"),
      select: { id: true, bundleId: true },
    }),
    prisma.documentMovement.count({
      where: buildProcessWhereClause(ownerAdminId, officeLocationName, processType, "total"),
    }),
  ]);

  const seenInbound = new Set<string>();
  let inbound = 0;
  for (const m of inboundMovements) {
    if (m.bundleId) {
      if (!seenInbound.has(m.bundleId)) {
        seenInbound.add(m.bundleId);
        inbound++;
      }
    } else {
      inbound++;
    }
  }

  const seenOutbound = new Set<string>();
  let outbound = 0;
  for (const m of outboundMovements) {
    if (m.bundleId) {
      if (!seenOutbound.has(m.bundleId)) {
        seenOutbound.add(m.bundleId);
        outbound++;
      }
    } else {
      outbound++;
    }
  }

  return { inbound, inHand, completed, rejected, outbound, total };
}

export async function listProcessAssignments(
  ownerAdminId: string,
  officeLocationName: string,
  processType?: string,
  tab?: string,
  currentOfficeName?: string
) {
  const targetOfficeName = currentOfficeName || officeLocationName;
  const rawTab = (tab || "inhand").toLowerCase().replace("_", "");

  let mapTab: "inhand" | "inbound" | "completed" | "rejected" | "outbound" | "bundle" | "total" = "inhand";
  if (rawTab === "inbound") mapTab = "inbound";
  else if (rawTab === "outbound") mapTab = "outbound";
  else if (rawTab === "completed") mapTab = "completed";
  else if (rawTab === "rejected") mapTab = "rejected";
  else if (rawTab === "bundle") mapTab = "bundle";

  const whereClause = buildProcessWhereClause(ownerAdminId, targetOfficeName, processType, mapTab);

  const movements = await (prisma as any).documentMovement.findMany({
    where: whereClause,
    include: {
      registration: true,
      fromOffice: true,
      toOffice: true,
      bundle: {
        include: {
          items: true,
          fromOffice: true,
          toOffice: true,
        },
      },
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
    sentAt: mov.sentAt ? mov.sentAt.toISOString() : (mov.bundle?.createdAt ? mov.bundle.createdAt.toISOString() : null),
    sentDate: mov.sentAt ? mov.sentAt.toISOString() : (mov.bundle?.createdAt ? mov.bundle.createdAt.toISOString() : null),
    receivedAt: mov.receivedAt ? mov.receivedAt.toISOString() : (latestReceivedAt.get(mov.trackingNumber)?.toISOString() || null),
    receivedDate: mov.receivedAt ? mov.receivedAt.toISOString() : (latestReceivedAt.get(mov.trackingNumber)?.toISOString() || null),
    createdAt: mov.createdAt ? mov.createdAt.toISOString() : undefined,
    updatedAt: mov.updatedAt ? mov.updatedAt.toISOString() : undefined,
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
    fromOfficeName: mov.fromOffice?.officeName || mov.bundle?.fromOffice?.officeName || null,
    toOfficeName: mov.toOffice?.officeName || mov.bundle?.toOffice?.officeName || null,
    priority: mov.registration?.priority || "Normal",
  }));

  // Inbound, Outbound, and Bundle tabs are bundle-oriented: a transferred bundle must be represented by a
  // single row, with its documents retained as child data for view/preview/receive/retrieve.
  if (tab !== "outbound" && tab !== "bundle" && tab !== "inbound") return mappedMovements;

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
    const bundleRecord = sourceMovement?.bundle;
    const documents = (bundleRecord?.items || []).map((item: any) => {
      const documentMovement = movementByTrackingNumber.get(item.trackingNumber);
      return {
        ...(documentMovement || { trackingNumber: item.trackingNumber }),
        registration: registrationByTrackingNumber.get(item.trackingNumber) || null,
      };
    });

    const bundleSentAt = movement.sentAt || bundleRecord?.createdAt?.toISOString() || movement.createdAt;
    const bundleReceivedAt = movement.receivedAt || null;

    return [{
      ...movement,
      id: `bundle-${movement.bundleId}`,
      bundleId: movement.bundleId,
      bundleNumber: bundleRecord?.bundleNumber || movement.bundleNumber,
      bundleCode: bundleRecord?.bundleNumber || movement.bundleCode,
      fromOfficeName: bundleRecord?.fromOffice?.officeName || movement.fromOfficeName,
      toOfficeName: bundleRecord?.toOffice?.officeName || movement.toOfficeName,
      sentAt: bundleSentAt,
      sentDate: bundleSentAt,
      receivedAt: bundleReceivedAt,
      receivedDate: bundleReceivedAt,
      createdAt: bundleRecord?.createdAt?.toISOString() || movement.createdAt,
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
  fromOfficeId?: string;
}) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    throw new Error("No documents selected.");
  }
  if (!params.toOfficeId) {
    throw new Error("Destination office is required.");
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bundleNumber = `PROC-${dateStr}-${randomSuffix}`;

  return prisma.$transaction(async (tx: any) => {
    let destOffice = await tx.officeLocation.findFirst({
      where: { id: params.toOfficeId },
    });

    if (!destOffice && tx.assignedOffice) {
      const ao = await tx.assignedOffice.findUnique({ where: { id: params.toOfficeId } });
      if (ao) {
        destOffice = { id: ao.id, officeName: ao.username } as any;
      }
    }

    const destOfficeName = destOffice?.officeName || "";

    const movements = await tx.documentMovement.findMany({
      where: { trackingNumber: { in: params.trackingNumbers } },
      include: { currentOffice: true, fromOffice: true },
    });
    const movementMap = new Map<string, any>(movements.map((m: any) => [m.trackingNumber, m]));

    // Determine primary source office ID from the first movement or params
    const firstMov = movements[0];
    const defaultFromOfficeId = params.fromOfficeId || firstMov?.currentOfficeId || firstMov?.toOfficeId || params.toOfficeId;

    let sourceOffice = await tx.officeLocation.findFirst({
      where: { id: defaultFromOfficeId },
    });

    const bundle = await tx.bundle.create({
      data: {
        bundleNumber,
        fromOfficeId: defaultFromOfficeId,
        toOfficeId: params.toOfficeId,
        status: "Pending Receive",
        createdBy: params.userName || params.userId,
        ownerAdminId: params.ownerAdminId,
      },
    });

    const registrations = await tx.registration.findMany({
      where: { trackingNumber: { in: params.trackingNumbers } },
    });
    const regMap = new Map<string, any>(registrations.map((r: any) => [r.trackingNumber, r]));

    for (const trackingNumber of params.trackingNumbers) {
      const reg: any = regMap.get(trackingNumber);
      if (!reg) continue;

      const docMov = movementMap.get(trackingNumber);
      const docFromOfficeId = docMov?.currentOfficeId || docMov?.toOfficeId || defaultFromOfficeId;

      // Clean up previous inbound bundle at the source office if it exists
      if (docMov?.bundleId) {
        await tx.bundleItem.updateMany({
          where: {
            bundleId: docMov.bundleId,
            trackingNumber,
          },
          data: {
            status: "Transferred",
          },
        });

        const unreceivedCount = await tx.bundleItem.count({
          where: {
            bundleId: docMov.bundleId,
            status: { notIn: ["Received", "Completed", "Transferred"] },
          },
        });

        if (unreceivedCount === 0) {
          await tx.bundle.update({
            where: { id: docMov.bundleId },
            data: { status: "Received" },
          });
        }
      }

      if (tx.bundleItem) {
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
          fromOfficeId: docFromOfficeId,
          toOfficeId: params.toOfficeId,
          currentOfficeId: docFromOfficeId,
          status: "Pending Receive",
          currentStatus: "Pending Receive",
          bundleId: bundle.id,
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
            remarks: params.remarks || `Transferred to Home (${destOfficeName}) in Bundle ${bundleNumber}`,
            ownerAdminId: params.ownerAdminId,
          },
        });
      }

      await tx.movementHistory.create({
        data: {
          trackingNumber,
          action: "Transfer to Home",
          oldStatus: "Document In Hand",
          newStatus: "Pending Receive",
          oldOffice: docMov?.currentOffice?.officeName || sourceOffice?.officeName || "Process Office",
          newOffice: destOfficeName || "Home Office",
          performedBy: params.userName || params.userId,
          remarks: `Added to Bundle ${bundleNumber}`,
        },
      });
    }

    return {
      success: true,
      bundleNumber: bundle.bundleNumber,
      totalTransferred: params.trackingNumbers.length,
    };
  }, { timeout: 20000 });
}

export async function transferProcessDocumentsToAssignedOffice(params: {
  trackingNumbers: string[];
  targetAssignedOfficeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
  remarks?: string;
  fromOfficeId?: string;
}) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    throw new Error("No documents selected.");
  }
  if (!params.targetAssignedOfficeId) {
    throw new Error("Target Assigned Office is required.");
  }

  return prisma.$transaction(async (tx: any) => {
    let targetOffice = await tx.officeLocation.findFirst({
      where: { id: params.targetAssignedOfficeId },
    });

    if (!targetOffice) {
      const ao = await tx.assignedOffice.findUnique({
        where: { id: params.targetAssignedOfficeId },
      });
      if (ao) {
        targetOffice = await tx.officeLocation.findFirst({
          where: { officeName: ao.username, ownerAdminId: params.ownerAdminId },
        });
        if (!targetOffice) {
          targetOffice = await tx.officeLocation.create({
            data: {
              id: params.targetAssignedOfficeId,
              officeName: ao.username,
              location: "External Processing Office",
              timezone: "UTC",
              isProcessOffice: true,
              ownerAdminId: params.ownerAdminId,
            },
          });
        }
      }
    }

    const targetOfficeId = targetOffice?.id || params.targetAssignedOfficeId;

    const movements = await tx.documentMovement.findMany({
      where: { trackingNumber: { in: params.trackingNumbers } },
      include: { currentOffice: true, fromOffice: true },
    });
    const movementMap = new Map<string, any>(movements.map((m: any) => [m.trackingNumber, m]));

    const firstMov = movements[0];
    const defaultFromOfficeId = params.fromOfficeId || firstMov?.currentOfficeId || firstMov?.toOfficeId || targetOfficeId;

    let sourceOffice = await tx.officeLocation.findFirst({
      where: { id: defaultFromOfficeId },
    });

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
      // Preserve existing bundle! Route it to targetOfficeId with Pending Receive status
      await tx.bundle.update({
        where: { id: bundle.id },
        data: {
          fromOfficeId: defaultFromOfficeId,
          toOfficeId: targetOfficeId,
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
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bundleNumber = `PROC-AO-${dateStr}-${randomSuffix}`;

      bundle = await tx.bundle.create({
        data: {
          bundleNumber,
          fromOfficeId: defaultFromOfficeId,
          toOfficeId: targetOfficeId,
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

      const docMov = movementMap.get(trackingNumber);
      const docSenderOfficeId = docMov?.currentOfficeId || docMov?.toOfficeId || defaultFromOfficeId;

      await tx.documentMovement.updateMany({
        where: { trackingNumber },
        data: {
          fromModule: "PROCESS_MODULE",
          toModule: "ASSIGNED_OFFICE",
          currentModule: "ASSIGNED_OFFICE",
          fromOfficeId: docSenderOfficeId,
          toOfficeId: targetOfficeId,
          currentOfficeId: docSenderOfficeId,
          originalProcessOfficeId: docSenderOfficeId,
          returnOfficeId: docSenderOfficeId,
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
          oldOffice: docMov?.currentOffice?.officeName || sourceOffice?.officeName || "Process Office",
          newOffice: targetOffice?.officeName || "Assigned Office",
          performedBy: params.userName || params.userId,
          remarks: params.remarks || `Added to Bundle ${bundle.bundleNumber}`,
        },
      });
    }

    return { success: true, count: params.trackingNumbers.length, bundleNumber: bundle.bundleNumber, bundleId: bundle.id };
  }, { maxWait: 20000, timeout: 60000 });
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
          currentStatus: params.action === "RECEIVE" ? "Document In Hand" : nextStatus,
          remarks: params.remarks,
          updatedAt: new Date(),
          ...(params.action === "RECEIVE"
            ? { receivedAt: new Date(), receivedBy: params.userId }
            : {}),
        },
      });

      if (params.action === "RECEIVE") {
        await tx.registration.update({
          where: { trackingNumber },
          data: {
            trackingStatus: "Document In Hand",
            bmStatus: "Received",
          },
        });

        if (movement.bundleId) {
          await tx.bundleItem.updateMany({
            where: {
              bundleId: movement.bundleId,
              trackingNumber,
            },
            data: {
              status: "Received",
              receivedAt: new Date(),
              receivedBy: params.userId,
            },
          });

          const unreceivedCount = await tx.bundleItem.count({
            where: {
              bundleId: movement.bundleId,
              status: { notIn: ["Received", "Completed", "Transferred"] },
            },
          });

          if (unreceivedCount === 0) {
            await tx.bundle.update({
              where: { id: movement.bundleId },
              data: { status: "Received" },
            });
          } else {
            await tx.bundle.update({
              where: { id: movement.bundleId },
              data: { status: "Partially Received" },
            });
          }
        }
      }

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
  }, { maxWait: 20000, timeout: 60000 });
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
