import { prisma } from "@/lib/prisma";

export type MainProcessCheckResult = {
  isCompleted: boolean;
  coreSubPackageId?: string | null;
  coreSubPackageName?: string | null;
  processType?: string | null;
  message?: string;
};

export type CoreSubProcessCheckResult = MainProcessCheckResult;

/**
 * Verifies whether the Main Process associated with a document's Process Type
 * has been fully completed.
 *
 * Completion of Sub Processes alone is NOT sufficient. The document becomes eligible
 * for Ready For Delivery ONLY when Main Process Status = Completed.
 */
export async function verifyMainProcessCompleted(
  targetId: string,
  ownerAdminId: string
): Promise<MainProcessCheckResult> {
  const target = targetId.trim();
  if (!target) {
    return {
      isCompleted: false,
      message: "This document cannot be moved to Ready For Delivery because the Main Process has not been completed.",
    };
  }

  const registration = await prisma.registration.findFirst({
    where: {
      ownerAdminId,
      OR: [{ id: target }, { trackingNumber: target }],
    },
    select: {
      id: true,
      trackingNumber: true,
      processType: true,
      documentMovements: {
        select: {
          currentStatus: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!registration) {
    return {
      isCompleted: false,
      message: `Cannot move this document to Ready For Delivery because registration "${target}" was not found.`,
    };
  }

  const processTypeName = registration.processType?.trim();

  // 1. First, check overall document movement / assignment status if marked COMPLETED / Ready for Delivery
  const isDocMovCompleted = registration.documentMovements.some(
    (mov) =>
      mov.status === "COMPLETED" ||
      mov.status === "Completed" ||
      mov.status === "Ready for Delivery" ||
      mov.currentStatus === "Completed" ||
      mov.currentStatus === "COMPLETED" ||
      mov.currentStatus === "READY_FOR_DELIVERY" ||
      mov.currentStatus === "Ready for Delivery"
  );

  const completedAssignment = await prisma.processAssignment.findFirst({
    where: {
      trackingNumber: registration.trackingNumber,
      status: { in: ["COMPLETED", "Completed"] },
    },
  });

  if (isDocMovCompleted || completedAssignment) {
    return {
      isCompleted: true,
      processType: processTypeName || null,
    };
  }

  // 2. Query Master Configuration for the configured Main Process (coreSubPackageId) of this Process Type
  if (processTypeName) {
    const masterProcessType = await prisma.masterData.findFirst({
      where: {
        type: "PROCESS_TYPES",
        name: processTypeName,
        ownerAdminId,
      },
      select: {
        id: true,
        coreSubPackageId: true,
        coreSubPackage: { select: { id: true, name: true } },
      },
    });

    if (masterProcessType?.coreSubPackageId) {
      // Check the SubPackageMovement for this specific Main Process (coreSubPackageId)
      const coreSubMovement = await (prisma as any).subPackageMovement.findFirst({
        where: {
          trackingNumber: registration.trackingNumber,
          subPackageId: masterProcessType.coreSubPackageId,
          ownerAdminId,
        },
        select: {
          status: true,
        },
      });

      if (coreSubMovement && (coreSubMovement.status === "Completed" || coreSubMovement.status === "COMPLETED")) {
        return {
          isCompleted: true,
          coreSubPackageId: masterProcessType.coreSubPackageId,
          coreSubPackageName: masterProcessType.coreSubPackage?.name || null,
          processType: processTypeName,
        };
      }

      // If coreSubPackageId exists and its status is NOT Completed, return false.
      // (Even if other sub-processes like MEA or UAE Embassy are completed!)
      return {
        isCompleted: false,
        coreSubPackageId: masterProcessType.coreSubPackageId,
        coreSubPackageName: masterProcessType.coreSubPackage?.name || null,
        processType: processTypeName,
        message: `Main Process "${masterProcessType.coreSubPackage?.name || "Main Process"}" status is not Completed.`,
      };
    }
  }

  // 3. Fallback: check if any assigned office core package movement for this document is completed
  const coreAssignedSubMovement = await (prisma as any).subPackageMovement.findFirst({
    where: {
      trackingNumber: registration.trackingNumber,
      ownerAdminId,
      status: { in: ["Completed", "COMPLETED"] },
    },
    select: {
      subPackageId: true,
    },
  });

  if (coreAssignedSubMovement) {
    // Check if this subPackageId is marked as isCorePackage in assignedOfficeSubPackage
    const isCorePackage = await (prisma as any).assignedOfficeSubPackage.findFirst({
      where: {
        subPackageId: coreAssignedSubMovement.subPackageId,
        isCorePackage: true,
      },
    });

    if (isCorePackage) {
      return {
        isCompleted: true,
        processType: processTypeName || null,
      };
    }
  }

  return {
    isCompleted: false,
    processType: processTypeName || null,
    message: "This document cannot be moved to Ready For Delivery because the Main Process has not been completed.",
  };
}

/**
 * Backward compatible alias for verifyMainProcessCompleted.
 */
export async function verifyCoreSubProcessCompleted(
  targetId: string,
  ownerAdminId: string
): Promise<CoreSubProcessCheckResult> {
  return verifyMainProcessCompleted(targetId, ownerAdminId);
}

