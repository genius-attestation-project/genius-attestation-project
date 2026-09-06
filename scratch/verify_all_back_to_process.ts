import { prisma } from "../src/lib/prisma";
import { getProcessStats, listProcessAssignments, processBulkMove } from "../src/features/process/server/process.service";
import { transferBackToProcess, receiveBundleDocuments } from "../src/features/assigned-office/server/assigned-office.service";

async function main() {
  console.log("=================================================================");
  console.log("=== COMPREHENSIVE BACK-TO-PROCESS VERIFICATION & TEST SUITE ===");
  console.log("=================================================================\n");

  const results: Record<string, "PASS" | "FAIL"> = {};

  // -------------------------------------------------------------
  // TEST 1: Verify Documents 8564 and 123456 in Process Delhi
  // -------------------------------------------------------------
  console.log("--- TEST 1: Inspecting Documents 8564 and 123456 in Process Delhi ---");
  const tenant1OwnerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";
  const docs8564 = await prisma.documentMovement.findMany({
    where: { trackingNumber: { in: ["8564", "123456"] } },
    include: {
      fromOffice: true,
      toOffice: true,
      currentOffice: true,
      bundle: {
        include: { items: true, fromOffice: true, toOffice: true },
      },
    },
  });

  let test1Pass = true;
  for (const doc of docs8564) {
    const isDelhi = doc.toOffice?.officeName === "Process Delhi" || doc.currentOffice?.officeName === "Process Delhi";
    const isInbound = doc.status === "INBOUND" && doc.currentStatus === "Pending Receive";
    const hasBundle = doc.bundle?.bundleNumber?.startsWith("BND-PROC-");
    console.log(`Doc ${doc.trackingNumber}: Office=${doc.toOffice?.officeName}, Status=${doc.status}/${doc.currentStatus}, Bundle=${doc.bundle?.bundleNumber}`);
    if (!isDelhi || !isInbound || !hasBundle) {
      test1Pass = false;
    }
  }

  // Query Process Module Inbound for Process Delhi
  const delhiStats = await getProcessStats(tenant1OwnerAdminId, "Process Delhi");
  const delhiInbound = await listProcessAssignments(tenant1OwnerAdminId, "Process Delhi", undefined, "inbound");
  console.log(`Process Delhi Inbound Stats: Inbound=${delhiStats.inbound}, Total=${delhiStats.total}`);
  console.log(`Process Delhi Inbound Bundles Count: ${delhiInbound.length}`);
  const foundDelhiBundle = delhiInbound.find((b: any) => b.bundleNumber === "BND-PROC-20260906-6559-PNYP");
  if (foundDelhiBundle && foundDelhiBundle.items?.length === 2) {
    console.log(`[PASS] Found Bundle ${foundDelhiBundle.bundleNumber} in Process Delhi with items: ${foundDelhiBundle.items.map((i: any) => i.trackingNumber).join(", ")}`);
  } else {
    console.error("[FAIL] Process Delhi Inbound bundle not found or items count mismatch");
    test1Pass = false;
  }
  results["TEST 1: Documents 8564 and 123456 in Process Delhi Inbound"] = test1Pass ? "PASS" : "FAIL";

  // -------------------------------------------------------------
  // TEST 2: Verify Restored Older Documents (9 records) in Genius Qatar
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Inspecting 9 Older Restored Documents in Genius Qatar ---");
  const tenant2OwnerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  const olderTrackingNumbers = ["62238", "62211", "61849", "61811", "61750", "61802", "61733", "61724", "61793"];
  const olderMovements = await prisma.documentMovement.findMany({
    where: { trackingNumber: { in: olderTrackingNumbers } },
    include: {
      fromOffice: true,
      toOffice: true,
      bundle: { include: { items: true } },
    },
  });

  let test2Pass = olderMovements.length === 9;
  for (const m of olderMovements) {
    const isQatar = m.toOffice?.officeName === "Genius Qatar";
    const hasBundle = m.bundle?.bundleNumber === "BND-PROC-20260905-0104";
    const isInbound = m.status === "INBOUND" && m.currentStatus === "Pending Receive";
    if (!isQatar || !hasBundle || !isInbound) {
      test2Pass = false;
    }
  }

  const qatarStats = await getProcessStats(tenant2OwnerAdminId, "Genius Qatar");
  const qatarInbound = await listProcessAssignments(tenant2OwnerAdminId, "Genius Qatar", undefined, "inbound");
  console.log(`Genius Qatar Inbound Stats: Inbound=${qatarStats.inbound}, Total=${qatarStats.total}`);
  console.log(`Genius Qatar Inbound Bundles Count: ${qatarInbound.length}`);
  const foundQatarBundle = qatarInbound.find((b: any) => b.bundleNumber === "BND-PROC-20260905-0104");
  if (foundQatarBundle && foundQatarBundle.items?.length === 9) {
    console.log(`[PASS] Found Restored Bundle ${foundQatarBundle.bundleNumber} in Genius Qatar with 9 documents: ${foundQatarBundle.items.map((i: any) => i.trackingNumber).join(", ")}`);
  } else {
    console.error("[FAIL] Restored Bundle in Genius Qatar not found or items count mismatch");
    test2Pass = false;
  }
  results["TEST 2: Restored 9 Older Documents in Genius Qatar Inbound"] = test2Pass ? "PASS" : "FAIL";

  // -------------------------------------------------------------
  // TEST 3: End-to-End Fresh Lifecycle Test
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: End-to-End Fresh Back-to-Process Workflow Test ---");
  const timestamp = Date.now();
  const testTNum = `TEST-B2P-${timestamp}`;
  const testOwnerAdminId = tenant1OwnerAdminId;

  // Process Delhi office & AmGenius office
  const processOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId: testOwnerAdminId, officeName: "Process Delhi" },
  });
  const assignedOffice = await prisma.assignedOffice.findFirst({
    where: { ownerAdminId: testOwnerAdminId, username: "AmGenius" },
  });
  const assignedOfficeLoc = await prisma.officeLocation.findFirst({
    where: { ownerAdminId: testOwnerAdminId, officeName: "AmGenius" },
  });

  if (!processOffice || !assignedOffice || !assignedOfficeLoc) {
    throw new Error("Required offices not found for e2e test");
  }

  // 1. Create fresh test registration
  const reg = await prisma.registration.create({
    data: {
      trackingNumber: testTNum,
      customerName: "E2E Test Customer",
      mobile: "+919999999999",
      email: "test@example.com",
      address: "Test Address",
      country: "India",
      customerType: "Individual",
      documentType: "Degree Certificate",
      documentName: "Test Doc",
      documentIssuedCountry: "India",
      processType: "UAE Embassy With Mofa Nonedu",
      priority: "Normal",
      regionOfRegistration: "Kochi HQ",
      trackingStatus: "In Hand",
      bmStatus: "Pending",
      ownerAdminId: testOwnerAdminId,
      createdBy: testOwnerAdminId,
    },
  });

  // 2. Transfer from Process Delhi to Assigned Office AmGenius via Bundle
  const dispatchBundle = await prisma.bundle.create({
    data: {
      bundleNumber: `HOME-${timestamp}-E2E`,
      fromOfficeId: processOffice.id,
      toOfficeId: assignedOfficeLoc.id,
      status: "INBOUND_PENDING",
      createdBy: "Test Runner",
      ownerAdminId: testOwnerAdminId,
      items: {
        create: [{ trackingNumber: testTNum, status: "INBOUND_PENDING", registrationId: reg.id }],
      },
    },
  });

  await prisma.documentMovement.create({
    data: {
      trackingNumber: testTNum,
      registrationId: reg.id,
      fromModule: "PROCESS_MODULE",
      toModule: "ASSIGNED_OFFICE",
      currentModule: "ASSIGNED_OFFICE",
      movementType: "DISPATCH",
      status: "INBOUND_PENDING",
      currentStatus: "Pending Receive",
      fromOfficeId: processOffice.id,
      toOfficeId: assignedOfficeLoc.id,
      currentOfficeId: assignedOfficeLoc.id,
      originalProcessOfficeId: processOffice.id,
      returnOfficeId: processOffice.id,
      bundleId: dispatchBundle.id,
      createdBy: "Test Runner",
    },
  });

  // 3. Receive in Assigned Office
  const receiveResult = await receiveBundleDocuments({
    bundleId: dispatchBundle.id,
    selectedTrackingNumbers: [testTNum],
    officeId: assignedOfficeLoc.id,
    userId: testOwnerAdminId,
    userName: "Test Runner",
    ownerAdminId: testOwnerAdminId,
  });
  console.log(`Assigned Office receive result: success=${receiveResult.success}`);

  // 4. Execute Back to Process
  const backResult = await transferBackToProcess({
    trackingNumbers: [testTNum],
    officeId: assignedOfficeLoc.id,
    userId: testOwnerAdminId,
    userName: "Test Runner",
    ownerAdminId: testOwnerAdminId,
    remarks: "E2E automated return to process",
  });
  console.log(`Back to Process execution: success=${backResult.success}, bundle=${backResult.bundleNumbers?.join(", ")}`);

  // 5. Verify Document is visible in Process Delhi Inbound queue
  const delhiInboundFresh = await listProcessAssignments(testOwnerAdminId, "Process Delhi", undefined, "inbound");
  const foundFresh = delhiInboundFresh.find((b: any) =>
    b.items?.some((i: any) => i.trackingNumber === testTNum)
  );

  let test3Pass = false;
  if (foundFresh) {
    console.log(`[PASS] Test document ${testTNum} found in Process Delhi Inbound under bundle ${foundFresh.bundleNumber}`);
    
    // 6. Receive in Process Module
    const procReceive = await processBulkMove({
      trackingNumbers: [testTNum],
      action: "RECEIVE",
      officeLocationName: "Process Delhi",
      userId: testOwnerAdminId,
      ownerAdminId: testOwnerAdminId,
      remarks: "Received in Process Delhi",
    });
    console.log(`Process receive result: success=${procReceive !== undefined}`);

    // 7. Verify document is now in Document In Hand of Process Delhi
    const delhiInHand = await listProcessAssignments(testOwnerAdminId, "Process Delhi", undefined, "inhand");
    const foundInHand = delhiInHand.find((d: any) => d.trackingNumber === testTNum);
    if (foundInHand) {
      console.log(`[PASS] Test document ${testTNum} is now in Process Delhi Document In Hand`);
      test3Pass = true;
    }
  }

  // Cleanup test registration & records
  await prisma.movementHistory.deleteMany({ where: { trackingNumber: testTNum } });
  await prisma.documentWorkflowHistory.deleteMany({ where: { trackingNumber: testTNum } });
  await prisma.auditTrail.deleteMany({ where: { registrationId: reg.id } });
  await prisma.bundleItem.deleteMany({ where: { trackingNumber: testTNum } });
  await prisma.documentMovement.deleteMany({ where: { trackingNumber: testTNum } });
  await prisma.registration.delete({ where: { id: reg.id } });
  await prisma.bundle.deleteMany({ where: { id: dispatchBundle.id } });

  results["TEST 3: End-to-End Fresh Lifecycle Test"] = test3Pass ? "PASS" : "FAIL";

  console.log("\n=================================================================");
  console.log("=== FINAL TEST SUMMARY ===");
  console.log("=================================================================");
  for (const [testName, result] of Object.entries(results)) {
    console.log(`${result === "PASS" ? "✅" : "❌"} ${testName}: ${result}`);
  }
}

main()
  .catch((e) => {
    console.error("Verification failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
