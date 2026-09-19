import { PrismaClient } from "@prisma/client";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INVESTIGATING QATAR INBOUND & IN-HAND DOCUMENTS ===");

  // Find all documents where deliveryLocation is Genius Qatar or currentOffice is Genius Qatar
  const qatarOffice = await prisma.officeLocation.findFirst({
    where: { officeName: { contains: "Qatar" } },
  });
  console.log("Qatar Office:", qatarOffice?.officeName, qatarOffice?.id);

  const docs = await prisma.registration.findMany({
    where: {
      OR: [
        { deliveryLocation: "Genius Qatar" },
        { documentMovements: { some: { currentOfficeId: qatarOffice?.id } } },
        { documentMovements: { some: { toOfficeId: qatarOffice?.id } } },
      ],
    },
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          toOffice: true,
          fromOffice: true,
          bundle: true,
        },
      },
    },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Found ${docs.length} documents related to Qatar.`);

  for (const doc of docs) {
    const dm = doc.documentMovements[0];
    const check = await verifyMainProcessCompleted(doc.trackingNumber, doc.ownerAdminId!);

    // check if history has process completion
    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: doc.trackingNumber },
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

    const isAtQatar = 
      dm?.currentOffice?.officeName === "Genius Qatar" || 
      dm?.currentOfficeId === qatarOffice?.id ||
      dm?.toOffice?.officeName === "Genius Qatar" ||
      dm?.toOfficeId === qatarOffice?.id;

    const deliveryMatchesQatar = doc.deliveryLocation?.toLowerCase() === "genius qatar";

    if (check.isCompleted || isMarkedCompleted || isSubPkgCompleted) {
      console.log(`\nDoc #${doc.trackingNumber} (${doc.customerName}):`);
      console.log(`  ProcessType: "${doc.processType}" | DeliveryLocation: "${doc.deliveryLocation}"`);
      console.log(`  DM: status="${dm?.status}", currentStatus="${dm?.currentStatus}", currentModule="${dm?.currentModule}"`);
      console.log(`  Current Office: "${dm?.currentOffice?.officeName}" | To Office: "${dm?.toOffice?.officeName}"`);
      console.log(`  Delivery matches Qatar: ${deliveryMatchesQatar} | Is at Qatar: ${isAtQatar}`);
      console.log(`  verifyMainProcessCompleted: isCompleted=${check.isCompleted}, msg="${check.message || ''}"`);
      console.log(`  History has Marked as COMPLETED: ${isMarkedCompleted}`);
      console.log(`  History has Sub Package Completed: ${isSubPkgCompleted}`);
      console.log(`  Last 3 history actions:`, history.slice(0, 3).map(h => `[${h.action}: ${h.oldStatus} -> ${h.newStatus}] (${h.oldOffice} -> ${h.newOffice})`));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
