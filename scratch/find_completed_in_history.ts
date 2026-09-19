import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEARCHING FOR DOCUMENTS WITH 'Marked as COMPLETED' IN HISTORY ===");

  const histories = await prisma.movementHistory.findMany({
    where: {
      OR: [
        { action: "Marked as COMPLETED" },
        { newStatus: "COMPLETED" },
      ]
    },
    orderBy: { performedAt: "desc" }
  });

  console.log(`Found ${histories.length} history entries with Marked as COMPLETED / COMPLETED.`);

  const trackingNumbers = Array.from(new Set(histories.map(h => h.trackingNumber)));
  console.log(`Distinct tracking numbers: ${trackingNumbers.length}`);

  for (const tNum of trackingNumbers) {
    const reg = await prisma.registration.findUnique({
      where: { trackingNumber: tNum },
      include: {
        documentMovements: {
          include: { currentOffice: true, toOffice: true }
        }
      }
    });

    if (!reg) continue;

    const dm = reg.documentMovements[0];
    const check = await verifyMainProcessCompleted(tNum, reg.ownerAdminId!);

    console.log(`\nDoc #${tNum} (${reg.customerName}):`);
    console.log(`  ProcessType: "${reg.processType}" | DeliveryLocation: "${reg.deliveryLocation}"`);
    console.log(`  Current Office: "${dm?.currentOffice?.officeName}" | ToOffice: "${dm?.toOffice?.officeName}"`);
    console.log(`  DM: status="${dm?.status}", currentStatus="${dm?.currentStatus}", currentModule="${dm?.currentModule}"`);
    console.log(`  Registration: trackingStatus="${reg.trackingStatus}", bmStatus="${reg.bmStatus}"`);
    console.log(`  verifyMainProcessCompleted: isCompleted=${check.isCompleted}, msg="${check.message || ''}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
