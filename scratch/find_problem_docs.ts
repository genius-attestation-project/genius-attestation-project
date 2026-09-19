import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEARCHING FOR DOCUMENTS STUCK IN DOCUMENT IN HAND ===");

  // Find all DocumentMovements where currentModule is DOCUMENT_IN_HAND or status is Received / Document In Hand
  const movements = await prisma.documentMovement.findMany({
    where: {
      OR: [
        { currentModule: "DOCUMENT_IN_HAND" },
        { currentStatus: "Document In Hand" },
        { status: "Received" },
        { status: "Document In Hand" },
      ],
    },
    include: {
      registration: true,
      currentOffice: true,
      toOffice: true,
      fromOffice: true,
      bundle: {
        include: { fromOffice: true, toOffice: true }
      }
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Checking ${movements.length} movements...`);

  for (const dm of movements) {
    const reg = dm.registration;
    if (!reg) continue;

    const currentOfficeName = dm.currentOffice?.officeName || "";
    const currentOfficeId = dm.currentOfficeId || "";
    const deliveryLocation = reg.deliveryLocation || "";

    // Office match check
    const isMatch = Boolean(
      deliveryLocation &&
      (
        (currentOfficeName && currentOfficeName.trim().toLowerCase() === deliveryLocation.trim().toLowerCase()) ||
        (currentOfficeId && currentOfficeId.trim().toLowerCase() === deliveryLocation.trim().toLowerCase())
      )
    );

    if (!isMatch) continue;

    // Check verifyMainProcessCompleted
    const check = await verifyMainProcessCompleted(reg.trackingNumber, reg.ownerAdminId!);

    // Check history
    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: reg.trackingNumber },
      orderBy: { performedAt: "desc" },
    });

    const isMarkedCompleted = history.some(h => 
      h.action === "Marked as COMPLETED" || 
      h.newStatus === "COMPLETED"
    );

    const hasSubPkgCompleted = history.some(h =>
      h.action === "Sub Package Completed" ||
      h.newStatus === "Completed"
    );

    // If check.isCompleted is true, OR isMarkedCompleted is true, why is it in Document In Hand?!
    if (check.isCompleted || isMarkedCompleted) {
      console.log(`\n========================================`);
      console.log(`STUCK DOCUMENT: ${reg.trackingNumber} (${reg.customerName})`);
      console.log(`  ProcessType: "${reg.processType}"`);
      console.log(`  DeliveryLocation: "${deliveryLocation}"`);
      console.log(`  CurrentOffice: "${currentOfficeName}" (${currentOfficeId})`);
      console.log(`  DM: status="${dm.status}", currentStatus="${dm.currentStatus}", currentModule="${dm.currentModule}"`);
      console.log(`  Registration: trackingStatus="${reg.trackingStatus}", bmStatus="${reg.bmStatus}"`);
      console.log(`  verifyMainProcessCompleted: isCompleted=${check.isCompleted}, msg="${check.message || ''}"`);
      console.log(`  History has "Marked as COMPLETED": ${isMarkedCompleted}`);
      console.log(`  History has "Sub Package Completed": ${hasSubPkgCompleted}`);
      console.log(`  Bundle: ${dm.bundle?.bundleNumber} (${dm.bundle?.fromOffice?.officeName} -> ${dm.bundle?.toOffice?.officeName})`);
      console.log(`  History (all):`);
      for (const h of history) {
        console.log(`    [${h.performedAt.toISOString()}] action="${h.action}", oldStatus="${h.oldStatus}", newStatus="${h.newStatus}", oldOffice="${h.oldOffice}", newOffice="${h.newOffice}"`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
