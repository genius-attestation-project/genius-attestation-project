import { prisma } from "../src/lib/prisma";
import { receiveBundle, routeDocumentsToReadyForDelivery } from "../src/features/home/server/bundle-workflow.service";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

async function runTests() {
  console.log("=== RUNNING ALL 12 VERIFICATION SCENARIOS ===");

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
        trackingStatus: "In Transfer",
        bmStatus: "Transferred",
        ownerAdminId,
      },
    });

    const mov = await prisma.documentMovement.create({
      data: {
        trackingNumber,
        registrationId: reg.id,
        fromOfficeId: officeKochi!.id,
        toOfficeId: officeDubai!.id,
        currentOfficeId: officeDubai!.id,
        status: "INBOUND_PENDING",
        currentStatus: "Pending Receive",
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
  let totalCount = 12;

  // -------------------------------------------------------------
  // SCENARIO 1: Main Process = Completed, Delivery Location = Receiving Office, Inbound Bundle = Received -> Ready For Delivery
  // -------------------------------------------------------------
  {
    const { trackingNumber, reg } = await createTestRegistration("SC1", "Genius Dubai", "SingleStepProcess");
    // Mark Main Process Completed via MovementHistory
    await prisma.movementHistory.create({
      data: {
        trackingNumber,
        action: "Marked as COMPLETED",
        newStatus: "COMPLETED",
        performedBy: "Tester",
      },
    });

    const bundle = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-${Date.now()}-SC1`,
        fromOfficeId: officeKochi.id,
        toOfficeId: officeDubai.id,
        status: "INBOUND_PENDING",
        createdBy: "Tester",
        ownerAdminId,
        items: {
          create: [{ registrationId: reg.id, trackingNumber, status: "INBOUND_PENDING" }],
        },
      },
    });

    await receiveBundle({
      bundleId: bundle.id,
      receivedTrackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedReg = await prisma.registration.findUnique({ where: { trackingNumber } });
    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });

    if (updatedReg?.trackingStatus === "Ready for Delivery" && updatedMov?.currentStatus === "READY_FOR_DELIVERY") {
      console.log("PASS: Scenario 1 - Main Process Completed + Delivery Location matches Receiving Office -> Ready For Delivery");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 1", { trackingStatus: updatedReg?.trackingStatus, movStatus: updatedMov?.currentStatus });
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 2: Main Process = Not Completed, Sub Process = Completed, Delivery Location = Receiving Office, Inbound Bundle = Received -> Document In Hand
  // -------------------------------------------------------------
  {
    const { trackingNumber, reg } = await createTestRegistration("SC2", "Genius Dubai", "MultiStepProcess");
    // Only 1 of 2 subpackages completed
    await prisma.subPackageMovement.create({
      data: {
        documentId: reg.id,
        trackingNumber,
        subPackageId: masterProc.subPackages[0].id,
        status: "Completed",
        ownerAdminId,
      },
    });

    const bundle = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-${Date.now()}-SC2`,
        fromOfficeId: officeKochi.id,
        toOfficeId: officeDubai.id,
        status: "INBOUND_PENDING",
        createdBy: "Tester",
        ownerAdminId,
        items: {
          create: [{ registrationId: reg.id, trackingNumber, status: "INBOUND_PENDING" }],
        },
      },
    });

    await receiveBundle({
      bundleId: bundle.id,
      receivedTrackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedReg = await prisma.registration.findUnique({ where: { trackingNumber } });
    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });

    if (updatedReg?.trackingStatus === "Document In Hand" && updatedMov?.currentStatus === "Document In Hand") {
      console.log("PASS: Scenario 2 - Sub Process Completed but Main Process Incomplete -> Document In Hand");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 2", { trackingStatus: updatedReg?.trackingStatus, movStatus: updatedMov?.currentStatus });
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 3: Main Process = Completed, Delivery Location = Different Office, Receiving Office = Another Office -> Document In Hand
  // -------------------------------------------------------------
  {
    const { trackingNumber, reg } = await createTestRegistration("SC3", "Kochi HQ", "SingleStepProcess");
    // Main process completed, but receiving at Dubai while delivery location is Kochi
    await prisma.movementHistory.create({
      data: {
        trackingNumber,
        action: "Marked as COMPLETED",
        newStatus: "COMPLETED",
        performedBy: "Tester",
      },
    });

    const bundle = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-${Date.now()}-SC3`,
        fromOfficeId: officeCalicut.id,
        toOfficeId: officeDubai.id,
        status: "INBOUND_PENDING",
        createdBy: "Tester",
        ownerAdminId,
        items: {
          create: [{ registrationId: reg.id, trackingNumber, status: "INBOUND_PENDING" }],
        },
      },
    });

    await receiveBundle({
      bundleId: bundle.id,
      receivedTrackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedReg = await prisma.registration.findUnique({ where: { trackingNumber } });
    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });

    if (updatedReg?.trackingStatus === "Document In Hand" && updatedMov?.currentStatus === "Document In Hand") {
      console.log("PASS: Scenario 3 - Main Process Completed but Receiving at different office -> Document In Hand");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 3", { trackingStatus: updatedReg?.trackingStatus, movStatus: updatedMov?.currentStatus });
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 4: Main Process = Completed, Delivery Location = Genius Dubai, Document is at Genius Dubai -> Ready For Delivery at Genius Dubai
  // -------------------------------------------------------------
  {
    const { trackingNumber, reg } = await createTestRegistration("SC4", "Genius Dubai", "SingleStepProcess");
    await prisma.movementHistory.create({
      data: {
        trackingNumber,
        action: "Marked as COMPLETED",
        newStatus: "COMPLETED",
        performedBy: "Tester",
      },
    });

    const bundle = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-${Date.now()}-SC4`,
        fromOfficeId: officeKochi.id,
        toOfficeId: officeDubai.id,
        status: "INBOUND_PENDING",
        createdBy: "Tester",
        ownerAdminId,
        items: {
          create: [{ registrationId: reg.id, trackingNumber, status: "INBOUND_PENDING" }],
        },
      },
    });

    await receiveBundle({
      bundleId: bundle.id,
      receivedTrackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (updatedMov?.currentOfficeId === officeDubai.id && updatedMov?.currentStatus === "READY_FOR_DELIVERY") {
      console.log("PASS: Scenario 4 - Ready For Delivery at Genius Dubai");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 4", updatedMov);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 5: Main Process = Completed, Delivery Location = Kochi HQ, Document is at Kochi HQ -> Ready For Delivery at Kochi HQ
  // -------------------------------------------------------------
  {
    const { trackingNumber, reg } = await createTestRegistration("SC5", "Kochi HQ", "SingleStepProcess");
    await prisma.movementHistory.create({
      data: {
        trackingNumber,
        action: "Marked as COMPLETED",
        newStatus: "COMPLETED",
        performedBy: "Tester",
      },
    });

    const bundle = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-${Date.now()}-SC5`,
        fromOfficeId: officeDubai.id,
        toOfficeId: officeKochi.id,
        status: "INBOUND_PENDING",
        createdBy: "Tester",
        ownerAdminId,
        items: {
          create: [{ registrationId: reg.id, trackingNumber, status: "INBOUND_PENDING" }],
        },
      },
    });

    await receiveBundle({
      bundleId: bundle.id,
      receivedTrackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (updatedMov?.currentOfficeId === officeKochi.id && updatedMov?.currentStatus === "READY_FOR_DELIVERY") {
      console.log("PASS: Scenario 5 - Ready For Delivery at Kochi HQ");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 5", updatedMov);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 6: Main Process = Not Completed, Delivery Location = Genius Dubai, User clicks RD -> RD must reject
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("SC6", "Genius Dubai", "MultiStepProcess");
    // No completed activities
    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    if (result.failureCount === 1 && result.rejectedDocuments[0]?.trackingNumber === trackingNumber) {
      console.log("PASS: Scenario 6 - RD rejected document with incomplete Main Process");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 6", result);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 7: Main Process = Completed, Delivery Location = Genius Dubai, User clicks RD while document is at another office
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("SC7", "Genius Dubai", "SingleStepProcess");
    await prisma.movementHistory.create({
      data: {
        trackingNumber,
        action: "Marked as COMPLETED",
        newStatus: "COMPLETED",
        performedBy: "Tester",
      },
    });

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentOfficeId === officeDubai.id && updatedMov?.currentStatus === "READY_FOR_DELIVERY") {
      console.log("PASS: Scenario 7 - RD routed document to its actual Delivery Location (Dubai)");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 7", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 8: Multiple documents selected: Doc 1 (Dubai, Completed), Doc 2 (Kochi, Completed), Doc 3 (Calicut, Incomplete)
  // -------------------------------------------------------------
  {
    const d1 = await createTestRegistration("SC8-D1", "Genius Dubai", "SingleStepProcess");
    await prisma.movementHistory.create({
      data: { trackingNumber: d1.trackingNumber, action: "Marked as COMPLETED", newStatus: "COMPLETED", performedBy: "Tester" },
    });

    const d2 = await createTestRegistration("SC8-D2", "Kochi HQ", "SingleStepProcess");
    await prisma.movementHistory.create({
      data: { trackingNumber: d2.trackingNumber, action: "Marked as COMPLETED", newStatus: "COMPLETED", performedBy: "Tester" },
    });

    const d3 = await createTestRegistration("SC8-D3", "Calicut Office", "MultiStepProcess");

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [d1.trackingNumber, d2.trackingNumber, d3.trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const mov1 = await prisma.documentMovement.findFirst({ where: { trackingNumber: d1.trackingNumber } });
    const mov2 = await prisma.documentMovement.findFirst({ where: { trackingNumber: d2.trackingNumber } });
    const mov3 = await prisma.documentMovement.findFirst({ where: { trackingNumber: d3.trackingNumber } });

    if (
      result.successCount === 2 &&
      result.failureCount === 1 &&
      mov1?.currentOfficeId === officeDubai.id &&
      mov2?.currentOfficeId === officeKochi.id &&
      mov3?.currentStatus !== "READY_FOR_DELIVERY"
    ) {
      console.log("PASS: Scenario 8 - Multiple documents routed independently to respective Delivery Locations, invalid rejected");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 8", result);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 9: Existing document already in Document In Hand: Main Process = Completed, Delivery Location = Valid
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("SC9", "Genius Dubai", "SingleStepProcess");
    await prisma.documentMovement.updateMany({
      where: { trackingNumber },
      data: { status: "HOME", currentStatus: "Document In Hand", currentModule: "HOME" },
    });
    await prisma.movementHistory.create({
      data: { trackingNumber, action: "Marked as COMPLETED", newStatus: "COMPLETED", performedBy: "Tester" },
    });

    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    const updatedMov = await prisma.documentMovement.findFirst({ where: { trackingNumber } });
    if (result.successCount === 1 && updatedMov?.currentStatus === "READY_FOR_DELIVERY") {
      console.log("PASS: Scenario 9 - Existing Document In Hand document correctly moved to Ready For Delivery");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 9", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 10: Existing document: Main Process = Not Completed, Sub Process = Completed -> Must NOT be moved
  // -------------------------------------------------------------
  {
    const { trackingNumber, reg } = await createTestRegistration("SC10", "Genius Dubai", "MultiStepProcess");
    await prisma.documentMovement.updateMany({
      where: { trackingNumber },
      data: { status: "HOME", currentStatus: "Document In Hand", currentModule: "HOME" },
    });
    // Only 1 sub-package completed
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
    if (result.failureCount === 1 && updatedMov?.currentStatus === "Document In Hand") {
      console.log("PASS: Scenario 10 - Incomplete Main Process document not moved to Ready For Delivery");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 10", result, updatedMov);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 11: Document already Delivered. User clicks RD -> RD must reject
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("SC11", "Genius Dubai", "SingleStepProcess");
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
      console.log("PASS: Scenario 11 - Already Delivered document rejected by RD");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 11", result);
    }
  }

  // -------------------------------------------------------------
  // SCENARIO 12: Manual API validation rejection when Main Process is not completed
  // -------------------------------------------------------------
  {
    const { trackingNumber } = await createTestRegistration("SC12", "Genius Dubai", "MultiStepProcess");
    const result = await routeDocumentsToReadyForDelivery({
      trackingNumbers: [trackingNumber],
      userId: admin.id,
      ownerAdminId,
    });

    if (result.failureCount === 1 && (result.rejectedDocuments[0]?.reason.toLowerCase().includes("incomplete") || result.rejectedDocuments[0]?.reason.toLowerCase().includes("not been completed"))) {
      console.log("PASS: Scenario 12 - Manual API invocation rejected with clear error message");
      passedCount++;
    } else {
      console.error("FAIL: Scenario 12", result);
    }
  }

  console.log(`\n=== TEST SUMMARY: ${passedCount} / ${totalCount} PASSED ===`);
  if (passedCount === totalCount) {
    console.log("ALL 12 SCENARIOS PASSED PERFECTLY!");
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
