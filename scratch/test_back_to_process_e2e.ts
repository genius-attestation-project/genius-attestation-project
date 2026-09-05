import { prisma } from "../src/lib/prisma";
import { transferBackToProcess } from "../src/features/assigned-office/server/assigned-office.service";
import { processBulkMove, listProcessAssignments } from "../src/features/process/server/process.service";

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

async function runTests() {
  console.log("=================================================================");
  console.log("STARTING BACK TO PROCESS END-TO-END AUTOMATED TEST SUITE");
  console.log("=================================================================\n");

  let passedTests = 0;
  let totalTests = 5;

  let tNum1 = "";
  let tNum2 = "";
  let tNum5 = "";

  // Find a valid admin/user in the DB
  const validUser = await prisma.user.findFirst();
  if (!validUser) {
    throw new Error("No user found in database for test execution");
  }
  const TEST_USER = validUser.id;
  const TEST_OWNER = validUser.ownerAdminId || validUser.id;

  // Clean up any stale test records from previous failed runs
  await prisma.officeLocation.deleteMany({ where: { id: { contains: "non_existent_office" } } }).catch(() => {});

  // Setup Unique Test Offices
  const officeA = await prisma.officeLocation.create({
    data: {
      officeName: uid("TestProcA"),
      location: "Office A Location",
      timezone: "UTC",
      isProcessOffice: true,
      ownerAdminId: TEST_OWNER,
    },
  });

  const officeB = await prisma.officeLocation.create({
    data: {
      officeName: uid("TestProcB"),
      location: "Office B Location",
      timezone: "UTC",
      isProcessOffice: true,
      ownerAdminId: TEST_OWNER,
    },
  });

  const assignedOfficeC = await (prisma as any).assignedOffice.create({
    data: {
      username: uid("TestAssignedC"),
      email: `${uid("assigned")}@test.com`,
      passwordHash: "hash",
      status: true,
      ownerAdminId: TEST_OWNER,
    },
  });

  const assignedOfficeCLoc = await prisma.officeLocation.create({
    data: {
      id: assignedOfficeC.id,
      officeName: assignedOfficeC.username,
      location: "External Processing Office",
      timezone: "UTC",
      isProcessOffice: true,
      ownerAdminId: TEST_OWNER,
    },
  });

  console.log(`Created test offices:
- Office A (Process): ${officeA.id} (${officeA.officeName})
- Office B (Process): ${officeB.id} (${officeB.officeName})
- Office C (Assigned): ${assignedOfficeC.id} (${assignedOfficeC.username})\n`);

  try {
    // =========================================================================
    // TEST 1: Normal Process Transfer (Office A -> Office C -> Back to Office A)
    // =========================================================================
    console.log("--- TEST 1: Normal Process Transfer (Office A -> Assigned Office C -> Back to Office A) ---");
    tNum1 = uid("T1");
    const reg1 = await prisma.registration.create({
      data: {
        trackingNumber: tNum1,
        customerName: "Test Customer 1",
        mobile: "+911111111111",
        regionOfRegistration: officeA.officeName,
        trackingStatus: "Document In Hand",
        bmStatus: "Received",
        ownerAdminId: TEST_OWNER,
        createdBy: TEST_USER,
      },
    });

    // Create Inbound Bundle from Office A to Assigned Office C
    const bundleAC = await prisma.bundle.create({
      data: {
        bundleNumber: uid("BND-AC"),
        fromOfficeId: officeA.id,
        toOfficeId: assignedOfficeCLoc.id,
        status: "Received",
        ownerAdminId: TEST_OWNER,
        items: {
          create: [{ trackingNumber: tNum1, status: "Received" }],
        },
      },
    });

    // Create Document Movement in Assigned Office C
    await prisma.documentMovement.create({
      data: {
        trackingNumber: tNum1,
        registrationId: reg1.id,
        fromOfficeId: officeA.id,
        toOfficeId: assignedOfficeCLoc.id,
        currentOfficeId: assignedOfficeCLoc.id,
        fromModule: "PROCESS_MODULE",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "IN_HAND",
        currentStatus: "Document In Hand",
        bundleId: bundleAC.id,
      },
    });

    // Execute transferBackToProcess from Office C
    const res1 = await transferBackToProcess({
      trackingNumbers: [tNum1],
      officeId: assignedOfficeC.id,
      userId: TEST_USER,
      userName: "Test Tester",
      ownerAdminId: TEST_OWNER,
      remarks: "Returning doc 1 back to process",
    });

    console.log("Test 1 Result:", res1);

    const mov1After = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNum1 },
      include: { toOffice: true, fromOffice: true, bundle: true },
    });

    if (
      res1.success &&
      mov1After?.toOfficeId === officeA.id &&
      mov1After?.currentOfficeId === officeA.id &&
      mov1After?.status === "INBOUND" &&
      mov1After?.currentModule === "PROCESS_MODULE"
    ) {
      console.log(`[PASS] Test 1: Document correctly routed back to Office A (${officeA.officeName}).\n`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test 1 Failed: Expected toOfficeId=${officeA.id}, got=${mov1After?.toOfficeId}\n`);
    }

    // =========================================================================
    // TEST 2: Multiple Process Transfers (Office A -> Office B -> Assigned Office C -> Back to Office B)
    // =========================================================================
    console.log("--- TEST 2: Multiple Transfers (Office A -> Office B -> Office C -> Back to Office B strictly) ---");
    tNum2 = uid("T2");
    const reg2 = await prisma.registration.create({
      data: {
        trackingNumber: tNum2,
        customerName: "Test Customer 2",
        mobile: "+912222222222",
        regionOfRegistration: officeA.officeName,
        trackingStatus: "Document In Hand",
        bmStatus: "Received",
        ownerAdminId: TEST_OWNER,
        createdBy: TEST_USER,
      },
    });

    // First leg: A -> B
    await prisma.bundle.create({
      data: {
        bundleNumber: uid("BND-AB"),
        fromOfficeId: officeA.id,
        toOfficeId: officeB.id,
        status: "Received",
        ownerAdminId: TEST_OWNER,
        items: {
          create: [{ trackingNumber: tNum2, status: "Received" }],
        },
      },
    });

    await prisma.movementHistory.create({
      data: {
        trackingNumber: tNum2,
        action: "Received Document",
        oldStatus: "Pending Receive",
        newStatus: "IN_HAND",
        oldOffice: officeA.officeName,
        newOffice: officeB.officeName,
        performedBy: "Test User",
      },
    });

    // Second leg: B -> C
    const bundleBC = await prisma.bundle.create({
      data: {
        bundleNumber: uid("BND-BC"),
        fromOfficeId: officeB.id,
        toOfficeId: assignedOfficeCLoc.id,
        status: "Received",
        ownerAdminId: TEST_OWNER,
        items: {
          create: [{ trackingNumber: tNum2, status: "Received" }],
        },
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: tNum2,
        registrationId: reg2.id,
        fromOfficeId: officeB.id,
        toOfficeId: assignedOfficeCLoc.id,
        currentOfficeId: assignedOfficeCLoc.id,
        fromModule: "PROCESS_MODULE",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "IN_HAND",
        currentStatus: "Document In Hand",
        bundleId: bundleBC.id,
      },
    });

    // Execute transferBackToProcess from Office C
    const res2 = await transferBackToProcess({
      trackingNumbers: [tNum2],
      officeId: assignedOfficeC.id,
      userId: TEST_USER,
      userName: "Test Tester",
      ownerAdminId: TEST_OWNER,
      remarks: "Returning doc 2 back to Office B",
    });

    console.log("Test 2 Result:", res2);

    const mov2After = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNum2 },
      include: { toOffice: true, fromOffice: true },
    });

    if (
      res2.success &&
      mov2After?.toOfficeId === officeB.id &&
      mov2After?.toOfficeId !== officeA.id &&
      mov2After?.status === "INBOUND" &&
      mov2After?.currentModule === "PROCESS_MODULE"
    ) {
      console.log(`[PASS] Test 2: Document correctly returned strictly to Office B (${officeB.officeName}), NOT Office A.\n`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test 2 Failed: Expected toOfficeId=${officeB.id}, got=${mov2After?.toOfficeId}\n`);
    }

    // =========================================================================
    // TEST 3: Process Module RECEIVE Handler
    // =========================================================================
    console.log("--- TEST 3: Receive after Return in Process Module ---");
    // Receive doc 2 at Office B
    const res3 = await processBulkMove({
      trackingNumbers: [tNum2],
      action: "RECEIVE",
      userId: TEST_USER,
      ownerAdminId: TEST_OWNER,
      remarks: "Received back in Office B Process Module",
      officeLocationName: officeB.officeName,
    });

    console.log("Test 3 Result:", res3);

    const mov2Received = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNum2 },
      include: { toOffice: true, bundle: true },
    });

    const reg2Received = await prisma.registration.findUnique({
      where: { trackingNumber: tNum2 },
    });

    const history2 = await prisma.movementHistory.findFirst({
      where: { trackingNumber: tNum2, action: "Received Document" },
      orderBy: { performedAt: "desc" },
    });

    const audit2 = await prisma.auditTrail.findFirst({
      where: { registrationId: reg2.id, action: "Document received in process" },
      orderBy: { createdAt: "desc" },
    });

    if (
      res3.success &&
      mov2Received?.status === "IN_HAND" &&
      mov2Received?.currentStatus === "Document In Hand" &&
      mov2Received?.currentOfficeId === officeB.id &&
      reg2Received?.trackingStatus === "Document In Hand" &&
      reg2Received?.bmStatus === "Received" &&
      history2 !== null &&
      audit2 !== null
    ) {
      console.log(`[PASS] Test 3: Receive successfully moved document to IN_HAND at Office B with full audit trail.\n`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test 3 Failed: Status=${mov2Received?.status}, RegStatus=${reg2Received?.trackingStatus}\n`);
    }

    // =========================================================================
    // TEST 4: Problem Documents 6565 & 4444 in Malappuram Inbound
    // =========================================================================
    console.log("--- TEST 4: Verification of Problem Documents 6565 & 4444 in Malappuram Inbound ---");
    const malappuramOwner = "96dd9c33-7608-11f1-b655-52dd4f552161";

    const inboundBundles = await listProcessAssignments(malappuramOwner, "Malappuram", undefined, "inbound");
    const foundBundle = inboundBundles.find((b: any) => b.bundleNumber === "BND-PROC-20260905-0013");
    const foundTrackingNumbers = (foundBundle as any)?.items?.map((i: any) => i.trackingNumber) || [];

    const has6565 = foundTrackingNumbers.includes("6565");
    const has4444 = foundTrackingNumbers.includes("4444");

    if (foundBundle && has6565 && has4444) {
      console.log(`[PASS] Test 4: Documents 6565 and 4444 are confirmed visible in Malappuram Process Module Inbound (Bundle: ${foundBundle.bundleNumber}).\n`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test 4 Failed: Found Bundle: ${!!foundBundle}, Has 6565: ${has6565}, Has 4444: ${has4444}\n`);
    }

    // =========================================================================
    // TEST 5: Transaction Failure Safety
    // =========================================================================
    console.log("--- TEST 5: Transaction Safety on Failure ---");
    tNum5 = uid("T5");
    const reg5 = await prisma.registration.create({
      data: {
        trackingNumber: tNum5,
        customerName: "Test Customer 5",
        mobile: "+915555555555",
        regionOfRegistration: officeA.officeName,
        trackingStatus: "Document In Hand",
        bmStatus: "Received",
        ownerAdminId: TEST_OWNER,
        createdBy: TEST_USER,
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: tNum5,
        registrationId: reg5.id,
        fromOfficeId: officeA.id,
        toOfficeId: assignedOfficeCLoc.id,
        currentOfficeId: assignedOfficeCLoc.id,
        fromModule: "PROCESS_MODULE",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "IN_HAND",
        currentStatus: "Document In Hand",
      },
    });

    let caughtError: any = null;
    const invalidOfficeId = uid("non_existent_office");

    try {
      // Intentionally passing invalid officeId that will fail source lookup inside transaction
      await transferBackToProcess({
        trackingNumbers: [tNum5],
        officeId: invalidOfficeId,
        userId: TEST_USER,
        ownerAdminId: TEST_OWNER,
      });
    } catch (err: any) {
      caughtError = err;
      console.log("Test 5 successfully caught expected error:", err.message);
    }

    const mov5After = await prisma.documentMovement.findFirst({ where: { trackingNumber: tNum5 } });
    const bundleItem5 = await prisma.bundleItem.findFirst({ where: { trackingNumber: tNum5 } });
    const history5 = await prisma.movementHistory.findFirst({ where: { trackingNumber: tNum5, action: "Back To Process" } });

    console.log(`Test 5 Checks: caughtError=${!!caughtError}, status=${mov5After?.status}, bundleItemExists=${!!bundleItem5}, historyExists=${!!history5}`);

    if (
      caughtError &&
      mov5After?.status === "IN_HAND" &&
      mov5After?.currentModule === "ASSIGNED_OFFICE" &&
      bundleItem5 === null &&
      history5 === null
    ) {
      console.log(`[PASS] Test 5: Atomic rollback verified. Document remained in IN_HAND and no bundle items/history were created.\n`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test 5 Failed: Rollback did not restore original state.\n`);
    }

  } finally {
    // Clean up test data
    console.log("Cleaning up test data created for temporary suite...");
    const testTrackingNumbers = [tNum1, tNum2, tNum5].filter(Boolean);
    await prisma.documentWorkflowHistory.deleteMany({ where: { trackingNumber: { in: testTrackingNumbers } } }).catch(() => {});
    await prisma.movementHistory.deleteMany({ where: { trackingNumber: { in: testTrackingNumbers } } }).catch(() => {});
    await prisma.auditTrail.deleteMany({ where: { registration: { trackingNumber: { in: testTrackingNumbers } } } }).catch(() => {});
    await prisma.bundleItem.deleteMany({ where: { trackingNumber: { in: testTrackingNumbers } } }).catch(() => {});
    await prisma.documentMovement.deleteMany({ where: { trackingNumber: { in: testTrackingNumbers } } }).catch(() => {});
    await prisma.registration.deleteMany({ where: { trackingNumber: { in: testTrackingNumbers } } }).catch(() => {});
    await (prisma as any).assignedOfficeSubPackage?.deleteMany({ where: { assignedOfficeId: assignedOfficeC.id } }).catch(() => {});
    await (prisma as any).assignedOfficeProcessType?.deleteMany({ where: { assignedOfficeId: assignedOfficeC.id } }).catch(() => {});
    await (prisma as any).assignedOffice.deleteMany({ where: { id: assignedOfficeC.id } }).catch(() => {});
    await prisma.officeLocation.deleteMany({ where: { id: { in: [officeA.id, officeB.id, assignedOfficeCLoc.id] } } }).catch(() => {});
  }

  console.log("=================================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("=================================================================");
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Test Suite Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
