import { prisma } from "../src/lib/prisma";
import { receiveBundle, routeDocumentsToReadyForDelivery } from "../src/features/home/server/bundle-workflow.service";
import { hasPermission } from "../src/features/admin/server/rbac.service";

async function runTests() {
  console.log("=== RUNNING ALL RD MANUAL OVERRIDE AND INBOUND RECEIVE VERIFICATION TESTS ===");

  const admin = await prisma.user.findFirst();

  if (!admin) {
    throw new Error("No admin found for testing");
  }

  const ownerAdminId = admin.ownerAdminId || admin.id;
  console.log("Using ownerAdminId:", ownerAdminId);

  // Setup test offices
  let officeDubai = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius Dubai" },
  });
  if (!officeDubai) {
    officeDubai = await prisma.officeLocation.create({
      data: {
        officeName: "Genius Dubai",
        location: "Dubai",
        timezone: "Asia/Dubai",
        ownerAdminId,
      },
    });
  }

  let officeKochi = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Kochi HQ" },
  });
  if (!officeKochi) {
    officeKochi = await prisma.officeLocation.create({
      data: {
        officeName: "Kochi HQ",
        location: "Kochi",
        timezone: "Asia/Kolkata",
        ownerAdminId,
      },
    });
  }

  let officeCalicut = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Calicut Office" },
  });
  if (!officeCalicut) {
    officeCalicut = await prisma.officeLocation.create({
      data: {
        officeName: "Calicut Office",
        location: "Calicut",
        timezone: "Asia/Kolkata",
        ownerAdminId,
      },
    });
  }

  if (!officeDubai || !officeKochi || !officeCalicut) {
    throw new Error("Failed to resolve test offices");
  }
  const officeDubaiId = officeDubai.id;
  const officeKochiId = officeKochi.id;
  const officeCalicutId = officeCalicut.id;
  console.log("Offices resolved:", { dubai: officeDubaiId, kochi: officeKochiId, calicut: officeCalicutId });

  // Helper to create test registration
  async function createTestRegistration(suffix: string, deliveryLocation: string, processType: string = "Standard Attestation") {
    const trackingNumber = `TEST-RD-${Date.now()}-${suffix}`;
    const reg = await prisma.registration.create({
      data: {
        trackingNumber,
        customerName: `Customer ${suffix}`,
        mobile: "9876543210",
        documentType: "Degree Certificate",
        processType,
        deliveryLocation,
        regionOfRegistration: "Kochi HQ",
        totalCharges: 1000,
        advancePaid: 1000,
        advancePaymentStatus: "Approved",
        trackingStatus: "In Hand",
        bmStatus: "Document In Hand",
        ownerAdminId,
      },
    });

    const mov = await prisma.documentMovement.create({
      data: {
        trackingNumber,
        registrationId: reg.id,
        fromOfficeId: officeKochiId,
        toOfficeId: officeDubaiId,
        currentOfficeId: officeDubaiId,
        status: "HOME",
        currentStatus: "Document In Hand",
        currentModule: "HOME",
      },
    });

    return { reg, mov, trackingNumber };
  }

  // Setup Master Data process type with subpackages
  let sp1 = await prisma.subPackage.findFirst({
    where: { name: "Activity 1", ownerAdminId },
  });
  if (!sp1) {
    sp1 = await prisma.subPackage.create({
      data: { name: "Activity 1", isActive: true, ownerAdminId },
    });
  }

  let sp2 = await prisma.subPackage.findFirst({
    where: { name: "Activity 2", ownerAdminId },
  });
  if (!sp2) {
    sp2 = await prisma.subPackage.create({
      data: { name: "Activity 2", isActive: true, ownerAdminId },
    });
  }

  let masterProc = await prisma.masterData.findFirst({
    where: { type: "PROCESS_TYPES", name: "MultiStepProcess", ownerAdminId },
    include: { subPackages: true },
  });

  if (!masterProc) {
    masterProc = await prisma.masterData.create({
      data: {
        type: "PROCESS_TYPES",
        name: "MultiStepProcess",
        ownerAdminId,
        subPackages: {
          connect: [{ id: sp1.id }, { id: sp2.id }],
        },
      },
      include: { subPackages: true },
    });
  }
  if (!masterProc) {
    throw new Error("Failed to resolve test master process");
  }
  console.log("Master Process resolved with subpackages:", masterProc.subPackages.length);

  let passedCount = 0;
  let totalCount = 14;

  // -------------------------------------------------------------
  // TEST 1: User with RD Button permission, Main Process completed -> RD works
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T1", "Genius Dubai", "SingleStepProcess");
    await prisma.movementHistory.create({
      data: { trackingNumber, action: "Marked as COMPLETED", newStatus: "COMPLETED", performedBy: "Tester" },
    });

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentStatus === "READY_FOR_DELIVERY" && updatedMov?.currentOfficeId === officeDubaiId) {
      console.log("PASS: Test 1 - RD works for Main Process completed");
      passedCount++;
    } else {
      console.error("FAIL: Test 1", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // TEST 2: User with RD Button permission, Main Process incomplete -> RD STILL WORKS (Manual Override)
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T2", "Genius Dubai", "MultiStepProcess");
    // No completed activities -> Main Process incomplete

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentStatus === "READY_FOR_DELIVERY" && updatedMov?.currentOfficeId === officeDubaiId) {
      console.log("PASS: Test 2 - RD manual override works when Main Process is incomplete");
      passedCount++;
    } else {
      console.error("FAIL: Test 2", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // TEST 3: User with RD Button permission, all sub-processes incomplete -> RD STILL WORKS
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T3", "Kochi HQ", "MultiStepProcess");

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentStatus === "READY_FOR_DELIVERY" && updatedMov?.currentOfficeId === officeKochiId) {
      console.log("PASS: Test 3 - RD works when all sub-processes are incomplete");
      passedCount++;
    } else {
      console.error("FAIL: Test 3", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // TEST 4: User with RD Button permission, mixed sub-process statuses -> RD STILL WORKS
  // -------------------------------------------------------------
  {
    const { trackingNumber, reg } = await createTestRegistration("T4", "Calicut Office", "MultiStepProcess");
    // 1 of 2 subpackages completed
    await prisma.subPackageMovement.create({
      data: {
        documentId: reg.id,
        trackingNumber,
        subPackageId: masterProc.subPackages[0].id,
        status: "Completed",
        ownerAdminId,
      },
    });

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentStatus === "READY_FOR_DELIVERY" && updatedMov?.currentOfficeId === officeCalicutId) {
      console.log("PASS: Test 4 - RD works with mixed sub-process statuses");
      passedCount++;
    } else {
      console.error("FAIL: Test 4", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // TEST 5 & 6: Permission enforcement on RD button & API
  // -------------------------------------------------------------
  {
    const userWithPermission = {
      id: "u1",
      isSuperAdmin: false,
      permissions: ["home.document_in_hand.rd_button", "home.document_in_hand.view"],
    };

    const userWithoutPermission = {
      id: "u2",
      isSuperAdmin: false,
      permissions: ["home.document_in_hand.view", "home.document_in_hand.transfer"],
    };

    const hasPermAllowed =
      hasPermission(userWithPermission, "home.document_in_hand.rd_button") ||
      hasPermission(userWithPermission, "home.rd_button");

    const hasPermDenied =
      hasPermission(userWithoutPermission, "home.document_in_hand.rd_button") ||
      hasPermission(userWithoutPermission, "home.rd_button");

    if (hasPermAllowed === true && hasPermDenied === false) {
      console.log("PASS: Test 5 & 6 - Permission check correctly allows user with RD Button permission and rejects user without");
      passedCount += 2;
    } else {
      console.error("FAIL: Test 5 & 6", { hasPermAllowed, hasPermDenied });
    }
  }

  // -------------------------------------------------------------
  // TEST 7: Document Delivery Location = Genius Dubai -> RD routes to Genius Dubai Ready For Delivery
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T7", "Genius Dubai", "SingleStepProcess");
    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentOfficeId === officeDubaiId) {
      console.log("PASS: Test 7 - RD routed to Genius Dubai");
      passedCount++;
    } else {
      console.error("FAIL: Test 7", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // TEST 8: Document Delivery Location = Kochi HQ -> RD routes to Kochi HQ Ready For Delivery
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T8", "Kochi HQ", "SingleStepProcess");
    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentOfficeId === officeKochiId) {
      console.log("PASS: Test 8 - RD routed to Kochi HQ");
      passedCount++;
    } else {
      console.error("FAIL: Test 8", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // TEST 9: Multiple selected documents with different Delivery Locations
  // -------------------------------------------------------------
  {
    const d1 = await createTestRegistration("T9-D1", "Genius Dubai", "MultiStepProcess");
    const d2 = await createTestRegistration("T9-D2", "Kochi HQ", "MultiStepProcess");
    const d3 = await createTestRegistration("T9-D3", "Calicut Office", "MultiStepProcess");

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [d1.trackingNumber, d2.trackingNumber, d3.trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const mov1 = await prisma.documentMovement.findFirst({ where: { trackingNumber: d1.trackingNumber } });
    const mov2 = await prisma.documentMovement.findFirst({ where: { trackingNumber: d2.trackingNumber } });
    const mov3 = await prisma.documentMovement.findFirst({ where: { trackingNumber: d3.trackingNumber } });

    if (
      result.successCount === 3 &&
      mov1?.currentOfficeId === officeDubaiId &&
      mov2?.currentOfficeId === officeKochiId &&
      mov3?.currentOfficeId === officeCalicutId
    ) {
      console.log("PASS: Test 9 - Multiple documents routed independently to respective Delivery Locations regardless of process status");
      passedCount++;
    } else {
      console.error("FAIL: Test 9", result);
    }
  }

  // -------------------------------------------------------------
  // TEST 10: Document has no valid Delivery Location -> RD is rejected safely
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T10", "", "SingleStepProcess");
    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    if (result.failureCount === 1 && result.rejectedDocuments[0]?.reason.includes("Delivery Location")) {
      console.log("PASS: Test 10 - Document with missing Delivery Location safely rejected");
      passedCount++;
    } else {
      console.error("FAIL: Test 10", result);
    }
  }

  // -------------------------------------------------------------
  // TEST 11: Document already Delivered -> Preserve existing terminal state rules
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T11", "Genius Dubai", "SingleStepProcess");
    await prisma.registration.update({
      where: { trackingNumber },
      data: { trackingStatus: "Delivered", deliveryStatus: "Delivered" },
    });
    await prisma.documentMovement.updateMany({
      where: { trackingNumber },
      data: { currentStatus: "Delivered", status: "Delivered" },
    });

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    if (result.failureCount === 1 && result.rejectedDocuments[0]?.reason.includes("already delivered")) {
      console.log("PASS: Test 11 - Already Delivered document rejected by RD");
      passedCount++;
    } else {
      console.error("FAIL: Test 11", result);
    }
  }

  // -------------------------------------------------------------
  // TEST 12: Normal Inbound Bundle Receive workflow (Dual condition: Main Process complete + Office match)
  // -------------------------------------------------------------
  {
    // 12a: Inbound Receive with completed Main Process + matching Delivery Location -> Moves to Ready For Delivery
    const { trackingNumber: tAuto1, reg: regAuto1 } = await createTestRegistration("T12A", "Genius Dubai", "SingleStepProcess");
    await prisma.movementHistory.create({
      data: { trackingNumber: tAuto1, action: "Marked as COMPLETED", newStatus: "COMPLETED", performedBy: "Tester" },
    });

    const bundle1 = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-${Date.now()}-T12A`,
        fromOfficeId: officeKochiId,
        toOfficeId: officeDubaiId,
        status: "INBOUND_PENDING",
        createdBy: "Tester",
        ownerAdminId,
        items: {
          create: [{ registrationId: regAuto1.id, trackingNumber: tAuto1, status: "INBOUND_PENDING" }],
        },
      },
    });

    await receiveBundle({
      bundleId: bundle1.id,
      receivedTrackingNumbers: [tAuto1],
      userId: admin.id,
      ownerAdminId,
    });

    const movAuto1 = await prisma.documentMovement.findFirst({ where: { trackingNumber: tAuto1 } });

    // 12b: Inbound Receive with INCOMPLETE Main Process -> Must remain in Document In Hand
    const { trackingNumber: tAuto2, reg: regAuto2 } = await createTestRegistration("T12B", "Genius Dubai", "MultiStepProcess");
    const bundle2 = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-${Date.now()}-T12B`,
        fromOfficeId: officeKochiId,
        toOfficeId: officeDubaiId,
        status: "INBOUND_PENDING",
        createdBy: "Tester",
        ownerAdminId,
        items: {
          create: [{ registrationId: regAuto2.id, trackingNumber: tAuto2, status: "INBOUND_PENDING" }],
        },
      },
    });

    await receiveBundle({
      bundleId: bundle2.id,
      receivedTrackingNumbers: [tAuto2],
      userId: admin.id,
      ownerAdminId,
    });

    const movAuto2 = await prisma.documentMovement.findFirst({ where: { trackingNumber: tAuto2 } });

    if (movAuto1?.currentStatus === "READY_FOR_DELIVERY" && movAuto2?.currentStatus === "Document In Hand") {
      console.log("PASS: Test 12 - Normal Inbound Receive automatic routing logic preserved intact");
      passedCount++;
    } else {
      console.error("FAIL: Test 12", { movAuto1: movAuto1?.currentStatus, movAuto2: movAuto2?.currentStatus });
    }
  }

  // -------------------------------------------------------------
  // TEST 13 & 14: Document In Hand & Ready For Delivery state queries
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("T13", "Genius Dubai", "SingleStepProcess");
    const beforeMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });

    await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const afterMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });

    if (beforeMov?.currentStatus === "Document In Hand" && afterMov?.currentStatus === "READY_FOR_DELIVERY" && afterMov?.currentModule === "READY_FOR_DELIVERY") {
      console.log("PASS: Test 13 & 14 - Document state cleanly transitions from Document In Hand to Ready For Delivery workflow");
      passedCount += 2;
    } else {
      console.error("FAIL: Test 13 & 14", { beforeMov, afterMov });
    }
  }

  console.log(`\n=== TEST SUMMARY: ${passedCount} / ${totalCount} PASSED ===`);
  if (passedCount === totalCount) {
    console.log("ALL TESTS PASSED PERFECTLY!");
  } else {
    throw new Error(`Only ${passedCount} of ${totalCount} tests passed`);
  }
}

runTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
