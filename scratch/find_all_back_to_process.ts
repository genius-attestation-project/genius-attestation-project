import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== CHECKING ALL BACK TO PROCESS DOCUMENTS ACROSS THE SYSTEM ===");

  // 1. Check all MovementHistory with action = 'Back To Process' or similar
  const backToProcessHistory = await prisma.movementHistory.findMany({
    where: {
      OR: [
        { action: { contains: "Back To Process" } },
        { action: { contains: "Back to Process" } },
        { remarks: { contains: "Transferred back to" } },
      ]
    },
    orderBy: { performedAt: "desc" }
  });

  console.log(`Found ${backToProcessHistory.length} MovementHistory entries related to Back To Process.`);
  for (const h of backToProcessHistory) {
    console.log(`History ID: ${h.id}, Tracking: ${h.trackingNumber}, Action: ${h.action}, Old: ${h.oldOffice} (${h.oldStatus}) -> New: ${h.newOffice} (${h.newStatus}), PerformedBy: ${h.performedBy}, PerformedAt: ${h.performedAt}, Remarks: ${h.remarks}`);
  }

  const allTNums = Array.from(new Set(backToProcessHistory.map(h => h.trackingNumber)));
  console.log(`\nUnique tracking numbers: ${allTNums.join(", ")}`);

  for (const tNum of allTNums) {
    console.log(`\n--- DOCUMENT ${tNum} CURRENT STATE ---`);
    const reg = await prisma.registration.findUnique({
      where: { trackingNumber: tNum },
      select: {
        id: true,
        trackingNumber: true,
        customerName: true,
        regionOfRegistration: true,
        trackingStatus: true,
        bmStatus: true,
        ownerAdminId: true,
      }
    });
    console.log("Registration:", reg);

    const docMov = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNum },
      include: {
        fromOffice: true,
        toOffice: true,
        currentOffice: true,
        bundle: {
          include: {
            fromOffice: true,
            toOffice: true,
            items: true,
          }
        }
      }
    });
    console.log("DocumentMovement:", {
      id: docMov?.id,
      fromModule: docMov?.fromModule,
      toModule: docMov?.toModule,
      currentModule: docMov?.currentModule,
      status: docMov?.status,
      currentStatus: docMov?.currentStatus,
      fromOffice: docMov?.fromOffice?.officeName,
      toOffice: docMov?.toOffice?.officeName,
      currentOffice: docMov?.currentOffice?.officeName,
      bundleNumber: docMov?.bundle?.bundleNumber,
      bundleStatus: docMov?.bundle?.status,
      bundleToOffice: docMov?.bundle?.toOffice?.officeName,
      bundleItems: docMov?.bundle?.items?.map(i => ({ tracking: i.trackingNumber, status: i.status }))
    });
  }

  // Also check all bundles created with BND-PROC
  console.log("\n=== ALL BND-PROC BUNDLES ===");
  const procBundles = await prisma.bundle.findMany({
    where: {
      bundleNumber: { startsWith: "BND-PROC" }
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true
    }
  });
  console.log(`Found ${procBundles.length} BND-PROC bundles:`);
  for (const b of procBundles) {
    console.log(`Bundle ${b.bundleNumber} (ID: ${b.id}): from ${b.fromOffice?.officeName} -> to ${b.toOffice?.officeName}, status: ${b.status}, items: ${b.items.map(i => `${i.trackingNumber} (${i.status})`).join(", ")}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
