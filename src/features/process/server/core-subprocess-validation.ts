import { prisma } from "@/lib/prisma";

export type CoreSubProcessCheckResult = {
  isCompleted: boolean;
  coreSubPackageId?: string | null;
  coreSubPackageName?: string | null;
  processType?: string | null;
  message?: string;
};

/**
 * Verifies whether the Core SubProcess associated with a document's Process Type
 * has been completed in the Subpackage Workspace.
 */
export async function verifyCoreSubProcessCompleted(
  targetId: string,
  ownerAdminId: string
): Promise<CoreSubProcessCheckResult> {
  const target = targetId.trim();
  if (!target) {
    return {
      isCompleted: false,
      message: "Cannot move this document to Ready For Delivery because tracking number or registration ID is missing.",
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
        take: 1,
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

  // If there's a Process Type, look up its Core SubPackage in MasterData
  if (processTypeName) {
    const processTypeMaster = await prisma.masterData.findFirst({
      where: {
        ownerAdminId,
        type: "PROCESS_TYPE",
        name: { equals: processTypeName },
      },
      select: {
        id: true,
        name: true,
        coreSubPackageId: true,
        coreSubPackage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const coreSubPkgId = processTypeMaster?.coreSubPackageId || null;
    const coreSubPkgName = processTypeMaster?.coreSubPackage?.name || null;

    if (coreSubPkgId) {
      // Core SubPackage is explicitly designated for this Process Type
      const completedCoreMovement = await (prisma as any).subPackageMovement.findFirst({
        where: {
          trackingNumber: registration.trackingNumber,
          subPackageId: coreSubPkgId,
          status: "Completed",
        },
      });

      if (completedCoreMovement) {
        return {
          isCompleted: true,
          coreSubPackageId: coreSubPkgId,
          coreSubPackageName: coreSubPkgName,
          processType: processTypeName,
        };
      }

      return {
        isCompleted: false,
        coreSubPackageId: coreSubPkgId,
        coreSubPackageName: coreSubPkgName,
        processType: processTypeName,
        message: "Cannot move this document to Ready For Delivery because the Core SubProcess has not been completed.",
      };
    }
  }

  // Fallback: If no explicit coreSubPackageId is designated or processType is not set,
  // check if ANY SubPackageMovement or DocumentMovement status for this document is Completed
  const completedAnyMovement = await (prisma as any).subPackageMovement.findFirst({
    where: {
      trackingNumber: registration.trackingNumber,
      status: "Completed",
    },
  });

  const latestDocMov = registration.documentMovements[0];
  const isDocMovCompleted =
    latestDocMov?.currentStatus === "Completed" || latestDocMov?.status === "Completed";

  if (completedAnyMovement || isDocMovCompleted) {
    return {
      isCompleted: true,
      processType: processTypeName || null,
    };
  }

  return {
    isCompleted: false,
    processType: processTypeName || null,
    message: "Cannot move this document to Ready For Delivery because the Core SubProcess has not been completed.",
  };
}
