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

  // 1. Check if any sub-package movement for this tracking number is pending or in progress
  const pendingSubMovements = await (prisma as any).subPackageMovement.findMany({
    where: {
      trackingNumber: registration.trackingNumber,
      ownerAdminId,
      status: { notIn: ["Completed", "COMPLETED"] },
    },
  });

  if (pendingSubMovements.length > 0) {
    return {
      isCompleted: false,
      processType: processTypeName || null,
      message: `Document has ${pendingSubMovements.length} pending sub-process(es). All sub-processes must be completed before delivery.`,
    };
  }

  // 2. Query Master Configuration for configured sub-packages
  if (processTypeName) {
    const masterProcessType = await prisma.masterData.findFirst({
      where: {
        type: "PROCESS_TYPES",
        name: processTypeName,
        ownerAdminId,
      },
      include: {
        subPackages: true,
      },
    });

    if (masterProcessType) {
      const completedSubMovements = await (prisma as any).subPackageMovement.findMany({
        where: {
          trackingNumber: registration.trackingNumber,
          ownerAdminId,
          status: { in: ["Completed", "COMPLETED"] },
        },
        select: { subPackageId: true },
      });

      const completedSubPkgIds = new Set(completedSubMovements.map((m: any) => m.subPackageId));

      if (masterProcessType.coreSubPackageId && !completedSubPkgIds.has(masterProcessType.coreSubPackageId)) {
        return {
          isCompleted: false,
          processType: processTypeName,
          message: `Main core process is not completed.`,
        };
      }

      const totalSubMovementsCount = await (prisma as any).subPackageMovement.count({
        where: {
          trackingNumber: registration.trackingNumber,
          ownerAdminId,
        },
      });

      if (totalSubMovementsCount > 0 && completedSubMovements.length >= totalSubMovementsCount) {
        return {
          isCompleted: true,
          processType: processTypeName,
        };
      }
    }
  }

  // 3. Check overall document movement / assignment status
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

  // 4. Fallback check for completed subpackage movements
  const totalSubMovs = await (prisma as any).subPackageMovement.count({
    where: { trackingNumber: registration.trackingNumber, ownerAdminId },
  });
  const completedSubMovs = await (prisma as any).subPackageMovement.count({
    where: { trackingNumber: registration.trackingNumber, ownerAdminId, status: { in: ["Completed", "COMPLETED"] } },
  });

  if (totalSubMovs > 0 && totalSubMovs === completedSubMovs) {
    return {
      isCompleted: true,
      processType: processTypeName || null,
    };
  }

  return {
    isCompleted: false,
    processType: processTypeName || null,
    message: "This document cannot be moved to Ready For Delivery because process completion requirements are not met.",
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

