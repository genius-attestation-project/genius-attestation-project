import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  const bundles = await prisma.bundle.findMany({
    where: {
      bundleNumber: { in: [
        "PROC-20260917-2656",
        "PROC-20260917-8218",
        "PROC-20260917-9157",
        "PROC-20260917-5850",
        "PROC-20260917-6893",
        "PROC-20260917-9256",
        "PROC-20260917-9488",
        "PROC-20260917-4992",
        "PROC-20260917-8690",
        "PROC-20260917-6452",
        "PROC-20260917-3493",
        "PROC-20260917-1940",
        "PROC-20260917-6868",
        "PROC-20260917-2344",
        "PROC-20260917-5917",
        "PROC-20260917-8523"
      ] }
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    }
  });

  for (const b of bundles) {
    console.log(`\n========================================`);
    console.log(`Bundle ${b.bundleNumber} (${b.status}): from ${b.fromOffice?.officeName} -> to ${b.toOffice?.officeName}`);
    for (const item of b.items) {
      const reg = await prisma.registration.findUnique({
        where: { trackingNumber: item.trackingNumber },
        include: {
          documentMovements: {
            include: { currentOffice: true, toOffice: true }
          }
        }
      });
      if (!reg) continue;
      const dm = reg.documentMovements[0];
      const check = await verifyMainProcessCompleted(item.trackingNumber, b.ownerAdminId!);
      const history = await prisma.movementHistory.findMany({
        where: { trackingNumber: item.trackingNumber },
        orderBy: { performedAt: "desc" },
        take: 3
      });
      console.log(`  Tracking: ${item.trackingNumber} | Customer: ${reg.customerName}`);
      console.log(`    ProcessType: "${reg.processType}" | DeliveryLocation: "${reg.deliveryLocation}"`);
      console.log(`    DM: status="${dm?.status}", currentStatus="${dm?.currentStatus}", currentModule="${dm?.currentModule}", currentOffice="${dm?.currentOffice?.officeName}"`);
      console.log(`    Reg: trackingStatus="${reg.trackingStatus}", bmStatus="${reg.bmStatus}"`);
      console.log(`    verifyMainProcessCompleted: isCompleted=${check.isCompleted}, msg="${check.message || ''}"`);
      console.log(`    Recent history:`, history.map(h => `[${h.action}: ${h.oldStatus} -> ${h.newStatus}] (${h.oldOffice} -> ${h.newOffice})`));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
