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

  return prisma.$transaction(async (tx) => {
    // 1. Create Bundle
    const bundle = await tx.bundle.create({
      data: {
        bundleNumber,
        fromOfficeId: params.fromOfficeId,
        toOfficeId: params.toOfficeId,
        status: "Pending Receive",
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
          status: "Pending Receive",
        },
      });

      // Update or Upsert DocumentMovement
      await tx.documentMovement.upsert({
        where: { trackingNumber },
        create: {
          trackingNumber,
          registrationId: reg.id,
          fromOfficeId: params.fromOfficeId,
          toOfficeId: params.toOfficeId,
          status: "Pending Receive",
          currentOfficeId: params.fromOfficeId,
          currentModule: "BM_REPORT",
          bundleId: bundle.id,
          createdBy: params.userName || params.userId,
          sentAt: new Date(),
          remarks: params.remarks,
        },
        update: {
          fromOfficeId: params.fromOfficeId,
          toOfficeId: params.toOfficeId,
          status: "Pending Receive",
          bundleId: bundle.id,
          sentAt: new Date(),
          remarks: params.remarks,
        },
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
      await tx.documentWorkflowHistory.create({
        data: {
          documentId: reg.id,
          trackingNumber,
          workflowStep: "Transfer Bundle",
          status: "Pending Receive",
          performedBy: params.userName || params.userId,
          remarks: `Transferred in Bundle ${bundleNumber}`,
          ownerAdminId: params.ownerAdminId,
        },
      });

      // Record MovementHistory
      await tx.movementHistory.create({
        data: {
          trackingNumber,
          action: "Bundle Transfer",
          oldStatus: "Document In Hand",
          newStatus: "Pending Receive",
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
  return prisma.bundle.findMany({
    where: {
      toOfficeId: params.toOfficeId,
      ownerAdminId: params.ownerAdminId,
      status: { in: ["Pending Receive", "Partially Received"] },
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
  return prisma.bundle.findMany({
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
  const bundle = await prisma.bundle.findUnique({
    where: { id: params.bundleId },
    include: { items: true, fromOffice: true, toOffice: true },
  });

  if (!bundle) {
    throw new Error("Bundle not found");
  }

  const receivedSet = new Set(params.receivedTrackingNumbers);
  const isFullReceive = bundle.items.every((item) => receivedSet.has(item.trackingNumber));

  return prisma.$transaction(async (tx) => {
    // Process received items
    for (const item of bundle.items) {
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
      const unreceivedItems = bundle.items.filter(
        (item) => !receivedSet.has(item.trackingNumber)
      );

      const splitBundleNumber = `${bundle.bundleNumber}-S`;

      const splitBundle = await tx.bundle.create({
        data: {
          bundleNumber: splitBundleNumber,
          fromOfficeId: bundle.fromOfficeId,
          toOfficeId: bundle.toOfficeId,
          status: "Pending Receive",
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
            status: "Pending Receive",
          },
        });

        await tx.documentMovement.updateMany({
          where: { trackingNumber: unreceived.trackingNumber },
          data: { bundleId: splitBundle.id },
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
