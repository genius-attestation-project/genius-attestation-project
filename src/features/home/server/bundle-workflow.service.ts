import { prisma } from "@/lib/prisma";
import { verifyCoreSubProcessCompleted } from "@/features/process/server/core-subprocess-validation";

export function generateBundleNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `HOME-${dateStr}-${randomSuffix}`;
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
        notIn: ["In Transfer", "Transferred", "INBOUND_PENDING", "In Transit"],
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
    },
    orderBy: { createdAt: "desc" },
  });

  return registrations;
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

    const isTargetAssignedOffice = await tx.assignedOffice.findUnique({ where: { id: params.toOfficeId } });
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
  });
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

  const bundles = await db.bundle.findMany({
    where: {
      toOfficeId: { in: officeIds },
      ownerAdminId: params.ownerAdminId,
      status: { in: ["Pending Receive", "Partially Received", "INBOUND_PENDING", "In Transit"] },
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

        const coreSubProcessCheck = await verifyCoreSubProcessCompleted(item.trackingNumber, params.ownerAdminId);
        const hasCompletedSubPackage = coreSubProcessCheck.isCompleted;

        const receivingOfficeName = bundle.toOffice?.officeName || "";
        const deliveryLocation = reg?.deliveryLocation || "";
        const isDeliveryLocationMatch = Boolean(
          receivingOfficeName &&
          deliveryLocation &&
          receivingOfficeName.trim().toLowerCase() === deliveryLocation.trim().toLowerCase()
        );

        const isReadyForDeliveryAutoRoute = hasCompletedSubPackage && isDeliveryLocationMatch;

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
                  remarks: `Routed to Ready For Delivery at ${receivingOfficeName} (Core Sub Process completed & Delivery Location matches receiving office)`,
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
                performedBy: params.userName || params.userId,
                remarks: `Routed directly to Ready For Delivery from Bundle ${bundle.bundleNumber}`,
              },
            });

            await tx.auditTrail.create({
              data: {
                registrationId: reg.id,
                action: "AUTO_ROUTED_TO_READY_FOR_DELIVERY",
                performedBy: params.userName || params.userId,
                description: `Core Sub Process completed and delivery location (${deliveryLocation}) matches current office. Routed to Ready For Delivery.`,
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
      return { success: true, isSplit: false, bundleNumber: bundle.bundleNumber };
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
  });
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
