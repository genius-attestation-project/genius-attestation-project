import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  const trackingNumbers = readyRegistrations.map((r) => r.trackingNumber);
  const ownerAdminId = readyRegistrations[0]?.ownerAdminId;

  // Batch fetch master data
  const masterProcesses = await prisma.masterData.findMany({
    where: {
      type: "PROCESS_TYPES",
      ownerAdminId: ownerAdminId || undefined,
    },
    include: {
      subPackages: true,
    },
  });
  const masterProcessMap = new Map(masterProcesses.map((p) => [p.name.trim().toLowerCase(), p]));

  // Batch fetch all sub package movements
  const allSubMovements = await (prisma as any).subPackageMovement.findMany({
    where: {
      trackingNumber: { in: trackingNumbers },
    },
  });
  const subMovementsByTracking = new Map<string, any[]>();
  for (const sm of allSubMovements) {
    if (!subMovementsByTracking.has(sm.trackingNumber)) {
      subMovementsByTracking.set(sm.trackingNumber, []);
    }
    subMovementsByTracking.get(sm.trackingNumber)!.push(sm);
  }

  // Batch fetch process assignments
  const allAssignments = await prisma.processAssignment.findMany({
    where: {
      trackingNumber: { in: trackingNumbers },
      status: { in: ["COMPLETED", "Completed"] },
    },
  });
  const assignmentMap = new Map(allAssignments.map((a) => [a.trackingNumber, a]));

  const improperlyRouted: any[] = [];
  const properlyRouted: any[] = [];

  for (const reg of readyRegistrations) {
    const processTypeName = reg.processType?.trim();
    const subMovements = subMovementsByTracking.get(reg.trackingNumber) || [];
    const masterProcess = processTypeName ? masterProcessMap.get(processTypeName.toLowerCase()) : null;
    const configuredSubPackages = masterProcess?.subPackages || [];

    let isCompleted = false;
    let reason = "";
    let missingActivities: string[] = [];

    if (configuredSubPackages.length > 0) {
      const completedSubPkgIds = new Set(
        subMovements
          .filter((sm: any) => sm.status === "Completed" || sm.status === "COMPLETED")
          .map((sm: any) => sm.subPackageId)
      );

      missingActivities = configuredSubPackages.filter((sp: any) => !completedSubPkgIds.has(sp.id)).map((sp: any) => sp.name);
      const incompleteMovements = subMovements.filter((sm: any) => sm.status !== "Completed" && sm.status !== "COMPLETED");

      if (missingActivities.length === 0 && incompleteMovements.length === 0) {
        isCompleted = true;
        reason = `All ${configuredSubPackages.length} activities completed`;
      } else {
        isCompleted = false;
        reason = `Missing: ${missingActivities.join(", ")}; Incomplete movements: ${incompleteMovements.map((m: any) => `${m.subPackageId} (${m.status})`).join(", ")}`;
      }
    } else if (subMovements.length > 0) {
      const allCompleted = subMovements.every((sm: any) => sm.status === "Completed" || sm.status === "COMPLETED");
      isCompleted = allCompleted;
      reason = allCompleted ? "All submovements completed" : "Some submovements not completed";
    } else {
      const hasAssignment = assignmentMap.has(reg.trackingNumber);
      isCompleted = hasAssignment;
      reason = hasAssignment ? "Process assignment completed" : "No completed process";
    }

    if (!isCompleted) {
      improperlyRouted.push({ reg, reason, missingActivities, subMovements });
    } else {
      properlyRouted.push({ reg, reason });
    }
  }

  console.log(`\n================ SUMMARY ================`);
  console.log(`Total In Ready For Delivery States: ${readyRegistrations.length}`);
  console.log(`Properly Completed Main Process: ${properlyRouted.length}`);
  console.log(`Improperly In Ready For Delivery: ${improperlyRouted.length}`);

  for (const item of improperlyRouted) {
    console.log(`\n----------------------------------------`);
    console.log(`Tracking #: ${item.reg.trackingNumber}`);
    console.log(`Customer: ${item.reg.customerName}`);
    console.log(`Process Type: ${item.reg.processType}`);
    console.log(`Delivery Location: ${item.reg.deliveryLocation}`);
    console.log(`Reason: ${item.reason}`);
    console.log(`SubMovements (${item.subMovements.length}):`);
    for (const sm of item.subMovements) {
      console.log(`  - SubPackageId: ${sm.subPackageId}, Status: ${sm.status}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
