import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== INVESTIGATING DOCUMENTS 8564 AND 123456 ===");

  const trackingNumbers = ["8564", "123456"];

  for (const tNum of trackingNumbers) {
    console.log(`\n--- DOCUMENT ${tNum} ---`);
    const reg = await prisma.registration.findUnique({
      where: { trackingNumber: tNum },
    });
    console.log("Registration:", JSON.stringify(reg, null, 2));

    const docMovs = await prisma.documentMovement.findMany({
      where: { trackingNumber: tNum },
      include: {
        fromOffice: true,
        toOffice: true,
        currentOffice: true,
        returnOffice: true,
        originalProcessOffice: true,
        bundle: {
          include: {
            fromOffice: true,
            toOffice: true,
            items: true,
          },
        },
      },
    });
    console.log("DocumentMovements:", JSON.stringify(docMovs, null, 2));

    const movements = await prisma.movementHistory.findMany({
      where: { trackingNumber: tNum },
      orderBy: { performedAt: "desc" },
    });
    console.log("MovementHistory:", JSON.stringify(movements, null, 2));

    const bundleItems = await prisma.bundleItem.findMany({
      where: { trackingNumber: tNum },
      include: {
        bundle: {
          include: {
            fromOffice: true,
            toOffice: true,
          },
        },
      },
    });
    console.log("BundleItems:", JSON.stringify(bundleItems, null, 2));
  }

  console.log("\n=== ALL OFFICES IN DATABASE ===");
  const assignedOffices = await prisma.assignedOffice.findMany();
  console.log("AssignedOffices:", JSON.stringify(assignedOffices, null, 2));

  const officeLocations = await prisma.officeLocation.findMany();
  console.log("OfficeLocations:", JSON.stringify(officeLocations, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
