import { prisma } from "../src/lib/prisma";

async function main() {
  const docs = await prisma.registration.findMany({
    where: { trackingNumber: { in: ["6565", "4444", "444"] } },
    include: {
      documentMovements: {
        include: {
          fromOffice: true,
          toOffice: true,
          currentOffice: true,
          returnOffice: true,
          originalProcessOffice: true,
        },
      },
    },
  });
  console.log("DOCS:", JSON.stringify(docs, null, 2));

  for (const doc of docs) {
    const bundles = await prisma.bundleItem.findMany({
      where: { trackingNumber: doc.trackingNumber },
      include: {
        bundle: {
          include: {
            fromOffice: true,
            toOffice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(`BUNDLES for ${doc.trackingNumber}:`, JSON.stringify(bundles, null, 2));

    const movements = await prisma.movementHistory.findMany({
      where: { trackingNumber: doc.trackingNumber },
      orderBy: { performedAt: "desc" },
    });
    console.log(`MOVEMENT HISTORY for ${doc.trackingNumber}:`, JSON.stringify(movements, null, 2));
  }

  const assignedOffices = await (prisma as any).assignedOffice.findMany();
  console.log("ASSIGNED OFFICES:", JSON.stringify(assignedOffices, null, 2));

  const officeLocations = await prisma.officeLocation.findMany();
  console.log("OFFICE LOCATIONS:", JSON.stringify(officeLocations, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
