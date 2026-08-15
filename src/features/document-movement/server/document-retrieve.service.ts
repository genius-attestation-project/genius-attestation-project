import { prisma } from "@/lib/prisma";
import { createNotification } from "@/features/notifications/server/notification.service";

export type RetrieveOutboundParams = {
  ownerAdminId: string;
  userId: string;
  userName: string;
  userOfficeId: string;
  userOfficeName: string;
  bundleId?: string;
  trackingNumbers?: string[];
  reason?: string;
};

export type RetrieveOutboundResult = {
  success: boolean;
  retrievedCount: number;
  isPartial: boolean;
  message: string;
};

/**
 * DOCUMENT RETRIEVE (UNDO TRANSFER) SERVICE
 *
 * Recovers outbound documents/bundles that were transferred by mistake
 * before they are received by the destination office.
 */
export async function retrieveOutboundDocuments(
  params: RetrieveOutboundParams
): Promise<RetrieveOutboundResult> {
  const { ownerAdminId, userId, userName, userOfficeId, userOfficeName, reason } = params;

  return await prisma.$transaction(async (tx) => {
    let targetTrackingNumbers: string[] = [];
    let bundle: any = null;

    if (params.bundleId) {
      bundle = await tx.bundle.findUnique({
        where: { id: params.bundleId },
        include: {
          items: true,
          fromOffice: true,
          toOffice: true,
        },
      });

      if (!bundle) {
        throw new Error("Bundle not found.");
      }

      // Ensure retrieval is initiated by the sending office OR the same organisation.
      // The Process Office ID stored in bundle.fromOfficeId may differ from userOfficeId
      // when the user logs in via officeLocationName matching instead of ID matching.
      // We accept either: exact office ID match OR same ownerAdminId (org-level ownership).
      const isOrgOwner = bundle.ownerAdminId === ownerAdminId;
      const isOfficeOwner = bundle.fromOfficeId === userOfficeId;
      if (!isOrgOwner && !isOfficeOwner) {
        throw new Error("Only the transferring office can retrieve this bundle.");
      }

      // Filter unreceived items in the bundle
      let unreceivedItems = bundle.items.filter((item: any) => item.status !== "Received");

      if (unreceivedItems.length === 0) {
        throw new Error("Cannot retrieve bundle. All documents have already been received by the destination office.");
      }

      // If specific tracking numbers are provided alongside bundleId, restrict
      // retrieval to the requested subset (partial bundle retrieve).
      if (params.trackingNumbers && params.trackingNumbers.length > 0) {
        const requestedSet = new Set(params.trackingNumbers);
        unreceivedItems = unreceivedItems.filter((item: any) => requestedSet.has(item.trackingNumber));
        if (unreceivedItems.length === 0) {
          throw new Error("None of the selected documents are eligible for retrieval.");
        }
      }

      targetTrackingNumbers = unreceivedItems.map((item: any) => item.trackingNumber);
    } else if (params.trackingNumbers && params.trackingNumbers.length > 0) {
      targetTrackingNumbers = params.trackingNumbers;
    } else {
      throw new Error("No bundle ID or tracking numbers provided for retrieval.");
    }

    if (targetTrackingNumbers.length === 0) {
      throw new Error("No eligible unreceived documents found to retrieve.");
    }

    console.log("[DEBUG Retrieve Service] Target tracking numbers:", targetTrackingNumbers);
    console.log("[DEBUG Retrieve Service] User office ID:", userOfficeId, "User office name:", userOfficeName);

    const now = new Date();
    let retrievedCount = 0;

    for (const trackingNumber of targetTrackingNumbers) {
      // Find latest document movement
      let movement = await tx.documentMovement.findUnique({
        where: { trackingNumber },
        include: {
          fromOffice: true,
          toOffice: true,
        },
      });

      console.log(`[DEBUG Retrieve Service] Initial DocumentMovement for #${trackingNumber}:`, movement ? {
        id: movement.id,
        trackingNumber: movement.trackingNumber,
        status: movement.status,
        currentStatus: movement.currentStatus,
        fromOfficeId: movement.fromOfficeId,
        toOfficeId: movement.toOfficeId,
        currentOfficeId: movement.currentOfficeId,
      } : "NOT FOUND IN DB");

      if (!movement) {
        // Fallback: check if registration exists
        const reg = await tx.registration.findUnique({
          where: { trackingNumber },
        });

        if (!reg) {
          console.log(`[DEBUG Retrieve Service] Registration not found for #${trackingNumber}. Skipping.`);
          continue;
        }

        movement = (await tx.documentMovement.create({
          data: {
            trackingNumber: reg.trackingNumber,
            registrationId: reg.id,
            currentModule: "REGISTRATION",
            currentOfficeId: userOfficeId,
            toOfficeId: userOfficeId,
            status: "HOME",
            currentStatus: "Document In Hand",
            createdBy: userName || userId,
          },
          include: {
            fromOffice: true,
            toOffice: true,
          },
        })) as any;
        console.log(`[DEBUG Retrieve Service] Created new DocumentMovement for #${trackingNumber}`);
      } else {
        // Guard: skip only if the document was sent to another office and already received by that destination office
        const isReceivedAtOtherOffice =
          movement.toOfficeId &&
          movement.toOfficeId !== userOfficeId &&
          movement.status === "Received" &&
          movement.currentStatus === "Received";

        if (isReceivedAtOtherOffice) {
          console.log(`[DEBUG Retrieve Service] Skipped #${trackingNumber} because it was received by destination office ${movement.toOfficeId}`);
          continue;
        }
      }

      if (!movement) continue;

      const destinationOfficeName = movement.toOffice?.officeName || "Destination Office";

      // 1. Update BundleItem if item belongs to a bundle
      await tx.bundleItem.updateMany({
        where: { trackingNumber, status: { not: "Received" } },
        data: {
          status: "Retrieved",
        },
      });

      // 2. Clear active Sub Package assignment if transferred to a subpackage
      await (tx as any).subPackageMovement.updateMany({
        where: {
          trackingNumber,
          status: "In Progress",
        },
        data: {
          status: "Retrieved",
          completedAt: now,
        },
      });

      console.log(`[DEBUG Retrieve Service] BEFORE update #${trackingNumber}:`, {
        currentModule: movement.currentModule,
        currentOfficeId: movement.currentOfficeId,
        toOfficeId: movement.toOfficeId,
        status: movement.status,
        currentStatus: movement.currentStatus,
      });

      // 3. Restore the document to the module and office it was transferred from.
      // This is essential for Process outbound retrievals, and retains bundleId
      // so a partially retrieved bundle is never split into new records.
      const previousModule = movement.fromModule || "REGISTRATION";
      const previousOfficeId = movement.fromOfficeId || userOfficeId;
      const updatedMovement = await tx.documentMovement.update({
        where: { trackingNumber },
        data: {
          currentModule: previousModule,
          currentOfficeId: previousOfficeId,
          toOfficeId: previousOfficeId,
          fromOfficeId: previousOfficeId,
          status: previousModule === "PROCESS_MODULE" ? "IN_HAND" : "HOME",
          currentStatus: "Document In Hand",
          remarks: reason || `Retrieved by ${userOfficeName}`,
        },
      });

      console.log(`[DEBUG Retrieve Service] AFTER update #${trackingNumber}:`, {
        currentModule: updatedMovement.currentModule,
        currentOfficeId: updatedMovement.currentOfficeId,
        toOfficeId: updatedMovement.toOfficeId,
        status: updatedMovement.status,
        currentStatus: updatedMovement.currentStatus,
      });

      // 4. Update Registration trackingStatus & bmStatus to make document visible in sender's Document In Hand
      const reg = await tx.registration.findUnique({
        where: { trackingNumber },
        select: { id: true, trackingStatus: true, bmStatus: true },
      });

      if (reg) {
        // Prevent retrieval if completed or delivered
        if (reg.trackingStatus === "Completed" || reg.trackingStatus === "Delivered") {
          console.log(`[DEBUG Retrieve Service] Skipped #${trackingNumber} registration update because trackingStatus is ${reg.trackingStatus}`);
          continue;
        }

        await tx.registration.update({
          where: { trackingNumber },
          data: {
            trackingStatus: "Document In Hand",
            bmStatus: "Document In Hand",
          },
        });

        // 5. Record DocumentWorkflowHistory entry
        await tx.documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber,
            workflowStep: "Document Retrieve",
            status: "Retrieved",
            performedBy: userName || userId,
            remarks: reason || `Retrieved by ${userOfficeName}`,
            ownerAdminId,
          },
        });
      }

      // 6. Record MovementHistory entry
      await tx.movementHistory.create({
        data: {
          trackingNumber,
          action: "Retrieved",
          oldStatus: movement.status || "Transferred",
          newStatus: "Retrieved",
          oldOffice: destinationOfficeName,
          newOffice: userOfficeName,
          performedBy: userName || userId,
          remarks: reason || `Retrieved by ${userOfficeName}`,
        },
      });

      // 7. Update BranchMovementRecord if present
      const latestBranchMovement = await tx.branchMovementRecord.findFirst({
        where: {
          trackingNumber,
          ownerAdminId,
          movementStatus: "In Transit",
        },
        orderBy: { createdAt: "desc" },
      });

      if (latestBranchMovement) {
        await tx.branchMovementRecord.update({
          where: { id: latestBranchMovement.id },
          data: {
            movementStatus: "Retrieved",
            remarks: reason || `Retrieved by ${userOfficeName}`,
          },
        });
      }

      retrievedCount++;
      console.log(`[DEBUG Retrieve Service] Successfully retrieved #${trackingNumber}. Total retrieved count: ${retrievedCount}`);
    }

    let isPartial = false;

    // If bundle was provided, update Bundle status
    if (bundle) {
      const allItems = await tx.bundleItem.findMany({
        where: { bundleId: bundle.id },
      });

      const totalCount = allItems.length;
      const receivedCount = allItems.filter((i: any) => i.status === "Received").length;
      const retrievedItemsCount = allItems.filter((i: any) => i.status === "Retrieved").length;

      if (retrievedItemsCount + receivedCount === totalCount) {
        if (receivedCount > 0) {
          isPartial = true;
          await tx.bundle.update({
            where: { id: bundle.id },
            data: { status: "Retrieved Partially" },
          });
        } else {
          await tx.bundle.update({
            where: { id: bundle.id },
            data: { status: "Retrieved" },
          });
        }
      } else {
        isPartial = true;
        await tx.bundle.update({
          where: { id: bundle.id },
          data: { status: "Retrieved Partially" },
        });
      }

      // Notify destination office users
      try {
        const destUsers = await tx.user.findMany({
          where: {
            ownerAdminId,
            officeLocationId: bundle.toOfficeId,
          },
          select: { id: true },
        });

        for (const destUser of destUsers) {
          await createNotification({
            userId: destUser.id,
            title: "Bundle Retrieved",
            message: `Bundle ${bundle.bundleNumber} has been retrieved by ${userOfficeName} before receiving.`,
            type: "SYSTEM",
            ownerAdminId,
          });
        }
      } catch (notifErr) {
        console.error("[retrieveOutboundDocuments] Notification error:", notifErr);
      }
    }

    console.log("[DEBUG Retrieve Service] Final retrievedCount:", retrievedCount);

    return {
      success: true,
      retrievedCount,
      isPartial,
      message: `Successfully retrieved ${retrievedCount} document(s) back to ${userOfficeName}.`,
    };
  }, { timeout: 60000 });
}
