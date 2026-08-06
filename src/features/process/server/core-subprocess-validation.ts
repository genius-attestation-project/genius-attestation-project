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

  // 1. Check if DocumentMovement status indicates Main Process is COMPLETED
  const isDocMovCompleted = registration.documentMovements.some(
    (mov) =>
      mov.status === "COMPLETED" ||
      mov.status === "Completed" ||
      mov.currentStatus === "Completed" ||
      mov.currentStatus === "COMPLETED"
  );

  // 2. Check if ProcessAssignment status indicates Main Process is COMPLETED
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

