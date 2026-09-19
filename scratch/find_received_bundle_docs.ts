import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEARCHING BUNDLE ITEMS WHERE BUNDLE WAS RECEIVED ===");

  // Find all bundles received
  const bundles = await prisma.bundle.findMany({
    where: {
      status: "Received",
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  console.log(`Found ${bundles.length} received bundles.`);

  for (const b of bundles) {
    console.log(`\n========================================`);
    console.log(`Bundle: ${b.bundleNumber} | From: ${b.fromOffice?.officeName} -> To: ${b.toOffice?.officeName}`);
    console.log(`To Office ID: ${b.toOfficeId}`);
    
    for (const item of b.items) {
      const reg = await prisma.registration.findUnique({
        where: { trackingNumber: item.trackingNumber },
        include: {
          documentMovements: {
            include: {
              currentOffice: true,
              toOffice: true,
            },
          },
        },
      });

      if (!reg) continue;

      const dm = reg.documentMovements[0];
      const check = await verifyMainProcessCompleted(item.trackingNumber, b.ownerAdminId!);

      const receivingOfficeName = b.toOffice?.officeName || "";
      const receivingOfficeId = b.toOfficeId || "";
      const deliveryLocation = reg.deliveryLocation || "";

      const isOfficeMatch = Boolean(
        deliveryLocation &&
        (
          (receivingOfficeName && receivingOfficeName.trim().toLowerCase() === deliveryLocation.trim().toLowerCase()) ||
          (receivingOfficeId && receivingOfficeId.trim().toLowerCase() === deliveryLocation.trim().toLowerCase())
        )
      );

      const history = await prisma.movementHistory.findMany({
        where: { trackingNumber: item.trackingNumber },
        orderBy: { performedAt: "desc" },
      });

      const isMarkedCompleted = history.some(h => 
        h.action === "Marked as COMPLETED" || 
        h.newStatus === "COMPLETED"
      );

      console.log(`  Item: ${item.trackingNumber} (${reg.customerName})`);
      console.log(`    ProcessType: "${reg.processType}" | DeliveryLocation: "${deliveryLocation}"`);
      console.log(`    Receiving Office: "${receivingOfficeName}" (${receivingOfficeId})`);
      console.log(`    Office Match: ${isOfficeMatch}`);
      console.log(`    verifyMainProcessCompleted: isCompleted=${check.isCompleted}, msg="${check.message || ''}"`);
      console.log(`    DM: status="${dm?.status}", currentStatus="${dm?.currentStatus}", currentModule="${dm?.currentModule}"`);
      console.log(`    Registration: trackingStatus="${reg.trackingStatus}", bmStatus="${reg.bmStatus}"`);
      console.log(`    History has "Marked as COMPLETED": ${isMarkedCompleted}`);
      console.log(`    Last 2 History actions:`, history.slice(0, 2).map(h => `[${h.action}: ${h.newStatus}]`));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
