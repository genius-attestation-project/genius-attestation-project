import { prisma } from "../src/lib/prisma";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";
import { receiveBundle } from "../src/features/home/server/bundle-workflow.service";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING ROUTING VERIFICATION TESTS");
  console.log("==================================================");

  const regSample = await prisma.registration.findUnique({ where: { trackingNumber: "62192" } });
  const ownerAdminId = regSample?.ownerAdminId || "c8b26a64-a178-11f1-9fb2-76763ffa5298";

  // Find offices
  const qatarOffice = await prisma.officeLocation.findFirst({
    where: { officeName: "Genius Qatar" },
  });
  const delhiOffice = await prisma.officeLocation.findFirst({
    where: { officeName: "Process Delhi" },
  });
  const dubaiOffice = await prisma.officeLocation.findFirst({
    where: { officeName: "Genius Dubai" },
  });

  console.log("Offices found:", {
    Qatar: qatarOffice?.id,
    Delhi: delhiOffice?.id,
    Dubai: dubaiOffice?.id,
  });

  // TEST CASE 1: Main Process = Completed, Sub Process = Completed, Delivery Location = Receiving Office
  // 62192 has all sub-packages for QR Apostille completed, Delivery Location = Genius Qatar, Receiving Office = Genius Qatar
  console.log("\n--- TEST CASE 1 & 5 Verification ---");
  const check62192 = await verifyMainProcessCompleted("62192", ownerAdminId);
  console.log("Test Case 1 & 5 (Tracking 62192):", {
    isCompleted: check62192.isCompleted,
    processType: check62192.processType,
  });
  if (!check62192.isCompleted) {
    throw new Error("FAILED: Test Case 1 & 5 - 62192 should be completed");
  }

  // TEST CASE 3: Main Process = Not Completed, Sub Process = Completed (partial), Delivery Location = Receiving Office
  // 4558246 has UAE Embassy+MOFA completed, but MEA incomplete, Delivery Location = Genius Dubai, Receiving Office = Genius Dubai
  console.log("\n--- TEST CASE 3 Verification ---");
  const check4558246 = await verifyMainProcessCompleted("4558246", ownerAdminId);
  console.log("Test Case 3 (Tracking 4558246):", {
    isCompleted: check4558246.isCompleted,
    message: check4558246.message,
  });
  if (check4558246.isCompleted) {
    throw new Error("FAILED: Test Case 3 - 4558246 should NOT be completed because MEA is pending");
  }

  // TEST SIMULATION of receiveBundle with a MIXED BUNDLE
  console.log("\n--- MIXED BUNDLE SIMULATION ---");
  // We will create 3 temporary test registrations with a timestamp suffix
  const ts = Date.now();
  const testTrackA = `TEST-A-${ts}`; // Completed, Delivery = Qatar, Receiving = Qatar -> Ready For Delivery
  const testTrackB = `TEST-B-${ts}`; // Incomplete, Delivery = Qatar, Receiving = Qatar -> Document In Hand
  const testTrackC = `TEST-C-${ts}`; // Completed, Delivery = Delhi, Receiving = Qatar -> Document In Hand

  // Clean up if any
  const qatarId = qatarOffice?.id!;
  const delhiId = delhiOffice?.id || qatarId;

  // Create test registrations
  const regA = await prisma.registration.create({
    data: {
      trackingNumber: testTrackA,
      customerName: "Test Doc A (Completed, Match)",
      processType: "General Process",
      deliveryLocation: "Genius Qatar",
      regionOfRegistration: "Genius Qatar",
      trackingStatus: "In Transfer",
      bmStatus: "Transferred",
      ownerAdminId,
    },
  });

  const regB = await prisma.registration.create({
    data: {
      trackingNumber: testTrackB,
      customerName: "Test Doc B (Incomplete, Match)",
      processType: "UAE Embassy With MOFA (Edu)", // has MEA which will be incomplete
      deliveryLocation: "Genius Qatar",
      regionOfRegistration: "Genius Qatar",
      trackingStatus: "In Transfer",
      bmStatus: "Transferred",
      ownerAdminId,
    },
  });

  const regC = await prisma.registration.create({
    data: {
      trackingNumber: testTrackC,
      customerName: "Test Doc C (Completed, Mismatch)",
      processType: "General Process",
      deliveryLocation: "Process Delhi",
      regionOfRegistration: "Genius Qatar",
      trackingStatus: "In Transfer",
      bmStatus: "Transferred",
      ownerAdminId,
    },
  });

  // Mark Doc A as COMPLETED in MovementHistory
  await prisma.movementHistory.create({
    data: {
      trackingNumber: testTrackA,
      action: "Marked as COMPLETED",
      newStatus: "COMPLETED",
      oldOffice: "Process Office",
      newOffice: "Process Office",
      performedBy: "Test Runner",
    },
  });

  // Mark Doc C as COMPLETED in MovementHistory
  await prisma.movementHistory.create({
    data: {
      trackingNumber: testTrackC,
      action: "Marked as COMPLETED",
      newStatus: "COMPLETED",
      oldOffice: "Process Office",
      newOffice: "Process Office",
      performedBy: "Test Runner",
    },
  });

  // Create DocumentMovements for all 3
  await prisma.documentMovement.createMany({
    data: [
      {
        trackingNumber: testTrackA,
        registrationId: regA.id,
        fromOfficeId: delhiId,
        toOfficeId: qatarId,
        currentOfficeId: delhiId,
        status: "Pending Receive",
        currentStatus: "Pending Receive",
        fromModule: "PROCESS_MODULE",
        toModule: "HOME",
        currentModule: "HOME",
      },
      {
        trackingNumber: testTrackB,
        registrationId: regB.id,
        fromOfficeId: delhiId,
        toOfficeId: qatarId,
        currentOfficeId: delhiId,
        status: "Pending Receive",
        currentStatus: "Pending Receive",
        fromModule: "PROCESS_MODULE",
        toModule: "HOME",
        currentModule: "HOME",
      },
      {
        trackingNumber: testTrackC,
        registrationId: regC.id,
        fromOfficeId: delhiId,
        toOfficeId: qatarId,
        currentOfficeId: delhiId,
        status: "Pending Receive",
        currentStatus: "Pending Receive",
        fromModule: "PROCESS_MODULE",
        toModule: "HOME",
        currentModule: "HOME",
      },
    ],
  });

  // Create a mixed bundle to Qatar Office
  const bundle = await prisma.bundle.create({
    data: {
      bundleNumber: `BND-TEST-MIXED-${ts}`,
      fromOfficeId: delhiId,
      toOfficeId: qatarId,
      status: "Pending Receive",
      ownerAdminId,
      items: {
        create: [
          { trackingNumber: testTrackA, status: "Pending Receive", registrationId: regA.id },
          { trackingNumber: testTrackB, status: "Pending Receive", registrationId: regB.id },
          { trackingNumber: testTrackC, status: "Pending Receive", registrationId: regC.id },
        ],
      },
    },
  });

  console.log(`Created test mixed bundle: ${bundle.bundleNumber} with items:`, [testTrackA, testTrackB, testTrackC]);

  // Now execute receiveBundle for all 3 tracking numbers
  await receiveBundle({
    bundleId: bundle.id,
    receivedTrackingNumbers: [testTrackA, testTrackB, testTrackC],
    userId: "test-user-id",
    userName: "Test User",
    ownerAdminId,
  });

  // Inspect results:
  const resultA = await prisma.documentMovement.findUnique({ where: { trackingNumber: testTrackA } });
  const regResultA = await prisma.registration.findUnique({ where: { trackingNumber: testTrackA } });

  const resultB = await prisma.documentMovement.findUnique({ where: { trackingNumber: testTrackB } });
  const regResultB = await prisma.registration.findUnique({ where: { trackingNumber: testTrackB } });

  const resultC = await prisma.documentMovement.findUnique({ where: { trackingNumber: testTrackC } });
  const regResultC = await prisma.registration.findUnique({ where: { trackingNumber: testTrackC } });

  console.log("\nResults after receiving mixed bundle:");
  console.log("Doc A (Completed + Match):", {
    movementStatus: resultA?.status,
    currentModule: resultA?.currentModule,
    currentStatus: resultA?.currentStatus,
    regTrackingStatus: regResultA?.trackingStatus,
  });
  console.log("Doc B (Incomplete + Match):", {
    movementStatus: resultB?.status,
    currentModule: resultB?.currentModule,
    currentStatus: resultB?.currentStatus,
    regTrackingStatus: regResultB?.trackingStatus,
  });
  console.log("Doc C (Completed + Mismatch):", {
    movementStatus: resultC?.status,
    currentModule: resultC?.currentModule,
    currentStatus: resultC?.currentStatus,
    regTrackingStatus: regResultC?.trackingStatus,
  });

  // Validate expectations:
  // Doc A MUST be Ready for Delivery
  if (resultA?.status !== "Ready for Delivery" || regResultA?.trackingStatus !== "Ready for Delivery") {
    throw new Error("FAILED: Doc A should be Ready for Delivery");
  }
  // Doc B MUST be Document In Hand
  if (resultB?.status !== "Received" || regResultB?.trackingStatus !== "Document In Hand") {
    throw new Error("FAILED: Doc B should be Document In Hand");
  }
  // Doc C MUST be Document In Hand (preserving transfer workflow)
  if (resultC?.status !== "Received" || regResultC?.trackingStatus !== "Document In Hand") {
    throw new Error("FAILED: Doc C should be Document In Hand");
  }

  console.log("\n>>> ALL ASSERTIONS PASSED SUCCESSFULLY! <<<");

  // Clean up test records
  await prisma.bundleItem.deleteMany({ where: { bundleId: bundle.id } });
  await prisma.bundle.delete({ where: { id: bundle.id } });
  await prisma.documentMovement.deleteMany({ where: { trackingNumber: { in: [testTrackA, testTrackB, testTrackC] } } });
  await prisma.movementHistory.deleteMany({ where: { trackingNumber: { in: [testTrackA, testTrackB, testTrackC] } } });
  await prisma.auditTrail.deleteMany({ where: { registrationId: { in: [regA.id, regB.id, regC.id] } } });
  await prisma.documentWorkflowHistory.deleteMany({ where: { trackingNumber: { in: [testTrackA, testTrackB, testTrackC] } } });
  await prisma.registration.deleteMany({ where: { trackingNumber: { in: [testTrackA, testTrackB, testTrackC] } } });

  console.log("Cleaned up test data.");
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
