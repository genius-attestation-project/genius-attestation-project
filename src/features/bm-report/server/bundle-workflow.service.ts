import { prisma } from "@/lib/prisma";

export function generateBundleNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BM-${dateStr}-${randomSuffix}`;
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

  const registrations = await prisma.registration.findMany({
    where: {
      ...whereClause,
      OR: [
        {
          trackingStatus: { in: ["Registered", "Document In Hand", "In Hand", "HOME"] },
          ...(params.officeId ? { regionOfRegistration: params.officeId } : {}),
        },
        {
          documentMovements: {
            some: {
              currentOfficeId: params.officeId,
              status: { in: ["Received", "Document In Hand", "HOME", "Completed"] },
            },
          },
        },
      ],
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
    // Ensure fromOfficeId and toOfficeId exist in OfficeLocation relation table
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
    const destinationModule = isTargetAssignedOffice ? "ASSIGNED_OFFICE" : "BM_REPORT";

    // 1. Create Bundle Movement record
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

    // 2. Process each document
    for (const trackingNumber of params.trackingNumbers) {
      const reg = await tx.registration.findUnique({
        where: { trackingNumber },
      });

      if (!reg) continue;

      // Create BundleItem
      await tx.bundleItem.create({
        data: {
          bundleId: bundle.id,
          registrationId: reg.id,
          trackingNumber,
          status: "INBOUND_PENDING",
        },
      });

      // Create or Update DocumentMovement
      await tx.documentMovement.upsert({
        where: { trackingNumber },
        create: {
          trackingNumber,
          registrationId: reg.id,
          fromOfficeId: fromLocation.id,
          toOfficeId: toLocation.id,
          fromModule: "BM_REPORT",
          toModule: destinationModule,
          currentModule: destinationModule,
          currentOfficeId: toLocation.id,
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
          fromModule: "BM_REPORT",
          toModule: destinationModule,
          currentModule: destinationModule,
          currentOfficeId: toLocation.id,
          status: "INBOUND_PENDING",
          currentStatus: "Pending Receive",
          bundleId: bundle.id,
          sentAt: new Date(),
          remarks: params.remarks,
        } as any,
      });

      // Update registration tracking status
      await tx.registration.update({
        where: { trackingNumber },
        data: {
          trackingStatus: "In Transfer",
          bmStatus: "Transferred",
        },
      });

      // Record DocumentWorkflowHistory
      if (tx.documentWorkflowHistory) {
        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber,
            workflowStep: "Transfer Bundle",
            status: "INBOUND_PENDING",
            performedBy: params.userName || params.userId,
            remarks: `Transferred from BM Report to ${destinationModule} in Bundle ${bundleNumber}`,
            ownerAdminId: params.ownerAdminId,
          },
        });
      }

      // Record MovementHistory
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

      // Audit Trail
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
  return db.bundle.findMany({
    where: {
      toOfficeId: params.toOfficeId,
      ownerAdminId: params.ownerAdminId,
      status: { in: ["Pending Receive", "Partially Received", "INBOUND_PENDING"] },
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listOutboundBundles(params: {
  fromOfficeId: string;
  ownerAdminId: string;
}) {
  const db = prisma as any;
  return db.bundle.findMany({
    where: {
      fromOfficeId: params.fromOfficeId,
      ownerAdminId: params.ownerAdminId,
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
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
    // Process received items
    for (const item of (bundle.items as any[])) {
      if (receivedSet.has(item.trackingNumber)) {
        // Mark BundleItem received
        await tx.bundleItem.update({
          where: { id: item.id },
          data: {
            status: "Received",
            receivedAt: new Date(),
            receivedBy: params.userName || params.userId,
          },
        });

        // Update DocumentMovement
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

        // Update Registration
        const reg = await tx.registration.findUnique({
          where: { trackingNumber: item.trackingNumber },
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

    if (isFullReceive) {
      // Mark bundle fully received
      await tx.bundle.update({
        where: { id: bundle.id },
        data: { status: "Received" },
      });
      return { success: true, isSplit: false, bundleNumber: bundle.bundleNumber };
    } else {
      // PARTIAL RECEIVE -> Split bundle!
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
