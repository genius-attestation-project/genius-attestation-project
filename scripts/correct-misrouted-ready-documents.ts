import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Starting Data Correction for Incorrectly Routed Ready For Delivery Documents ===");

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

  console.log(`Found ${readyRegistrations.length} registrations in Ready For Delivery states.`);
  if (readyRegistrations.length === 0) return;

  const trackingNumbers = readyRegistrations.map((r) => r.trackingNumber);
  const ownerAdminId = readyRegistrations[0].ownerAdminId;

  // Batch load Master Data for Process Types
  const masterProcesses = await prisma.masterData.findMany({
    where: {
      type: "PROCESS_TYPES",
      ownerAdminId: ownerAdminId || undefined,
    },
    include: {
      subPackages: {
        where: { isActive: true },
      },
    },
  });
  const masterProcessMap = new Map(masterProcesses.map((p) => [p.name.trim().toLowerCase(), p]));

  // Batch load SubPackage Movements
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

  // Batch load Process Assignments
  const allAssignments = await prisma.processAssignment.findMany({
    where: {
      trackingNumber: { in: trackingNumbers },
      status: { in: ["COMPLETED", "Completed"] },
    },
  });
  const assignmentMap = new Map(allAssignments.map((a) => [a.trackingNumber, a]));

  const toCorrect: Array<{ reg: any; reason: string }> = [];
  let validCount = 0;

  for (const reg of readyRegistrations) {
    const processTypeName = reg.processType?.trim();
    const masterProcess = processTypeName ? masterProcessMap.get(processTypeName.toLowerCase()) : null;
    const configuredSubPackages = masterProcess?.subPackages || [];
    const subMovements = subMovementsByTracking.get(reg.trackingNumber) || [];

    let isCompleted = false;
    let reason = "";

    if (configuredSubPackages.length > 0) {
      const completedSubPkgIds = new Set(
        subMovements
          .filter((sm: any) => sm.status === "Completed" || sm.status === "COMPLETED")
          .map((sm: any) => sm.subPackageId)
      );

      const missingActivities = configuredSubPackages
        .filter((sp: any) => !completedSubPkgIds.has(sp.id))
        .map((sp: any) => sp.name);

      const incompleteMovements = subMovements.filter(
        (sm: any) => sm.status !== "Completed" && sm.status !== "COMPLETED"
      );

      if (missingActivities.length === 0 && incompleteMovements.length === 0) {
        isCompleted = true;
      } else {
        isCompleted = false;
        reason = `Pending activities: ${missingActivities.concat(incompleteMovements.map((m: any) => `${m.subPackageId} (${m.status})`)).join(", ")}`;
      }
    } else if (subMovements.length > 0) {
      const allCompleted = subMovements.every(
        (sm: any) => sm.status === "Completed" || sm.status === "COMPLETED"
      );
      if (allCompleted) {
        isCompleted = true;
      } else {
        isCompleted = false;
        reason = "Some sub-package movements are incomplete";
      }
    } else {
      const hasAssignment = assignmentMap.has(reg.trackingNumber);
      const isDocMovCompleted = reg.documentMovements?.some((mov: any) => mov.status === "COMPLETED");
      if (hasAssignment || isDocMovCompleted) {
        isCompleted = true;
      } else {
        isCompleted = false;
        reason = "No process assignment or movement completion found";
      }
    }

    if (isCompleted) {
      validCount++;
    } else {
      toCorrect.push({ reg, reason });
    }
  }

  console.log(`\nIdentified:`);
  console.log(`  - Valid Ready For Delivery: ${validCount}`);
  console.log(`  - Incomplete to Correct: ${toCorrect.length}`);

  const toCorrectTrackingNumbers = toCorrect.map((i) => i.reg.trackingNumber);
  const toCorrectRegIds = toCorrect.map((i) => i.reg.id);

  console.log(`Applying batch updates...`);

  // 1. Update DocumentMovements
  const docMovUpdateResult = await prisma.documentMovement.updateMany({
    where: { trackingNumber: { in: toCorrectTrackingNumbers } },
    data: {
      status: "Received",
      currentModule: "DOCUMENT_IN_HAND",
      currentStatus: "Document In Hand",
    },
  });
  console.log(`Updated ${docMovUpdateResult.count} DocumentMovement records.`);

  // 2. Update Registrations
  const regUpdateResult = await prisma.registration.updateMany({
    where: { id: { in: toCorrectRegIds } },
    data: {
      trackingStatus: "Document In Hand",
      bmStatus: "Received",
    },
  });
  console.log(`Updated ${regUpdateResult.count} Registration records.`);

  // 3. Create Movement History Records
  const movementHistoryData = toCorrect.map((item) => ({
    trackingNumber: item.reg.trackingNumber,
    action: "Routing Correction",
    oldStatus: "Ready for Delivery",
    newStatus: "Document In Hand",
    oldOffice: item.reg.deliveryLocation || null,
    newOffice: item.reg.deliveryLocation || null,
    performedBy: "SYSTEM_CORRECTION",
    remarks: `Corrected routing: Main Process is not completed. Moved to Document In Hand. Reason: ${item.reason}`,
  }));

  const historyCreateResult = await prisma.movementHistory.createMany({
    data: movementHistoryData,
  });
  console.log(`Created ${historyCreateResult.count} MovementHistory records.`);

  // 4. Create Audit Trail Records
  const auditTrailData = toCorrect.map((item) => ({
    registrationId: item.reg.id,
    action: "ROUTING_CORRECTION_TO_DOCUMENT_IN_HAND",
    performedBy: "SYSTEM_CORRECTION",
    description: `Corrected document state from Ready for Delivery to Document In Hand because authoritative main process is incomplete.`,
  }));

  const auditCreateResult = await prisma.auditTrail.createMany({
    data: auditTrailData,
  });
  console.log(`Created ${auditCreateResult.count} AuditTrail records.`);

  // 5. Create Document Workflow History Records
  const docWorkflowData = toCorrect.map((item) => ({
    documentId: item.reg.id,
    trackingNumber: item.reg.trackingNumber,
    workflowStep: "Routing Correction",
    status: "Document In Hand",
    performedBy: "SYSTEM_CORRECTION",
    remarks: `Corrected from Ready for Delivery to Document In Hand (Main Process incomplete: ${item.reason})`,
    ownerAdminId: item.reg.ownerAdminId,
  }));

  const docWorkflowResult = await (prisma as any).documentWorkflowHistory.createMany({
    data: docWorkflowData,
  });
  console.log(`Created ${docWorkflowResult.count} DocumentWorkflowHistory records.`);

  console.log("\n================ CORRECTION COMPLETE ================");
  console.log(`Total Corrected to Document In Hand: ${toCorrect.length}`);
}

main()
  .catch((err) => {
    console.error("Correction failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
