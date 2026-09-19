import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING ALL DOCUMENTS AND THEIR PROCESS COMPLETION STATUS ===");
  
  const regs = await prisma.registration.findMany({
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          fromOffice: true,
          toOffice: true,
        },
      },
    },
  });

  console.log(`Total registrations in DB: ${regs.length}`);

  for (const reg of regs) {
    const check = await verifyMainProcessCompleted(reg.trackingNumber, reg.ownerAdminId!);
    
    // Also check movement history
    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: reg.trackingNumber },
      orderBy: { performedAt: "desc" },
    });

    const dm = reg.documentMovements[0];
    const hasCompletedInHistory = history.some(h => 
      h.action === "Marked as COMPLETED" || 
      h.newStatus === "COMPLETED"
    );

    const hasSubPkgCompletedInHistory = history.some(h =>
      h.action === "Sub Package Completed" ||
      h.newStatus === "Completed"
    );

    console.log(`\nDoc #${reg.trackingNumber} (${reg.customerName}):`);
    console.log(`  ProcessType: "${reg.processType}" | DeliveryLocation: "${reg.deliveryLocation}"`);
    console.log(`  Current Office: "${dm?.currentOffice?.officeName}" (id: ${dm?.currentOfficeId}) | ToOffice: "${dm?.toOffice?.officeName}" (id: ${dm?.toOfficeId})`);
    console.log(`  DM Status: "${dm?.status}" | CurrentStatus: "${dm?.currentStatus}" | CurrentModule: "${dm?.currentModule}"`);
    console.log(`  verifyMainProcessCompleted result: isCompleted=${check.isCompleted}, msg="${check.message || ''}"`);
    console.log(`  History has Marked as COMPLETED: ${hasCompletedInHistory}`);
    console.log(`  History has Sub Package Completed: ${hasSubPkgCompletedInHistory}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
