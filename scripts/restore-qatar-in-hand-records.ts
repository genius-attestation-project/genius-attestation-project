import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== EXECUTING DATA RESTORATION FOR 31 QATAR IN-HAND RECORDS ===");
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  
  const qatarOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius Qatar" }
  });

  if (!qatarOffice) {
    throw new Error("Genius Qatar office location not found!");
  }

  const qatarOfficeId = qatarOffice.id;

  const targetMovements = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      originOfficeId: qatarOfficeId,
      currentOfficeId: null,
    },
    include: {
      registration: true,
    }
  });

  console.log(`Found ${targetMovements.length} movements needing currentOfficeId restoration.`);

  if (targetMovements.length === 0) {
    console.log("No records need restoration.");
    return;
  }

  const movIds = targetMovements.map((m) => m.id);
  const regIds = targetMovements.map((m) => m.registrationId).filter(Boolean) as string[];

  // 1. Bulk update movements
  const updateRes = await prisma.documentMovement.updateMany({
    where: { id: { in: movIds } },
    data: {
      currentOfficeId: qatarOfficeId,
      fromOfficeId: qatarOfficeId,
      toOfficeId: qatarOfficeId,
      updatedAt: new Date(),
    },
  });
  console.log(`Updated ${updateRes.count} document_movements.`);

  // 2. Bulk create audit trails
  if (regIds.length > 0) {
    const auditRes = await prisma.auditTrail.createMany({
      data: regIds.map((regId) => ({
        registrationId: regId,
        action: "Data Restoration: Office Location Synced",
        performedBy: "System Migration",
        description: `Document movement office synchronized to ${qatarOffice.officeName} for Document In Hand consistency.`,
      })),
    });
    console.log(`Created ${auditRes.count} audit trail entries.`);
  }

  console.log("Data restoration completed successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
