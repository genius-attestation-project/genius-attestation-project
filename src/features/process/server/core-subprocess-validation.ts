import { prisma } from "@/lib/prisma";

export type MainProcessCheckResult = {
  isCompleted: boolean;
  processType?: string | null;
  totalActivities?: number;
  completedActivities?: number;
  missingActivities?: string[];
  message?: string;
};

export type CoreSubProcessCheckResult = MainProcessCheckResult;

/**
 * Verifies whether the Main Process associated with a document's Process Type
 * has been fully and authoritatively completed.
 *
 * Business Rules:
 * 1. An individual completed sub-process/activity is NEVER sufficient for overall main process completion.
 * 2. If a Process Type has configured sub-packages/activities in Master Data:
 *    - ALL configured activities must have a completed SubPackageMovement (status: 'Completed' / 'COMPLETED').
 *    - NO sub-package movement may be in 'Pending', 'In Progress', 'Returned', 'Rejected', or 'In Sub Package'.
 * 3. If no sub-packages are configured, completion is determined by explicit 'COMPLETED' status
 *    on ProcessAssignment or DocumentMovement.
 * 4. Accepts an optional Prisma transaction client `tx` for transactional safety during inbound receive.
 */
export async function verifyMainProcessCompleted(
  targetId: string,
  ownerAdminId: string,
  tx?: any
): Promise<MainProcessCheckResult> {
  const db = tx ?? prisma;
  const target = targetId.trim();
  if (!target) {
    return {
      isCompleted: false,
      message: "This document cannot be moved to Ready For Delivery because the Main Process has not been completed.",
    };
  }

  const registration = await db.registration.findFirst({
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

  // 1. If Process Type is specified, check against configured Master Data sub-packages / activities
  // ALL configured activities must be completed. A single completed sub-process alone is NEVER sufficient.
  if (processTypeName) {
    const masterProcessType = await db.masterData.findFirst({
      where: {
        type: "PROCESS_TYPES",
        name: processTypeName,
        ownerAdminId,
      },
      include: {
        subPackages: {
          where: { isActive: true },
        },
      },
    });

    const configuredActivities = masterProcessType?.subPackages || [];

    // Query all sub-package movements for this document
    const subMovements = await db.subPackageMovement.findMany({
      where: {
        trackingNumber: registration.trackingNumber,
        ownerAdminId,
      },
    });

    if (configuredActivities.length > 0) {
      const configuredSubPkgIds = new Set(configuredActivities.map((act: any) => act.id));

      const completedSubPkgIds = new Set(
        subMovements
          .filter((sm: any) => configuredSubPkgIds.has(sm.subPackageId) && (sm.status === "Completed" || sm.status === "COMPLETED"))
          .map((sm: any) => sm.subPackageId)
      );

      const missingActivities = configuredActivities
        .filter((act: any) => !completedSubPkgIds.has(act.id))
        .map((act: any) => act.name);

      const incompleteMovements = subMovements.filter(
        (sm: any) =>
          configuredSubPkgIds.has(sm.subPackageId) &&
          sm.status !== "Completed" &&
          sm.status !== "COMPLETED"
      );

      const isAllActivitiesCompleted =
        missingActivities.length === 0 && incompleteMovements.length === 0;

      if (isAllActivitiesCompleted) {
        return {
          isCompleted: true,
          processType: processTypeName,
          totalActivities: configuredActivities.length,
          completedActivities: configuredActivities.length,
          missingActivities: [],
        };
      }

      const pendingDetails = [
        ...missingActivities.map((name: string) => `${name} (Not completed)`),
        ...incompleteMovements.map((m: any) => `Activity ID ${m.subPackageId} (${m.status})`),
      ];

      return {
        isCompleted: false,
        processType: processTypeName,
        totalActivities: configuredActivities.length,
        completedActivities: configuredActivities.length - missingActivities.length,
        missingActivities,
        message: `Main process is incomplete. Pending activities: ${pendingDetails.join(", ")}.`,
      };
    }

    // If master process type is defined but has no configured sub-packages, check if any subMovements were recorded
    if (subMovements.length > 0) {
      const allCompleted = subMovements.every(
        (sm: any) => sm.status === "Completed" || sm.status === "COMPLETED"
      );
      if (allCompleted) {
        return {
          isCompleted: true,
          processType: processTypeName,
          totalActivities: subMovements.length,
          completedActivities: subMovements.length,
        };
      }
      return {
        isCompleted: false,
        processType: processTypeName,
        message: "Not all sub-process activities are completed.",
      };
    }
  }

  // 2. Check Authoritative Process Module completion in MovementHistory
  // When a document without sub-packages is marked COMPLETED in Process Module,
  // it logs action: "Marked as COMPLETED". We strictly exclude any "Sub Package" actions.
  const completedHistory = await db.movementHistory.findFirst({
    where: {
      trackingNumber: registration.trackingNumber,
      action: { in: ["Marked as COMPLETED", "COMPLETED", "Process Completed"] },
      NOT: {
        action: { contains: "Sub Package" },
      },
    },
    orderBy: { performedAt: "desc" },
  });

  if (completedHistory) {
    // Verify there was no subsequent rejection or return that reversed completion
    const subsequentReversal = await db.movementHistory.findFirst({
      where: {
        trackingNumber: registration.trackingNumber,
        performedAt: { gt: completedHistory.performedAt },
        OR: [
          { action: { in: ["Marked as REJECTED", "Returned Document", "Activity Rejected", "Sub Package Return"] } },
          { newStatus: { in: ["REJECTED", "RETURNED", "Rejected", "Returned"] } },
        ],
      },
    });

    if (!subsequentReversal) {
      return {
        isCompleted: true,
        processType: processTypeName || null,
      };
    }
  }

  // 3. Check explicit Process Module DocumentMovement completion (strictly in PROCESS_MODULE)
  const isProcessModuleCompleted = registration.documentMovements.some(
    (mov: any) =>
      mov.currentModule === "PROCESS_MODULE" &&
      (mov.status === "COMPLETED" || mov.currentStatus === "COMPLETED")
  );

  if (isProcessModuleCompleted) {
    return {
      isCompleted: true,
      processType: processTypeName || null,
    };
  }

  // 4. Check authoritative ProcessAssignment completion
  const completedAssignment = await db.processAssignment.findFirst({
    where: {
      trackingNumber: registration.trackingNumber,
      status: { in: ["COMPLETED", "Completed"] },
    },
  });

  if (completedAssignment) {
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
  ownerAdminId: string,
  tx?: any
): Promise<CoreSubProcessCheckResult> {
  return verifyMainProcessCompleted(targetId, ownerAdminId, tx);
}
