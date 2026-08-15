import { prisma } from "../src/lib/prisma";
import { createTransferBundle, listDocumentInHand, listInboundBundles, receiveBundle } from "../src/features/home/server/bundle-workflow.service";
import { retrieveOutboundDocuments } from "../src/features/document-movement/server/document-retrieve.service";

async function runTests() {
  console.log("=== STARTING DOCUMENT RETRIEVE WORKFLOW TESTS ===");

  // 1. Setup Test Admin User and Office Locations
  const ownerAdmin = await prisma.user.findFirst({
    where: { role: { name: "Super Admin" } },
  }) || await prisma.user.findFirst();

  if (!ownerAdmin) {
    throw new Error("No admin user found for test.");
  }
  const ownerAdminId = ownerAdmin.ownerAdminId || ownerAdmin.id;

  // Find or create Kochi HQ and Malappuram office locations
  let kochiOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: { contains: "Kochi" } },
  });
  if (!kochiOffice) {
    kochiOffice = await prisma.officeLocation.create({
      data: {
        officeName: "Kochi HQ",
        location: "Kochi",
        timezone: "UTC",
        ownerAdminId,
      },
    });
  }

  let malappuramOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: { contains: "Malappuram" } },
  });
  if (!malappuramOffice) {
    malappuramOffice = await prisma.officeLocation.create({
      data: {
        officeName: "Malappuram",
        location: "Malappuram",
        timezone: "UTC",
        ownerAdminId,
      },
    });
  }

  const testTrackingNumber = `TEST-RETRIEVE-${Date.now()}`;
  console.log(`Using Test Tracking Number: ${testTrackingNumber}`);
  console.log(`Kochi Office ID: ${kochiOffice.id}, Malappuram Office ID: ${malappuramOffice.id}`);

  try {
    // --- STEP A: Create Test Registration & Document Movement ---
    const reg = await prisma.registration.create({
      data: {
        trackingNumber: testTrackingNumber,
        customerName: "Test Customer Retrieval",
        mobile: "9998887770",
        documentType: "Degree Certificate",
        processType: "UAE Attestation",
        regionOfRegistration: kochiOffice.officeName,
        trackingStatus: "Registered",
        bmStatus: "Pending",
        ownerAdminId,
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: testTrackingNumber,
        registrationId: reg.id,
        fromOfficeId: kochiOffice.id,
        currentOfficeId: kochiOffice.id,
        toOfficeId: kochiOffice.id,
        currentModule: "REGISTRATION",
        status: "HOME",
        currentStatus: "Document In Hand",
        createdBy: ownerAdmin.id,
      },
    });

    console.log("✔ Step A: Test Registration created at Kochi HQ");

    // Check Kochi Document In Hand before transfer
    let inHandKochi = await listDocumentInHand({ ownerAdminId, officeId: kochiOffice.id });
    let hasDocInHand = inHandKochi.some((r) => r.trackingNumber === testTrackingNumber);
    console.log(`  Kochi Document In Hand includes test doc: ${hasDocInHand} (Expected: true)`);
    if (!hasDocInHand) throw new Error("Test doc should be in Kochi Document In Hand initially");

    // --- TEST CASE 1: Transfer Kochi -> Malappuram, then Retrieve before receive ---
    console.log("\n--- TEST CASE 1: Transfer & Retrieve Before Receive ---");
    const bundle1 = await createTransferBundle({
      trackingNumbers: [testTrackingNumber],
      fromOfficeId: kochiOffice.id,
      toOfficeId: malappuramOffice.id,
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Test Admin",
      ownerAdminId,
      remarks: "Test transfer Kochi -> Malappuram",
    });

    console.log(`  Bundle created: ${bundle1.bundleNumber} (ID: ${bundle1.id})`);

    // Verify Kochi Document In Hand excludes test doc after transfer
    inHandKochi = await listDocumentInHand({ ownerAdminId, officeId: kochiOffice.id });
    hasDocInHand = inHandKochi.some((r) => r.trackingNumber === testTrackingNumber);
    console.log(`  After transfer, Kochi Document In Hand includes test doc: ${hasDocInHand} (Expected: false)`);

    // Verify Malappuram Inbound Bundles includes bundle1
    const inboundMalappuram1 = await listInboundBundles({ toOfficeId: malappuramOffice.id, ownerAdminId });
    const hasInbound1 = inboundMalappuram1.some((b: any) => b.id === bundle1.id);
    console.log(`  Malappuram Inbound Bundles includes bundle: ${hasInbound1} (Expected: true)`);

    // NOW EXECUTE RETRIEVE AT KOCHI HQ
    console.log("  Executing Retrieve from Kochi HQ...");
    const retrieveRes1 = await retrieveOutboundDocuments({
      ownerAdminId,
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Test Admin",
      userOfficeId: kochiOffice.id,
      userOfficeName: kochiOffice.officeName,
      bundleId: bundle1.id,
      reason: "Transferred by mistake",
    });

    console.log(`  Retrieve Result:`, retrieveRes1);
    if (!retrieveRes1.success || retrieveRes1.retrievedCount !== 1) {
      throw new Error("Retrieve failed or count mismatched!");
    }

    // Verify Malappuram Inbound Bundles no longer includes bundle1
    const inboundMalappuramAfterRetrieve = await listInboundBundles({ toOfficeId: malappuramOffice.id, ownerAdminId });
    const hasInboundAfterRetrieve = inboundMalappuramAfterRetrieve.some((b: any) => b.id === bundle1.id);
    console.log(`  After retrieve, Malappuram Inbound Bundles includes bundle: ${hasInboundAfterRetrieve} (Expected: false)`);

    // Verify Kochi Document In Hand HAS RESTORED THE DOCUMENT!
    inHandKochi = await listDocumentInHand({ ownerAdminId, officeId: kochiOffice.id });
    hasDocInHand = inHandKochi.some((r) => r.trackingNumber === testTrackingNumber);
    console.log(`  After retrieve, Kochi Document In Hand includes test doc: ${hasDocInHand} (Expected: true)`);
    if (!hasDocInHand) throw new Error("TEST CASE 1 FAILED: Document was not restored to Kochi Document In Hand!");
    console.log("✔ TEST CASE 1 PASSED!");

    // --- TEST CASE 3: Transfer again with same tracking number ---
    console.log("\n--- TEST CASE 3: Transfer Again With Same Tracking Number ---");
    const bundle2 = await createTransferBundle({
      trackingNumbers: [testTrackingNumber],
      fromOfficeId: kochiOffice.id,
      toOfficeId: malappuramOffice.id,
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Test Admin",
      ownerAdminId,
      remarks: "Second transfer attempt",
    });

    console.log(`  Second Transfer Bundle created: ${bundle2.bundleNumber} (ID: ${bundle2.id})`);
    console.log("✔ TEST CASE 3 PASSED!");

    // --- TEST CASE 2: Receive document first, then attempt Retrieve ---
    console.log("\n--- TEST CASE 2: Receive First, Then Attempt Retrieve ---");
    await receiveBundle({
      bundleId: bundle2.id,
      receivedTrackingNumbers: [testTrackingNumber],
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Test Admin",
      ownerAdminId,
      remarks: "Received at Malappuram",
    });
    console.log("  Document received at Malappuram.");

    // Attempt retrieve after receive -> expect rejection / zero retrieved count / error
    let errorThrown = false;
    try {
      await retrieveOutboundDocuments({
        ownerAdminId,
        userId: ownerAdmin.id,
        userName: ownerAdmin.name || "Test Admin",
        userOfficeId: kochiOffice.id,
        userOfficeName: kochiOffice.officeName,
        bundleId: bundle2.id,
        reason: "Attempt retrieve after receive",
      });
    } catch (err: any) {
      errorThrown = true;
      console.log(`  Retrieve error caught as expected: "${err.message}"`);
    }

    if (!errorThrown) {
      throw new Error("TEST CASE 2 FAILED: Retrieve should have thrown error when document is already received!");
    }
    console.log("✔ TEST CASE 2 PASSED!");

    // --- TEST CASE 4: Check Movement History ---
    console.log("\n--- TEST CASE 4: Check Movement History ---");
    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: testTrackingNumber },
      orderBy: { performedAt: "asc" },
    });

    console.log(`  Movement History Entries (${history.length}):`);
    history.forEach((h, idx) => {
      console.log(`    ${idx + 1}. Action: "${h.action}", OldStatus: "${h.oldStatus}", NewStatus: "${h.newStatus}", Remarks: "${h.remarks}"`);
    });

    const hasRetrievedAction = history.some((h) => h.action === "Retrieved");
    if (!hasRetrievedAction) {
      throw new Error("TEST CASE 4 FAILED: Movement history missing 'Retrieved' action!");
    }
    console.log("✔ TEST CASE 4 PASSED!");

    console.log("\n=== ALL TEST CASES PASSED SUCCESSFULLY ===");

  } finally {
    // Cleanup test records
    console.log("\nCleaning up test records...");
    await prisma.movementHistory.deleteMany({ where: { trackingNumber: testTrackingNumber } });
    await prisma.documentWorkflowHistory.deleteMany({ where: { trackingNumber: testTrackingNumber } });
    await prisma.bundleItem.deleteMany({ where: { trackingNumber: testTrackingNumber } });
    await prisma.documentMovement.deleteMany({ where: { trackingNumber: testTrackingNumber } });
    await prisma.bundle.deleteMany({ where: { bundleNumber: { contains: "HOME-" } } });
    await prisma.registration.deleteMany({ where: { trackingNumber: testTrackingNumber } });
    console.log("Cleanup finished.");
  }
}

runTests().catch((err) => {
  console.error("TEST SUITE FAILED:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
