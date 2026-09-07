import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== Inspecting Historical Back to Process Records ===");

  const movements = await prisma.documentMovement.findMany({
    where: {
      OR: [
        { movementType: "BACK_TO_PROCESS" },
        { remarks: { contains: "Back To Process" } },
        { remarks: { contains: "back to process" } },
        { remarks: { contains: "Transferred back to Process" } },
      ],
    },
    include: {
      fromOffice: true,
      toOffice: true,
      currentOffice: true,
      bundle: true,
    },
  });

  console.log(`Found ${movements.length} matching document movements.`);

  let correctlyRoutedCount = 0;
  let incorrectlyRoutedCount = 0;

  for (const m of movements) {
    const isProcessModule = m.toModule === "PROCESS_MODULE" && m.currentModule === "PROCESS_MODULE";
    const isAssignedOfficeInbound = m.toModule === "ASSIGNED_OFFICE" || m.currentModule === "ASSIGNED_OFFICE";

    console.log({
      id: m.id,
      trackingNumber: m.trackingNumber,
      movementType: m.movementType,
      fromModule: m.fromModule,
      toModule: m.toModule,
      currentModule: m.currentModule,
      status: m.status,
      currentStatus: m.currentStatus,
      fromOffice: m.fromOffice?.officeName,
      toOffice: m.toOffice?.officeName,
      bundleNumber: m.bundle?.bundleNumber,
    });

    if (isProcessModule) {
      correctlyRoutedCount++;
    } else if (isAssignedOfficeInbound) {
      incorrectlyRoutedCount++;
    }
  }

  console.log("\n--- Movement History ---");
  const history = await prisma.movementHistory.findMany({
    where: {
      OR: [
        { action: "Back To Process" },
        { remarks: { contains: "Back To Process" } },
        { remarks: { contains: "back to process" } },
      ],
    },
  });
  console.log(`Found ${history.length} movement history records.`);
  for (const h of history) {
    console.log({
      trackingNumber: h.trackingNumber,
      action: h.action,
      oldStatus: h.oldStatus,
      newStatus: h.newStatus,
      oldOffice: h.oldOffice,
      newOffice: h.newOffice,
      remarks: h.remarks,
    });
  }

  console.log(`\nSummary:`);
  console.log(`- Total detected Back to Process movements: ${movements.length}`);
  console.log(`- Correctly routed to PROCESS_MODULE: ${correctlyRoutedCount}`);
  console.log(`- Incorrectly routed to ASSIGNED_OFFICE: ${incorrectlyRoutedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
