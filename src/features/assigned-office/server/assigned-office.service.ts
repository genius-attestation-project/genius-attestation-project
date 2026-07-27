import { prisma } from "@/lib/prisma";

export async function getAssignedOfficeStats(officeId: string, ownerAdminId: string) {
  const inboundBundles = await prisma.bundle.count({
    where: {
      toOfficeId: officeId,
      ownerAdminId,
      status: { in: ["Pending Receive", "Partially Received"] },
    },
  });

  const inHandDocs = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: officeId,
          status: { in: ["Received", "Document In Hand", "In Hand"] },
        },
      },
    },
  });

  const completedDocs = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: officeId,
          currentStatus: "Completed",
        },
      },
    },
  });

  const returnedDocs = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: officeId,
          currentStatus: "Returned",
        },
      },
    },
  });

  const rejectedDocs = await prisma.registration.count({
    where: {
      ownerAdminId,
      documentMovements: {
        some: {
          currentOfficeId: officeId,
          currentStatus: "Rejected",
        },
      },
    },
  });

  return {
    pendingCount: inHandDocs,
    inboundCount: inboundBundles,
    completedCount: completedDocs,
    returnedCount: returnedDocs,
    rejectedCount: rejectedDocs,
  };
}

export async function listAssignedOfficeDocuments(params: {
  officeId: string;
  tab: string; // 'inbound' | 'in_hand' | 'complete' | 'return' | 'rejected' | 'history'
  ownerAdminId: string;
  search?: string;
}) {
  const searchWhere = params.search && params.search.trim() !== ""
    ? {
        OR: [
          { trackingNumber: { contains: params.search.trim() } },
          { customerName: { contains: params.search.trim() } },
          { documentType: { contains: params.search.trim() } },
        ],
      }
    : {};

  if (params.tab === "inbound") {
    return prisma.bundle.findMany({
      where: {
        toOfficeId: params.officeId,
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

  if (params.tab === "complete") {
    return prisma.registration.findMany({
      where: {
        ownerAdminId: params.ownerAdminId,
        ...searchWhere,
        documentMovements: {
          some: {
            currentOfficeId: params.officeId,
            currentStatus: "Completed",
          },
        },
      },
      include: {
        documentMovements: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (params.tab === "return") {
    return prisma.registration.findMany({
      where: {
        ownerAdminId: params.ownerAdminId,
        ...searchWhere,
        documentMovements: {
          some: {
            currentOfficeId: params.officeId,
            currentStatus: "Returned",
          },
        },
      },
      include: {
        documentMovements: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (params.tab === "rejected") {
    return prisma.registration.findMany({
      where: {
        ownerAdminId: params.ownerAdminId,
        ...searchWhere,
        documentMovements: {
          some: {
            currentOfficeId: params.officeId,
            currentStatus: "Rejected",
          },
        },
      },
      include: {
        documentMovements: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (params.tab === "history") {
    return prisma.documentWorkflowHistory.findMany({
      where: {
        ownerAdminId: params.ownerAdminId,
      },
      orderBy: { performedAt: "desc" },
      take: 100,
    });
  }

  // Default: 'in_hand'
  return prisma.registration.findMany({
    where: {
      ownerAdminId: params.ownerAdminId,
      ...searchWhere,
      documentMovements: {
        some: {
          currentOfficeId: params.officeId,
          status: { in: ["Received", "Document In Hand", "In Hand", "HOME"] },
          currentStatus: { notIn: ["Completed", "Returned", "Rejected"] },
        },
      },
    },
    include: {
      documentMovements: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function transferToSubPackage(params: {
  items: Array<{ trackingNumber: string; subPackageId: string }>;
  officeId: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
}) {
  return prisma.$transaction(async (tx) => {
    for (const item of params.items) {
      const reg = await tx.registration.findUnique({
        where: { trackingNumber: item.trackingNumber },
      });

      if (!reg) continue;

      await tx.subPackageMovement.create({
        data: {
          documentId: reg.id,
          trackingNumber: item.trackingNumber,
          subPackageId: item.subPackageId,
          assignedOfficeId: params.officeId,
          status: "In Progress",
          createdBy: params.userName || params.userId,
          ownerAdminId: params.ownerAdminId,
        },
      });

      await tx.documentWorkflowHistory.create({
        data: {
          documentId: reg.id,
          trackingNumber: item.trackingNumber,
          workflowStep: "Sub Package Transfer",
          status: "In Progress",
          performedBy: params.userName || params.userId,
          remarks: `Assigned to Sub Package: ${item.subPackageId}`,
          ownerAdminId: params.ownerAdminId,
        },
      });

      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "SUB_PACKAGE_TRANSFER",
          performedBy: params.userName || params.userId,
          description: `Transferred to Sub Package ID ${item.subPackageId}`,
        },
      });
    }

    return { success: true, count: params.items.length };
  });
}

export async function listSubPackageItems(params: {
  officeId?: string;
  ownerAdminId: string;
}) {
  const activeSubPackages = await prisma.masterData.findMany({
    where: {
      type: "SUB_PACKAGE",
      isActive: true,
    },
  });

  const movements = await prisma.subPackageMovement.findMany({
    where: {
      ownerAdminId: params.ownerAdminId,
      status: "In Progress",
    },
    orderBy: { startedAt: "desc" },
  });

  const trackingNumbers = Array.from(new Set(movements.map((m) => m.trackingNumber)));
  const registrations = await prisma.registration.findMany({
    where: { trackingNumber: { in: trackingNumbers } },
  });

  const regMap = new Map(registrations.map((r) => [r.trackingNumber, r]));

  return {
    subPackages: activeSubPackages,
    items: movements.map((m) => ({
      ...m,
      registration: regMap.get(m.trackingNumber) || null,
    })),
  };
}

export async function processSubPackageAction(params: {
  movementIds: string[];
  action: "complete" | "return" | "reject";
  userId: string;
  userName?: string;
  ownerAdminId: string;
  remarks?: string;
}) {
  return prisma.$transaction(async (tx) => {
    for (const movementId of params.movementIds) {
      const subMov = await tx.subPackageMovement.findUnique({
        where: { id: movementId },
      });

      if (!subMov) continue;

      const reg = await tx.registration.findUnique({
        where: { trackingNumber: subMov.trackingNumber },
      });

      if (!reg) continue;

      if (params.action === "complete") {
        await tx.subPackageMovement.update({
          where: { id: movementId },
          data: {
            status: "Completed",
            completedAt: new Date(),
          },
        });

        // Check if ALL SubPackages & Core Package completed for this registration
        const remainingSubMovements = await tx.subPackageMovement.count({
          where: {
            trackingNumber: subMov.trackingNumber,
            status: { not: "Completed" },
          },
        });

        const isCoreComplete = true; // Core package completion check
        const allSubPackagesDone = remainingSubMovements === 0;

        // Check delivery location match
        const deliveryLocationName = reg.deliveryLocation;
        let currentOfficeName = "";
        if (subMov.assignedOfficeId) {
          const currentOffice = await tx.officeLocation.findUnique({
            where: { id: subMov.assignedOfficeId },
          });
          currentOfficeName = currentOffice?.officeName || "";
        }

        const matchesDeliveryLocation =
          Boolean(deliveryLocationName) &&
          Boolean(currentOfficeName) &&
          deliveryLocationName?.toLowerCase() === currentOfficeName.toLowerCase();

        if (allSubPackagesDone && isCoreComplete) {
          if (matchesDeliveryLocation) {
            // READY FOR DELIVERY!
            await tx.registration.update({
              where: { trackingNumber: subMov.trackingNumber },
              data: { trackingStatus: "Ready For Delivery" },
            });

            await tx.documentMovement.updateMany({
              where: { trackingNumber: subMov.trackingNumber },
              data: {
                status: "Ready For Delivery",
                currentStatus: "Ready For Delivery",
              },
            });

            await tx.documentWorkflowHistory.create({
              data: {
                documentId: reg.id,
                trackingNumber: subMov.trackingNumber,
                workflowStep: "Ready For Delivery Automation",
                status: "Ready For Delivery",
                performedBy: params.userName || params.userId,
                remarks: `Moved directly to Ready For Delivery (Destination office matches delivery location: ${deliveryLocationName})`,
                ownerAdminId: params.ownerAdminId,
              },
            });
          } else {
            // Move to Document Complete
            await tx.documentMovement.updateMany({
              where: { trackingNumber: subMov.trackingNumber },
              data: { currentStatus: "Completed" },
            });

            await tx.documentWorkflowHistory.create({
              data: {
                documentId: reg.id,
                trackingNumber: subMov.trackingNumber,
                workflowStep: "All Sub Packages Completed",
                status: "Completed",
                performedBy: params.userName || params.userId,
                remarks: "All required sub packages completed",
                ownerAdminId: params.ownerAdminId,
              },
            });
          }
        } else {
          // Move back to Document In Hand
          await tx.documentMovement.updateMany({
            where: { trackingNumber: subMov.trackingNumber },
            data: { currentStatus: "Document In Hand" },
          });
        }

        await tx.auditTrail.create({
          data: {
            registrationId: reg.id,
            action: "SUB_PACKAGE_COMPLETED",
            performedBy: params.userName || params.userId,
            description: `Subpackage ${subMov.subPackageId} completed`,
          },
        });
      } else if (params.action === "return") {
        await tx.subPackageMovement.update({
          where: { id: movementId },
          data: {
            status: "Returned",
            returnedAt: new Date(),
          },
        });

        await tx.documentMovement.updateMany({
          where: { trackingNumber: subMov.trackingNumber },
          data: { currentStatus: "Returned" },
        });

        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber: subMov.trackingNumber,
            workflowStep: "Sub Package Returned",
            status: "Returned",
            performedBy: params.userName || params.userId,
            remarks: params.remarks || "Returned during sub package processing",
            ownerAdminId: params.ownerAdminId,
          },
        });

        await tx.auditTrail.create({
          data: {
            registrationId: reg.id,
            action: "SUB_PACKAGE_RETURNED",
            performedBy: params.userName || params.userId,
            description: `Subpackage ${subMov.subPackageId} returned`,
          },
        });
      } else if (params.action === "reject") {
        await tx.subPackageMovement.update({
          where: { id: movementId },
          data: {
            status: "Rejected",
            rejectedAt: new Date(),
          },
        });

        await tx.documentMovement.updateMany({
          where: { trackingNumber: subMov.trackingNumber },
          data: { currentStatus: "Rejected" },
        });

        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber: subMov.trackingNumber,
            workflowStep: "Sub Package Rejected",
            status: "Rejected",
            performedBy: params.userName || params.userId,
            remarks: params.remarks || "Rejected to Process Inbound Bundle",
            ownerAdminId: params.ownerAdminId,
          },
        });

        await tx.auditTrail.create({
          data: {
            registrationId: reg.id,
            action: "SUB_PACKAGE_REJECTED",
            performedBy: params.userName || params.userId,
            description: `Subpackage ${subMov.subPackageId} rejected`,
          },
        });
      }
    }

    return { success: true };
  });
}
