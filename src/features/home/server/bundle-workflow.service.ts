import { prisma } from "@/lib/prisma";
import { verifyCoreSubProcessCompleted } from "@/features/process/server/core-subprocess-validation";

import crypto from "crypto";

export function generateBundleNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `HOME-${dateStr}-${randomSuffix}-${randomHex}`;
}

export async function listDocumentInHand(params: {
  ownerAdminId: string;
  officeId?: string;
  search?: string;
}) {
  const whereClause: any = {
    ownerAdminId: params.ownerAdminId,
  };

  if (params.search && params.search.trim() !== "") {
    const s = params.search.trim();
    whereClause.OR = [
      { trackingNumber: { contains: s } },
      { customerName: { contains: s } },
      { documentType: { contains: s } },
      { processType: { contains: s } },
    ];
  }

  let officeName: string | undefined = undefined;
  if (params.officeId) {
    const office = await prisma.officeLocation.findFirst({
      where: {
        OR: [{ id: params.officeId }, { officeName: params.officeId }],
      },
      select: { officeName: true, id: true },
    });
    if (office) {
      officeName = office.officeName;
    }
  }

  const officeNamesToMatch = params.officeId ? [params.officeId] : [];
  if (officeName && !officeNamesToMatch.includes(officeName)) {
    officeNamesToMatch.push(officeName);
  }

  const officeMatchConditions: any[] = [];
  if (params.officeId) {
    officeMatchConditions.push(
      {
        documentMovements: {
          some: {
            OR: [
              { currentOfficeId: params.officeId },
              ...(officeName ? [{ currentOffice: { officeName } }] : []),
            ],
            status: { in: ["Received", "Document In Hand", "HOME", "Completed"] },
          },
        },
      },
      {
        regionOfRegistration: { in: officeNamesToMatch },
        documentMovements: { none: {} },
      }
    );
  }

  const registrations = await prisma.registration.findMany({
    where: {
      ...whereClause,
      trackingStatus: {
        notIn: ["In Transfer", "Transferred", "INBOUND_PENDING", "In Transit", "Ready for Delivery", "Delivered"],
      },
      ...(officeMatchConditions.length > 0 ? { OR: officeMatchConditions } : {}),
    },
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          fromOffice: true,
          toOffice: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      movementApprovals: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return registrations.map((reg) => {
    const mov = reg.documentMovements?.[0];
    
    const advancePaid = Number(reg.advancePaid ?? 0);
    const hasAdvanceAmount = !isNaN(advancePaid) && advancePaid > 0;

    const latestApproval = reg.movementApprovals?.[0];
    const isApproved = Boolean(reg.movementApproved || latestApproval?.status === "Approved");
    const isPending = !hasAdvanceAmount && !isApproved && (latestApproval?.status === "Pending" || !latestApproval);

    const hasMovementApprovalPending = isPending;
    const canTransfer = hasAdvanceAmount || isApproved;

    // Classification based on actual movement state:
    // A document is REGISTERED if it is at its initial registration state (no bundle receipt, no transfer from another office).
    // If it arrived through an Inbound Bundle / transfer (has fromOfficeId, receivedAt, bundleId, or movementType not INITIAL),
    // it belongs to the RECEIVED category.
    const isReceivedFromInbound = Boolean(
      mov && (mov.bundleId || mov.fromOfficeId || mov.receivedAt || (mov.movementType && mov.movementType !== "INITIAL"))
    );

    const inHandCategory: "REGISTERED" | "RECEIVED" = isReceivedFromInbound ? "RECEIVED" : "REGISTERED";

    return {
      ...reg,
      inHandCategory,
      hasMovementApprovalPending,
      canTransfer,
    };
  });
}

export async function createTransferBundle(params: {
  trackingNumbers: string[];
  fromOfficeId: string;
  toOfficeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
  remarks?: string;
}) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    throw new Error("At least one tracking number must be selected for transfer.");
  }

  // Validate that none of the documents require movement approval that is pending or unapproved
  for (const trackingNumber of params.trackingNumbers) {
    const reg = await prisma.registration.findFirst({
      where: {
        trackingNumber,
        ownerAdminId: params.ownerAdminId,
      },
      select: {
        id: true,
        trackingNumber: true,
        advancePaid: true,
        movementApproved: true,
        movementApprovals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!reg) {
      throw new Error(`Registration with tracking number ${trackingNumber} not found.`);
    }

    const advancePaid = Number(reg.advancePaid ?? 0);
    const hasAdvanceAmount = !isNaN(advancePaid) && advancePaid > 0;
    const latestApproval = reg.movementApprovals?.[0];
    const isApproved = Boolean(reg.movementApproved || latestApproval?.status === "Approved");

    const canTransfer = hasAdvanceAmount || isApproved;

    if (!canTransfer) {
      throw new Error(`Movement approval is pending for document ${trackingNumber}. Please approve or reject before transferring.`);
    }
  }

  const bundleNumber = generateBundleNumber();

  return prisma.$transaction(async (tx: any) => {
    let fromLocation = await tx.officeLocation.findFirst({ where: { id: params.fromOfficeId } });
    if (!fromLocation) {
      const ao = await tx.assignedOffice.findUnique({ where: { id: params.fromOfficeId } });
      fromLocation = await tx.officeLocation.create({
        data: {
          id: params.fromOfficeId,
          officeName: ao?.username || "Source Office",
          location: "Office",
          timezone: "UTC",
          ownerAdminId: params.ownerAdminId,
        },
      });
    }

    let toLocation = await tx.officeLocation.findFirst({ where: { id: params.toOfficeId } });
    if (!toLocation) {
      const ao = await tx.assignedOffice.findUnique({ where: { id: params.toOfficeId } });
      toLocation = await tx.officeLocation.create({
        data: {
          id: params.toOfficeId,
          officeName: ao?.username || "External Office",
          location: "External Processing Office",
          timezone: "UTC",
          isProcessOffice: true,
          ownerAdminId: params.ownerAdminId,
        },
      });
    }

    const isTargetAssignedOffice = params.toOfficeId
      ? await tx.assignedOffice.findUnique({ where: { id: params.toOfficeId } })
      : null;
    const destinationModule = isTargetAssignedOffice ? "ASSIGNED_OFFICE" : "HOME";

    const bundle = await tx.bundle.create({
      data: {
        bundleNumber,
        fromOfficeId: fromLocation.id,
        toOfficeId: toLocation.id,
        status: "INBOUND_PENDING",
        createdBy: params.userName || params.userId,
        ownerAdminId: params.ownerAdminId,
      },
    });

    for (const trackingNumber of params.trackingNumbers) {
      const reg = await tx.registration.findUnique({
        where: { trackingNumber },
      });

      if (!reg) continue;

      await tx.bundleItem.create({
        data: {
          bundleId: bundle.id,
          registrationId: reg.id,
          trackingNumber,
          status: "INBOUND_PENDING",
        },
      });

      await tx.documentMovement.upsert({
        where: { trackingNumber },
        create: {
          trackingNumber,
          registrationId: reg.id,
          fromOfficeId: fromLocation.id,
          toOfficeId: toLocation.id,
          fromModule: "HOME",
          toModule: destinationModule,
          currentModule: destinationModule,
          currentOfficeId: fromLocation.id,
          returnOfficeId: fromLocation.id,
          originalProcessOfficeId: fromLocation.id,
          status: "INBOUND_PENDING",
          currentStatus: "Pending Receive",
          bundleId: bundle.id,
          createdBy: params.userName || params.userId,
          sentAt: new Date(),
          remarks: params.remarks,
        } as any,
        update: {
          fromOfficeId: fromLocation.id,
          toOfficeId: toLocation.id,
          fromModule: "HOME",
          toModule: destinationModule,
          currentModule: destinationModule,
          currentOfficeId: fromLocation.id,
          returnOfficeId: fromLocation.id,
          originalProcessOfficeId: fromLocation.id,
          status: "INBOUND_PENDING",
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
            workflowStep: "Transfer Bundle",
            status: "INBOUND_PENDING",
            performedBy: params.userName || params.userId,
            remarks: `Transferred from Home to ${destinationModule} in Bundle ${bundleNumber}`,
            ownerAdminId: params.ownerAdminId,
          },
        });
      }

      await tx.movementHistory.create({
        data: {
          trackingNumber,
          action: "Bundle Transfer",
          oldStatus: "Document In Hand",
          newStatus: "INBOUND_PENDING",
          oldOffice: fromLocation.officeName,
          newOffice: toLocation.officeName,
          performedBy: params.userName || params.userId,
          remarks: `Added to Bundle ${bundleNumber}`,
        },
      });

      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "BUNDLE_TRANSFER",
          performedBy: params.userName || params.userId,
          description: `Transferred to destination office in Bundle ${bundleNumber}`,
        },
      });
    }

    return bundle;
  }, { timeout: 20000 });
}

