import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEARCHING FOR COMPLETED DOCUMENTS IN DOCUMENT IN HAND ===");

  // Find all DocumentMovements currently in DOCUMENT_IN_HAND or status Received / HOME
  const inHandDMs = await prisma.documentMovement.findMany({
    where: {
      OR: [
        { currentModule: "DOCUMENT_IN_HAND" },
        { currentModule: "HOME" },
        { currentStatus: "Document In Hand" },
        { currentStatus: "HOME" },
        { status: "Received" },
        { status: "HOME" },
        { status: "Document In Hand" },
      ],
    },
    include: {
      registration: true,
      currentOffice: true,
      toOffice: true,
      fromOffice: true,
    },
  });

  console.log(`Found ${inHandDMs.length} documents in Document In Hand / HOME.`);

  let matchCount = 0;

  for (const dm of inHandDMs) {
    const reg = dm.registration;
    if (!reg) continue;

    const currentOfficeName = dm.currentOffice?.officeName || "";
    const currentOfficeId = dm.currentOfficeId || "";
    const deliveryLocation = reg.deliveryLocation || "";

    const isOfficeMatch = Boolean(
      deliveryLocation &&
      (
        (currentOfficeName && currentOfficeName.trim().toLowerCase() === deliveryLocation.trim().toLowerCase()) ||
        (currentOfficeId && currentOfficeId.trim().toLowerCase() === deliveryLocation.trim().toLowerCase())
      )
    );

    // Also check if deliveryLocation matches ANY office name/id that corresponds to currentOffice
    const check = await verifyMainProcessCompleted(reg.trackingNumber, reg.ownerAdminId!);

    // Also check movement history for process completion
    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: reg.trackingNumber },
      orderBy: { performedAt: "desc" },
    });

    const isMarkedCompleted = history.some(h => 
      h.action === "Marked as COMPLETED" || 
      h.newStatus === "COMPLETED"
    );

    const isSubPkgCompleted = history.some(h =>
      h.action === "Sub Package Completed" ||
      h.newStatus === "Completed"
    );

    if (isOfficeMatch) {
      matchCount++;
      console.log(`\n--------------------------------------------------`);
      console.log(`Tracking #: ${reg.trackingNumber} | Customer: ${reg.customerName}`);
      console.log(`Process Type: "${reg.processType}"`);
      console.log(`Delivery Location: "${deliveryLocation}"`);
      console.log(`Current Office: "${currentOfficeName}" (${currentOfficeId})`);
      console.log(`DM: status="${dm.status}", currentStatus="${dm.currentStatus}", currentModule="${dm.currentModule}"`);
      console.log(`Registration: trackingStatus="${reg.trackingStatus}", bmStatus="${reg.bmStatus}"`);
      console.log(`verifyMainProcessCompleted: isCompleted=${check.isCompleted}, msg="${check.message || ''}"`);
      console.log(`History has "Marked as COMPLETED": ${isMarkedCompleted}`);
      console.log(`History has "Sub Package Completed": ${isSubPkgCompleted}`);
      console.log(`Recent History (last 4):`);
      for (const h of history.slice(0, 4)) {
        console.log(`  [${h.performedAt.toISOString()}] action="${h.action}", oldStatus="${h.oldStatus}", newStatus="${h.newStatus}", oldOffice="${h.oldOffice}", newOffice="${h.newOffice}"`);
      }
    }
  }

  console.log(`\nTotal office-matched in-hand documents: ${matchCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
