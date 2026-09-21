import { prisma } from "../src/lib/prisma";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";
import { routeDocumentsToReadyForDelivery } from "../src/features/home/server/bundle-workflow.service";

async function runBackfill() {
  console.log("Starting inspection and correction of existing documents in Document In Hand...");

  const movements = await prisma.documentMovement.findMany({
    where: {
      status: { in: ["HOME", "Received", "Document In Hand", "IN_HAND"] },
      currentStatus: {
        notIn: [
          "Completed",
          "Returned",
          "Rejected",
          "In Sub Package",
          "Ready for Delivery",
          "READY_FOR_DELIVERY",
          "Registered",
          "Movement Approval Pending",
          "Advance Payment Approval Pending",
          "Delivered",
        ],
      },
    },
    include: {
      registration: true,
      currentOffice: true,
    },
  });

  console.log(`Found ${movements.length} candidate movements in Document In Hand.`);

  const trackingNumbersInHand = movements.map((m) => m.trackingNumber).filter(Boolean);

  const [completedHistories, completedSubPkgs] = await Promise.all([
    prisma.movementHistory.findMany({
      where: {
        trackingNumber: { in: trackingNumbersInHand },
        action: { in: ["Marked as COMPLETED", "COMPLETED", "Process Completed"] },
        NOT: { action: { contains: "Sub Package" } },
      },
      select: { trackingNumber: true },
    }),
    prisma.subPackageMovement.findMany({
      where: {
        trackingNumber: { in: trackingNumbersInHand },
        status: { in: ["Completed", "COMPLETED"] },
      },
      select: { trackingNumber: true },
    }),
  ]);

  const candidateTrackingSet = new Set<string>([
    ...completedHistories.map((h) => h.trackingNumber),
    ...completedSubPkgs.map((s) => s.trackingNumber),
  ]);

  console.log(`Found ${candidateTrackingSet.size} documents with completion signals.`);

  const candidateMovements = movements.filter((m) => candidateTrackingSet.has(m.trackingNumber));

  const eligibleTrackingNumbers: string[] = [];
  const chunkSize = 10;

  for (let i = 0; i < candidateMovements.length; i += chunkSize) {
    const chunk = candidateMovements.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (mov) => {
        const reg = mov.registration;
        if (!reg) return;

        const deliveryLoc = (reg.deliveryLocation || "").trim();
        if (!deliveryLoc || deliveryLoc === "-" || deliveryLoc.toLowerCase() === "unassigned") {
          return;
        }

        const mainProcessCheck = await verifyMainProcessCompleted(mov.trackingNumber, reg.ownerAdminId || "");
        if (mainProcessCheck.isCompleted) {
          console.log(`[ELIGIBLE] Tracking: ${mov.trackingNumber} | Delivery Location: ${deliveryLoc}`);
          eligibleTrackingNumbers.push(mov.trackingNumber);
        }
      })
    );
    console.log(`Processed ${Math.min(i + chunkSize, candidateMovements.length)} / ${candidateMovements.length} candidates...`);
  }

  console.log(`\nFound ${eligibleTrackingNumbers.length} eligible documents with completed Main Process in Document In Hand.`);

  if (eligibleTrackingNumbers.length === 0) {
    console.log("No existing documents need correction.");
    return;
  }

  console.log(`Routing ${eligibleTrackingNumbers.length} eligible documents to Ready For Delivery via authoritative workflow...`);

  const regs = await prisma.registration.findMany({
    where: { trackingNumber: { in: eligibleTrackingNumbers } },
    select: { trackingNumber: true, ownerAdminId: true },
  });

  const byAdmin: Record<string, string[]> = {};
  for (const r of regs) {
    const adminId = r.ownerAdminId || "";
    if (!byAdmin[adminId]) byAdmin[adminId] = [];
    byAdmin[adminId].push(r.trackingNumber);
  }

  for (const [ownerAdminId, trackings] of Object.entries(byAdmin)) {
    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: trackings,
      userId: "SYSTEM_CORRECTION",
      userName: "System Backfill",
      ownerAdminId,
      remarks: "Corrective migration: Authoritative Main Process completed and valid Delivery Location present.",
    });
    console.log("Migration Result for admin", ownerAdminId, ":", JSON.stringify(result, null, 2));
  }

  console.log("Backfill complete!");
}

runBackfill()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
