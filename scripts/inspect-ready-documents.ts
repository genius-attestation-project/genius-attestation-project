import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Inspecting Registrations and Movements ===");
  const readyRegistrations = await prisma.registration.findMany({
    where: {
      OR: [
        { trackingStatus: { in: ["Ready for Delivery", "Ready For Delivery"] } },
        { bmStatus: { in: ["Ready for Delivery", "Ready For Delivery"] } },
        { documentMovements: { some: { status: { in: ["Ready for Delivery", "Ready For Delivery"] } } } },
        { documentMovements: { some: { currentStatus: { in: ["Ready for Delivery", "Ready For Delivery", "READY_FOR_DELIVERY"] } } } },
        { documentMovements: { some: { currentModule: "READY_FOR_DELIVERY" } } },
      ],
    },
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

  console.log(`Found ${readyRegistrations.length} registrations in Ready for Delivery states.`);

  for (const reg of readyRegistrations) {
    console.log("\n--------------------------------------------------");
    console.log(`Tracking #: ${reg.trackingNumber}`);
    console.log(`Customer: ${reg.customerName}`);
    console.log(`Process Type: ${reg.processType}`);
    console.log(`Delivery Location: ${reg.deliveryLocation}`);
    console.log(`Region of Reg: ${reg.regionOfRegistration}`);
    console.log(`Tracking Status: ${reg.trackingStatus}, BM Status: ${reg.bmStatus}`);

    // Check master process type configuration
    let configuredSubPackages: any[] = [];
    if (reg.processType) {
      const masterProcess = await prisma.masterData.findFirst({
        where: {
          type: "PROCESS_TYPES",
          name: reg.processType,
          ownerAdminId: reg.ownerAdminId || undefined,
        },
        include: {
          subPackages: true,
        },
      });
      configuredSubPackages = masterProcess?.subPackages || [];
      console.log(`Master Process Configured Activities (${configuredSubPackages.length}):`, configuredSubPackages.map(sp => `${sp.name} (${sp.id})`));
    }

    // Check SubPackageMovements
    const subMovements = await (prisma as any).subPackageMovement.findMany({
      where: { trackingNumber: reg.trackingNumber },
      include: { assignedOffice: true },
    });
    console.log(`SubPackageMovements (${subMovements.length}):`);
    for (const sm of subMovements) {
      console.log(`  - SubPackageId: ${sm.subPackageId}, Status: ${sm.status}, Assigned Office: ${sm.assignedOffice?.officeName || sm.assignedOfficeId}`);
    }

    // Check document movements
    console.log(`DocumentMovements (${reg.documentMovements.length}):`);
    for (const dm of reg.documentMovements) {
      console.log(`  - CurrentOffice: ${dm.currentOffice?.officeName || dm.currentOfficeId}, Status: ${dm.status}, CurrentStatus: ${dm.currentStatus}, CurrentModule: ${dm.currentModule}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
