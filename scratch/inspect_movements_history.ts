import { prisma } from "../src/lib/prisma";

async function main() {
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";

  console.log("=== MOVEMENT HISTORY FOR 4409900 ===");
  const mHistory4409900 = await prisma.movementHistory.findMany({
    where: { trackingNumber: "4409900" },
    orderBy: { performedAt: "asc" },
  });
  console.log(mHistory4409900);

  const docMovs4409900 = await prisma.documentMovement.findMany({
    where: { trackingNumber: "4409900" },
    include: { fromOffice: true, toOffice: true, currentOffice: true, bundle: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("DocumentMovements:", docMovs4409900.map(m => ({
    id: m.id,
    fromModule: m.fromModule,
    toModule: m.toModule,
    currentModule: m.currentModule,
    status: m.status,
    currentStatus: m.currentStatus,
    fromOffice: m.fromOffice?.officeName,
    toOffice: m.toOffice?.officeName,
    currentOffice: m.currentOffice?.officeName,
    currentOfficeId: m.currentOfficeId,
    bundleNumber: m.bundle?.bundleNumber,
    bundleStatus: m.bundle?.status,
    createdAt: m.createdAt,
  })));

  console.log("\n=== MOVEMENT HISTORY FOR 4557847 ===");
  const mHistory4557847 = await prisma.movementHistory.findMany({
    where: { trackingNumber: "4557847" },
    orderBy: { performedAt: "asc" },
  });
  console.log(mHistory4557847);

  console.log("\n=== INSPECTING QATAR 31 IN-HAND DOCUMENTS ===");
  const qatarDocs = await prisma.registration.findMany({
    where: {
      ownerAdminId,
      trackingStatus: "Document In Hand",
      regionOfRegistration: "Genius Qatar",
    },
    include: {
      documentMovements: {
        include: { fromOffice: true, toOffice: true, currentOffice: true, bundle: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  console.log(`Qatar In-Hand Count: ${qatarDocs.length}`);
  for (const q of qatarDocs.slice(0, 5)) {
    console.log(`Qatar doc ${q.trackingNumber}:`, {
      regOffice: q.regionOfRegistration,
      delivery: q.deliveryLocation,
      movCount: q.documentMovements.length,
      latestMov: q.documentMovements[0] ? {
        status: q.documentMovements[0].status,
        currentStatus: q.documentMovements[0].currentStatus,
        fromModule: q.documentMovements[0].fromModule,
        toModule: q.documentMovements[0].toModule,
        currentModule: q.documentMovements[0].currentModule,
        currentOfficeId: q.documentMovements[0].currentOfficeId,
        currentOffice: q.documentMovements[0].currentOffice?.officeName,
      } : null,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
