import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEARCHING ONLY FOR COMPLETED DOCUMENTS IN DOCUMENT IN HAND ===");

  const movements = await prisma.documentMovement.findMany({
    where: {
      currentModule: "DOCUMENT_IN_HAND",
      status: "Received",
    },
    include: {
      registration: true,
      currentOffice: true,
      toOffice: true,
      fromOffice: true,
    },
  });

  let completedCount = 0;

  for (const dm of movements) {
    const reg = dm.registration;
    if (!reg || !reg.deliveryLocation) continue;

    const officeName = dm.currentOffice?.officeName || "";
    const officeId = dm.currentOfficeId || "";
    const deliveryLocation = reg.deliveryLocation.trim();

    const isMatch = 
      officeName.toLowerCase() === deliveryLocation.toLowerCase() ||
      officeId.toLowerCase() === deliveryLocation.toLowerCase();

    if (!isMatch) continue;

    const check = await verifyMainProcessCompleted(reg.trackingNumber, reg.ownerAdminId!);
    if (check.isCompleted) {
      completedCount++;
      console.log(`\n----------------------------------------`);
      console.log(`COMPLETED DOCUMENT IN HAND: ${reg.trackingNumber} (${reg.customerName})`);
      console.log(`  ProcessType: "${reg.processType}" | DeliveryLocation: "${reg.deliveryLocation}"`);
      console.log(`  CurrentOffice: "${dm.currentOffice?.officeName}" (${dm.currentOfficeId})`);
      console.log(`  DM: status="${dm.status}", currentStatus="${dm.currentStatus}", currentModule="${dm.currentModule}"`);
      console.log(`  Reg: trackingStatus="${reg.trackingStatus}", bmStatus="${reg.bmStatus}"`);
    }
  }

  console.log(`\nTotal completed documents in Document In Hand: ${completedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
