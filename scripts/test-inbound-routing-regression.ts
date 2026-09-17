import { PrismaClient } from "@prisma/client";
import { receiveBundle } from "../src/features/home/server/bundle-workflow.service";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

const prisma = new PrismaClient();

async function runRegressionTests() {
  console.log("==========================================================");
  console.log("Starting Inbound Bundle Routing Regression Test Suite");
  console.log("==========================================================\n");

  // Get or find owner admin user
  const adminUser = await prisma.user.findFirst({
    where: { roleId: { not: null } },
  });
  if (!adminUser) {
    throw new Error("No admin user found for tests.");
  }
  const ownerAdminId = adminUser.ownerAdminId || adminUser.id;

  // Get two offices
  const offices = await prisma.officeLocation.findMany({
    where: { ownerAdminId },
    take: 2,
  });
  if (offices.length < 2) {
    throw new Error("Need at least 2 offices in database to test.");
  }
  const officeA = offices[0];
  const officeB = offices[1];

  console.log(`Test Offices: Office A = "${officeA.officeName}", Office B = "${officeB.officeName}"`);

  // Create or get a Multi-Step Master Process Type
  const testProcessTypeName = "Regression Test Process (Multi-Activity)";
  let masterProcess = await prisma.masterData.findFirst({
    where: {
      type: "PROCESS_TYPES",
      name: testProcessTypeName,
      ownerAdminId,
    },
    include: { subPackages: true },
  });

  if (!masterProcess) {
    masterProcess = await prisma.masterData.create({
      data: {
        type: "PROCESS_TYPES",
        name: testProcessTypeName,
        ownerAdminId,
        subPackages: {
          create: [
            { name: "Activity 1: Notary", ownerAdminId },
            { name: "Activity 2: Embassy MOFA", ownerAdminId },
            { name: "Activity 3: Translation", ownerAdminId },
          ],
        },
      },
      include: { subPackages: true },
    });
  }

  const subPkg1 = masterProcess.subPackages[0];
  const subPkg2 = masterProcess.subPackages[1];
  const subPkg3 = masterProcess.subPackages[2];
  console.log(`Configured Activities: 1) ${subPkg1.name}, 2) ${subPkg2.name}, 3) ${subPkg3.name}`);

  // Helper to create test registration
  const timestamp = Date.now();
  async function createTestRegistration(suffix: string, deliveryOfficeName: string) {
    const trackingNo = `TEST-${timestamp}-${suffix}`;
    const reg = await prisma.registration.create({
      data: {
        trackingNumber: trackingNo,
        customerName: `Customer ${suffix}`,
        processType: testProcessTypeName,
        deliveryLocation: deliveryOfficeName,
        regionOfRegistration: officeA.officeName,
        trackingStatus: "Pending Receive",
        bmStatus: "Pending",
        ownerAdminId,
        documentMovements: {
          create: {
            trackingNumber: trackingNo,
            fromOfficeId: officeA.id,
            toOfficeId: officeB.id,
            currentOfficeId: officeA.id,
            status: "Pending Receive",
            currentStatus: "Pending Receive",
            currentModule: "HOME",
          },
        },
      },
      include: { documentMovements: true },
    });
    return reg;
  }

  // Helper to add sub-package movement
  async function addSubMovement(trackingNo: string, subPkgId: string, status: string) {
    return (prisma as any).subPackageMovement.create({
      data: {
        trackingNumber: trackingNo,
        documentId: trackingNo,
        subPackageId: subPkgId,
        status,
        ownerAdminId,
      },
    });
  }

  // ==========================================
  // SCENARIO A: All Activities Complete + Delivery Office == Receiving Office -> Ready For Delivery
  // ==========================================
  console.log("\n--- Testing Scenario A: All Activities Completed + Delivery Office == Receiving Office ---");
  const docA = await createTestRegistration("SCENARIO_A", officeB.officeName);
  await addSubMovement(docA.trackingNumber, subPkg1.id, "Completed");
  await addSubMovement(docA.trackingNumber, subPkg2.id, "Completed");
  await addSubMovement(docA.trackingNumber, subPkg3.id, "Completed");

  const checkA = await verifyMainProcessCompleted(docA.trackingNumber, ownerAdminId);
  console.log(`Scenario A Pre-check isCompleted: ${checkA.isCompleted}`);
  if (!checkA.isCompleted) throw new Error("Scenario A expected isCompleted: true");

  // ==========================================
  // SCENARIO B: Subprocess 1 Complete, Subprocess 2 & 3 Pending + Delivery Office == Receiving Office -> Document In Hand
  // ==========================================
  console.log("\n--- Testing Scenario B: Subprocess 1 Complete, Others Missing + Delivery Office == Receiving Office ---");
  const docB = await createTestRegistration("SCENARIO_B", officeB.officeName);
  await addSubMovement(docB.trackingNumber, subPkg1.id, "Completed");

  const checkB = await verifyMainProcessCompleted(docB.trackingNumber, ownerAdminId);
  console.log(`Scenario B Pre-check isCompleted: ${checkB.isCompleted}, Message: ${checkB.message}`);
  if (checkB.isCompleted) throw new Error("Scenario B expected isCompleted: false (Subprocess alone must NOT complete main process)");

  // ==========================================
  // SCENARIO C: Subprocess Pending + Delivery Office == Receiving Office -> Document In Hand
  // ==========================================
  console.log("\n--- Testing Scenario C: Subprocess In Progress + Delivery Office == Receiving Office ---");
  const docC = await createTestRegistration("SCENARIO_C", officeB.officeName);
  await addSubMovement(docC.trackingNumber, subPkg1.id, "In Progress");

  const checkC = await verifyMainProcessCompleted(docC.trackingNumber, ownerAdminId);
  console.log(`Scenario C Pre-check isCompleted: ${checkC.isCompleted}`);
  if (checkC.isCompleted) throw new Error("Scenario C expected isCompleted: false");

  // ==========================================
  // SCENARIO D: Main Process Completed + Delivery Office != Receiving Office -> Transfer / Document In Hand
  // ==========================================
  console.log("\n--- Testing Scenario D: Main Process Completed + Delivery Office != Receiving Office ---");
  const docD = await createTestRegistration("SCENARIO_D", officeA.officeName); // delivery is officeA, but receiving at officeB
  await addSubMovement(docD.trackingNumber, subPkg1.id, "Completed");
  await addSubMovement(docD.trackingNumber, subPkg2.id, "Completed");
  await addSubMovement(docD.trackingNumber, subPkg3.id, "Completed");

  // ==========================================
  // SCENARIO E: Multiple Completed but One Pending/Returned -> Document In Hand
  // ==========================================
  console.log("\n--- Testing Scenario E: Multiple Completed, 1 Returned -> Document In Hand ---");
  const docE = await createTestRegistration("SCENARIO_E", officeB.officeName);
  await addSubMovement(docE.trackingNumber, subPkg1.id, "Completed");
  await addSubMovement(docE.trackingNumber, subPkg2.id, "Completed");
  await addSubMovement(docE.trackingNumber, subPkg3.id, "Returned");

  const checkE = await verifyMainProcessCompleted(docE.trackingNumber, ownerAdminId);
  console.log(`Scenario E Pre-check isCompleted: ${checkE.isCompleted}, Message: ${checkE.message}`);
  if (checkE.isCompleted) throw new Error("Scenario E expected isCompleted: false");

  // ==========================================
  // SCENARIO F: Inbound Mixed Bundle Receive
  // ==========================================
  console.log("\n--- Testing Scenario F: Inbound Bundle with Mixed Documents ---");
  const bundleNumber = `TEST-BUNDLE-${timestamp}`;
  const testBundle = await prisma.bundle.create({
    data: {
      bundleNumber,
      fromOfficeId: officeA.id,
      toOfficeId: officeB.id,
      status: "Pending Receive",
      ownerAdminId,
      items: {
        create: [
          { trackingNumber: docA.trackingNumber, status: "Pending Receive" },
          { trackingNumber: docB.trackingNumber, status: "Pending Receive" },
          { trackingNumber: docC.trackingNumber, status: "Pending Receive" },
          { trackingNumber: docD.trackingNumber, status: "Pending Receive" },
          { trackingNumber: docE.trackingNumber, status: "Pending Receive" },
        ],
      },
    },
    include: { items: true },
  });

  console.log(`Created test inbound bundle ${testBundle.bundleNumber} with 5 mixed items.`);

  // Execute receiveBundle at Office B
  const receiveResult = await receiveBundle({
    bundleId: testBundle.id,
    receivedTrackingNumbers: [
      docA.trackingNumber,
      docB.trackingNumber,
      docC.trackingNumber,
      docD.trackingNumber,
      docE.trackingNumber,
    ],
    userId: adminUser.id,
    userName: adminUser.name || "Test Admin",
    ownerAdminId,
  });

  console.log("Bundle Receive Result:", receiveResult);

  // Fetch updated records from database
  const [resA, resB, resC, resD, resE] = await Promise.all([
    prisma.registration.findUnique({ where: { trackingNumber: docA.trackingNumber }, include: { documentMovements: true } }),
    prisma.registration.findUnique({ where: { trackingNumber: docB.trackingNumber }, include: { documentMovements: true } }),
    prisma.registration.findUnique({ where: { trackingNumber: docC.trackingNumber }, include: { documentMovements: true } }),
    prisma.registration.findUnique({ where: { trackingNumber: docD.trackingNumber }, include: { documentMovements: true } }),
    prisma.registration.findUnique({ where: { trackingNumber: docE.trackingNumber }, include: { documentMovements: true } }),
  ]);

  console.log("\n================ VERIFICATION RESULTS ================");
  console.log(`Doc A (All activities complete + Delivery office == Receiving): TrackingStatus = "${resA?.trackingStatus}", DM Module = "${resA?.documentMovements[0]?.currentModule}"`);
  console.log(`Doc B (1 activity complete, 2 missing + Delivery office == Receiving): TrackingStatus = "${resB?.trackingStatus}", DM Module = "${resB?.documentMovements[0]?.currentModule}"`);
  console.log(`Doc C (Activity in progress + Delivery office == Receiving): TrackingStatus = "${resC?.trackingStatus}", DM Module = "${resC?.documentMovements[0]?.currentModule}"`);
  console.log(`Doc D (All complete + Delivery office != Receiving): TrackingStatus = "${resD?.trackingStatus}", DM Module = "${resD?.documentMovements[0]?.currentModule}"`);
  console.log(`Doc E (2 complete, 1 returned + Delivery office == Receiving): TrackingStatus = "${resE?.trackingStatus}", DM Module = "${resE?.documentMovements[0]?.currentModule}"`);

  // Assertions
  if (resA?.trackingStatus !== "Ready for Delivery" || resA?.documentMovements[0]?.currentModule !== "READY_FOR_DELIVERY") {
    throw new Error("Doc A failed: Expected Ready for Delivery");
  }
  if (resB?.trackingStatus !== "Document In Hand" || resB?.documentMovements[0]?.currentModule !== "DOCUMENT_IN_HAND") {
    throw new Error("Doc B failed: Expected Document In Hand");
  }
  if (resC?.trackingStatus !== "Document In Hand" || resC?.documentMovements[0]?.currentModule !== "DOCUMENT_IN_HAND") {
    throw new Error("Doc C failed: Expected Document In Hand");
  }
  if (resD?.trackingStatus !== "Document In Hand" || resD?.documentMovements[0]?.currentModule !== "DOCUMENT_IN_HAND") {
    throw new Error("Doc D failed: Expected Document In Hand");
  }
  if (resE?.trackingStatus !== "Document In Hand" || resE?.documentMovements[0]?.currentModule !== "DOCUMENT_IN_HAND") {
    throw new Error("Doc E failed: Expected Document In Hand");
  }

  // Cleanup test records
  console.log("\nCleaning up test data...");
  const allTestTrackings = [docA.trackingNumber, docB.trackingNumber, docC.trackingNumber, docD.trackingNumber, docE.trackingNumber];
  await prisma.bundleItem.deleteMany({ where: { bundleId: testBundle.id } });
  await prisma.bundle.delete({ where: { id: testBundle.id } });
  await (prisma as any).subPackageMovement.deleteMany({ where: { trackingNumber: { in: allTestTrackings } } });
  await prisma.movementHistory.deleteMany({ where: { trackingNumber: { in: allTestTrackings } } });
  await prisma.documentMovement.deleteMany({ where: { trackingNumber: { in: allTestTrackings } } });
  await prisma.registration.deleteMany({ where: { trackingNumber: { in: allTestTrackings } } });

  console.log("\n>>> ALL REGRESSION TESTS PASSED SUCCESSFULLY! <<<\n");
}

runRegressionTests()
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