export async function listInboundBundles(params: {
  toOfficeId: string;
  ownerAdminId: string;
}) {
  const db = prisma as any;
  const office = await db.officeLocation.findFirst({
    where: { OR: [{ id: params.toOfficeId }, { officeName: params.toOfficeId }] },
  });
  const officeIds = [params.toOfficeId];
  if (office) officeIds.push(office.id);

  // Exclude bundles belonging to PROCESS_MODULE or ASSIGNED_OFFICE
  const nonHomeMovements = await db.documentMovement.findMany({
    where: {
      OR: [
        { toModule: { in: ["PROCESS_MODULE", "ASSIGNED_OFFICE"] } },
        { currentModule: { in: ["PROCESS_MODULE", "ASSIGNED_OFFICE"] } },
      ],
      bundleId: { not: null },
    },
    select: { bundleId: true },
  });

  const excludedBundleIds = new Set(
    nonHomeMovements.map((m: any) => m.bundleId).filter(Boolean)
  );

  const bundles = await db.bundle.findMany({
    where: {
      toOfficeId: { in: officeIds },
      ownerAdminId: params.ownerAdminId,
      status: { in: ["Pending Receive", "Partially Received", "INBOUND_PENDING", "In Transit"] },
      ...(excludedBundleIds.size > 0 ? { id: { notIn: Array.from(excludedBundleIds) } } : {}),
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const trackingNumbers = bundles.flatMap((b: any) =>
    (b.items || []).map((i: any) => i.trackingNumber).filter(Boolean)
  );

  if (trackingNumbers.length > 0) {
    const registrations = await db.registration.findMany({
      where: { trackingNumber: { in: trackingNumbers } },
    });
    const regMap = new Map(registrations.map((r: any) => [r.trackingNumber, r]));

    const currentMovements = await db.documentMovement.findMany({
      where: { trackingNumber: { in: trackingNumbers } },
      select: { trackingNumber: true, toOfficeId: true, currentOfficeId: true, bundleId: true, status: true },
    });
    const movementMap = new Map<string, any>(currentMovements.map((m: any) => [m.trackingNumber, m]));

    const validBundles = bundles.filter((b: any) => {
      if (!b.items || b.items.length === 0) return false;

      const activeItems = b.items.filter((item: any) => {
        if (item.status === "Received" || item.status === "Completed" || item.status === "Transferred") {
          return false;
        }
        const mov: any = movementMap.get(item.trackingNumber);
        if (!mov) return true;

        // If the document's active movement belongs to a DIFFERENT bundle or DIFFERENT destination office,
        // it is no longer an active inbound item for this bundle/office.
        if (mov.bundleId && mov.bundleId !== b.id) {
          return false;
        }
        if (mov.toOfficeId && !officeIds.includes(mov.toOfficeId) && !officeIds.includes(mov.currentOfficeId)) {
          return false;
        }
        return true;
      });

      b.items = activeItems;
      return activeItems.length > 0;
    });

    for (const b of validBundles) {
      if (b.items) {
        for (const item of b.items) {
          item.registration = regMap.get(item.trackingNumber) || null;
        }
      }
    }

    return validBundles;
  }

  return bundles.filter((b: any) => b.items && b.items.length > 0);
}

export async function listOutboundBundles(params: {
  fromOfficeId: string;
  ownerAdminId: string;
}) {
  const db = prisma as any;
  const office = await db.officeLocation.findFirst({
    where: { OR: [{ id: params.fromOfficeId }, { officeName: params.fromOfficeId }] },
  });
  const officeIds = [params.fromOfficeId];
  if (office) officeIds.push(office.id);

  const bundles = await db.bundle.findMany({
    where: {
      fromOfficeId: { in: officeIds },
      ownerAdminId: params.ownerAdminId,
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const trackingNumbers = bundles.flatMap((b: any) =>
    (b.items || []).map((i: any) => i.trackingNumber).filter(Boolean)
  );

  if (trackingNumbers.length > 0) {
    const registrations = await db.registration.findMany({
      where: { trackingNumber: { in: trackingNumbers } },
    });
    const regMap = new Map(registrations.map((r: any) => [r.trackingNumber, r]));

    for (const b of bundles) {
      if (b.items) {
        for (const item of b.items) {
          item.registration = regMap.get(item.trackingNumber) || null;
        }
      }
    }
  }

  return bundles;
}

export async function receiveBundle(params: {
  bundleId: string;
  receivedTrackingNumbers: string[];
  userId: string;
  userName?: string;
  ownerAdminId: string;
  remarks?: string;
}) {
  const db = prisma as any;
  const bundle = await db.bundle.findUnique({
    where: { id: params.bundleId },
    include: { items: true, fromOffice: true, toOffice: true },
  });

  if (!bundle) {
    throw new Error("Bundle not found");
  }

  const receivedSet = new Set(params.receivedTrackingNumbers);
  const isFullReceive = (bundle.items as any[]).every((item: any) => receivedSet.has(item.trackingNumber));

  const mainProcessCheckMap = new Map<string, boolean>();
  for (const item of (bundle.items as any[])) {
    if (receivedSet.has(item.trackingNumber)) {
      const mainProcessCheck = await verifyCoreSubProcessCompleted(item.trackingNumber, params.ownerAdminId);
      mainProcessCheckMap.set(item.trackingNumber, mainProcessCheck.isCompleted);
    }
  }

  return prisma.$transaction(async (tx: any) => {
    for (const item of (bundle.items as any[])) {
      if (receivedSet.has(item.trackingNumber)) {
        await tx.bundleItem.update({
          where: { id: item.id },
          data: {
            status: "Received",
            receivedAt: new Date(),
            receivedBy: params.userName || params.userId,
          },
        });

        const reg = await tx.registration.findUnique({
          where: { trackingNumber: item.trackingNumber },
          include: { documentMovements: true },
        });

        const hasCompletedMainProcess = mainProcessCheckMap.get(item.trackingNumber) ?? false;

        const receivingOfficeName = bundle.toOffice?.officeName || "";
        const deliveryLocation = reg?.deliveryLocation || "";

        // Document moves to Ready For Delivery ONLY when ALL processing is complete AND receiving office matches deliveryLocation
        const isReadyForDeliveryAutoRoute =
          hasCompletedMainProcess &&
          Boolean(receivingOfficeName && deliveryLocation && receivingOfficeName.trim().toLowerCase() === deliveryLocation.trim().toLowerCase());

        if (isReadyForDeliveryAutoRoute) {
          await tx.documentMovement.updateMany({
            where: { trackingNumber: item.trackingNumber },
            data: {
              status: "Ready for Delivery",
              currentOfficeId: bundle.toOfficeId,
              currentModule: "READY_FOR_DELIVERY",
              currentStatus: "READY_FOR_DELIVERY",
              receivedAt: new Date(),
              receivedBy: params.userName || params.userId,
            },
          });

          if (reg) {
            await tx.registration.update({
              where: { trackingNumber: item.trackingNumber },
              data: {
                trackingStatus: "Ready for Delivery",
                bmStatus: "Ready for Delivery",
              },
            });

            if (tx.documentWorkflowHistory) {
              await tx.documentWorkflowHistory.create({
                data: {
                  documentId: reg.id,
                  trackingNumber: item.trackingNumber,
                  workflowStep: "Automatic Ready For Delivery Routing",
                  status: "Ready for Delivery",
                  performedBy: params.userName || params.userId,
                  remarks: `Routed to Ready For Delivery (Process Type Main Process activity status is Completed)`,
                  ownerAdminId: params.ownerAdminId,
                },
              });
            }

            await tx.movementHistory.create({
              data: {
                trackingNumber: item.trackingNumber,
                action: "Automatic Ready For Delivery Route",
                oldStatus: "Pending Receive",
                newStatus: "Ready for Delivery",
                oldOffice: bundle.fromOffice?.officeName || null,
                newOffice: bundle.toOffice?.officeName || null,
                performedBy: params.userName || params.userId,
                remarks: `Routed directly to Ready For Delivery from Bundle ${bundle.bundleNumber}`,
              },
            });

            await tx.auditTrail.create({
              data: {
                registrationId: reg.id,
                action: "AUTO_ROUTED_TO_READY_FOR_DELIVERY",
                performedBy: params.userName || params.userId,
                description: `Process Type Main Process activity status is Completed. Routed to Ready For Delivery.`,
              },
            });
          }
        } else {
          await tx.documentMovement.updateMany({
            where: { trackingNumber: item.trackingNumber },
            data: {
              status: "Received",
              currentOfficeId: bundle.toOfficeId,
              currentModule: "DOCUMENT_IN_HAND",
              receivedAt: new Date(),
              receivedBy: params.userName || params.userId,
            },
          });

          if (reg) {
            await tx.registration.update({
              where: { trackingNumber: item.trackingNumber },
              data: {
                trackingStatus: "Document In Hand",
                bmStatus: "Received",
              },
            });

            if (tx.documentWorkflowHistory) {
              await tx.documentWorkflowHistory.create({
                data: {
                  documentId: reg.id,
                  trackingNumber: item.trackingNumber,
                  workflowStep: "Receive Bundle Item",
                  status: "Received",
                  performedBy: params.userName || params.userId,
                  remarks: `Received at ${bundle.toOffice?.officeName || "Office"} from Bundle ${bundle.bundleNumber}`,
                  ownerAdminId: params.ownerAdminId,
                },
              });
            }

            await tx.movementHistory.create({
              data: {
                trackingNumber: item.trackingNumber,
                action: "Bundle Receive",
                oldStatus: "Pending Receive",
                newStatus: "Document In Hand",
                oldOffice: bundle.fromOffice?.officeName || null,
                newOffice: bundle.toOffice?.officeName || null,
                performedBy: params.userName || params.userId,
                remarks: `Received from Bundle ${bundle.bundleNumber}`,
              },
            });

            await tx.auditTrail.create({
              data: {
                registrationId: reg.id,
                action: "BUNDLE_ITEM_RECEIVED",
                performedBy: params.userName || params.userId,
                description: `Received in Bundle ${bundle.bundleNumber}`,
              },
            });
          }
        }
      }
    }

    if (isFullReceive) {
      await tx.bundle.update({
        where: { id: bundle.id },
        data: { status: "Received" },
      });
      return {
        success: true,
        isSplit: false,
        bundleNumber: bundle.bundleNumber,
      };
    } else {
      const unreceivedItems = (bundle.items as any[]).filter(
        (item: any) => !receivedSet.has(item.trackingNumber)
      );

      const splitBundleNumber = `${bundle.bundleNumber}-S`;

      const splitBundle = await tx.bundle.create({
        data: {
          bundleNumber: splitBundleNumber,
          fromOfficeId: bundle.fromOfficeId,
          toOfficeId: bundle.toOfficeId,
          status: "INBOUND_PENDING",
          createdBy: params.userName || params.userId,
          ownerAdminId: params.ownerAdminId,
        },
      });

      for (const unreceived of unreceivedItems) {
        await tx.bundleItem.create({
          data: {
            bundleId: splitBundle.id,
            registrationId: unreceived.registrationId,
            trackingNumber: unreceived.trackingNumber,
            status: "INBOUND_PENDING",
          },
        });

        await tx.documentMovement.updateMany({
          where: { trackingNumber: unreceived.trackingNumber },
          data: { bundleId: splitBundle.id } as any,
        });

        await tx.bundleItem.delete({
          where: { id: unreceived.id },
        });
      }

      await tx.bundle.update({
        where: { id: bundle.id },
        data: { status: "Partially Received" },
      });

      return {
        success: true,
        isSplit: true,
        originalBundleNumber: bundle.bundleNumber,
        splitBundleNumber,
        remainingCount: unreceivedItems.length,
      };
    }
  }, { timeout: 20000 });
}

export async function getMovementHistory(params: {
  ownerAdminId: string;
  officeId?: string;
  bundleNumber?: string;
  trackingNumber?: string;
  search?: string;
}) {
  const whereClause: any = {};

  if (params.trackingNumber) {
    whereClause.trackingNumber = { contains: params.trackingNumber };
  } else if (params.search) {
    whereClause.trackingNumber = { contains: params.search };
  }

  const history = await prisma.movementHistory.findMany({
    where: whereClause,
    orderBy: { performedAt: "desc" },
    take: 100,
  });

  return history;
}
