import { prisma } from "../src/lib/prisma";
import {
  transferBackToProcess,
  getAuthorizedProcessRecipientsForAssignedOffice,
  receiveBundleDocuments,
  transferToSubPackage,
  processSubPackageDocumentAction,
} from "../src/features/assigned-office/server/assigned-office.service";
import {
  processBulkMove,
  listProcessAssignments,
} from "../src/features/process/server/process.service";
import {
  createTransferBundle,
  receiveTransferBundle,
} from "../src/features/home/server/bundle-workflow.service";

interface TestReport {
  testNumber: number;
  testName: string;
  result: "PASS" | "FAIL";
  evidence: string;
}

async function runAll8Tests() {
  console.log("===================================================================");
  console.log("EXECUTION OF ALL 8 REGRESSION & FUNCTIONAL TESTS FOR BACK TO PROCESS");
  console.log("===================================================================\n");

  const reports: TestReport[] = [];
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  const runId = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`[0] Setup start with runId: ${runId}`);

  // 0. Setup Offices & Users
  const aoOfficeName = `Test AmGenius ${runId}`;
  const kochiHQName = `Test Kochi HQ ${runId}`;
  const isolatedOfficeName = `Test Isolated Office ${runId}`;

  // Create OfficeLocations
  const aoLoc = await prisma.officeLocation.create({
    data: {
      officeName: aoOfficeName,
      location: "External Processing Office",
      timezone: "UTC",
      isProcessOffice: true,
      ownerAdminId,
    },
  });
  console.log(`[0] Created aoLoc: ${aoLoc.id}`);

  const kochiLoc = await prisma.officeLocation.create({
    data: {
      officeName: kochiHQName,
      location: "Headquarters",
      timezone: "UTC",
      ownerAdminId,
    },
  });
  console.log(`[0] Created kochiLoc: ${kochiLoc.id}`);

  const isolatedLoc = await prisma.officeLocation.create({
    data: {
      officeName: isolatedOfficeName,
      location: "Isolated Office",
      timezone: "UTC",
      isProcessOffice: true,
      ownerAdminId,
    },
  });
  console.log(`[0] Created isolatedLoc: ${isolatedLoc.id}`);

  // Create AssignedOffice accounts
  const aoAccount = await (prisma as any).assignedOffice.create({
    data: {
      username: aoOfficeName,
      email: `amgenius_${runId}@genius.test`,
      passwordHash: "dummyhash",
      status: true,
      ownerAdminId,
    },
  });
  console.log(`[0] Created aoAccount: ${aoAccount.id}`);

  const isolatedAOAccount = await (prisma as any).assignedOffice.create({
    data: {
      username: isolatedOfficeName,
      email: `isolated_${runId}@genius.test`,
      passwordHash: "dummyhash",
      status: true,
      ownerAdminId,
    },
  });
  console.log(`[0] Created isolatedAOAccount: ${isolatedAOAccount.id}`);

  // Create User Amal: Process Module = YES, AmGenius Visibility = YES
  const userAmal = await prisma.user.create({
    data: {
      name: `Amal User ${runId}`,
      email: `amal_${runId}@genius.test`,
      ownerAdminId,
      isActive: true,
      isLocked: false,
    },
  });
  console.log(`[0] Created userAmal: ${userAmal.id}`);

  await prisma.userPermission.create({
    data: { userId: userAmal.id, permissionKey: "process.view" },
  });
  await prisma.userPermission.create({
    data: { userId: userAmal.id, permissionKey: "process.inbound.view" },
  });
  await prisma.userPermission.create({
    data: { userId: userAmal.id, permissionKey: "process.inbound.receive" },
  });
  await prisma.userOfficeVisibility.create({
    data: {
      userId: userAmal.id,
      moduleKey: "process",
      officeLocationId: aoLoc.id,
    },
  });
  console.log(`[0] Configured permissions and visibility for userAmal`);

  // Create User Bob: Process Module = YES, AmGenius Visibility = NO
  const userBob = await prisma.user.create({
    data: {
      name: `Bob User ${runId}`,
      email: `bob_${runId}@genius.test`,
      ownerAdminId,
      isActive: true,
      isLocked: false,
    },
  });
  await prisma.userPermission.create({
    data: { userId: userBob.id, permissionKey: "process.view" },
  });
  console.log(`[0] Configured userBob: ${userBob.id}`);

  // Helper to create test document in Assigned Office Document In Hand
  async function createAODocument(tag: string, officeLocationId: string = aoLoc.id) {
    const tNum = `TEST-B2P-${runId}-${tag}`;
    const reg = await prisma.registration.create({
      data: {
        trackingNumber: tNum,
        customerName: `Customer ${tag}`,
        documentType: "Degree Certificate",
        processType: "Apostille",
        ownerAdminId,
        regionOfRegistration: kochiHQName,
        trackingStatus: "Document In Hand",
        bmStatus: "Received",
      },
    });

    const docMov = await prisma.documentMovement.create({
      data: {
        trackingNumber: tNum,
        registrationId: reg.id,
        fromOfficeId: officeLocationId,
        toOfficeId: officeLocationId,
        currentOfficeId: officeLocationId,
        fromModule: "HOME",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "IN_HAND",
        currentStatus: "Document In Hand",
      },
    });

    return { tNum, reg, docMov };
  }

  // =========================================================================
  // TEST 1: Authorized Process User
  // =========================================================================
  console.log("\n[TEST 1] Testing Authorized Process User...");
  try {
    const doc1 = await createAODocument("T1");
    const res1 = await transferBackToProcess({
      trackingNumbers: [doc1.tNum],
      officeId: aoAccount.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
      remarks: "Test 1 Authorized Process return",
    });

    const mov1 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: doc1.tNum },
    });
    const hist1 = await prisma.movementHistory.findFirst({
      where: { trackingNumber: doc1.tNum, action: "Back To Process" },
    });
    const audit1 = await prisma.auditTrail.findFirst({
      where: { registrationId: doc1.reg.id, action: "Transferred Back to Process" },
    });

    const isPass =
      res1.success &&
      mov1?.currentModule === "PROCESS_MODULE" &&
      mov1?.toModule === "PROCESS_MODULE" &&
      mov1?.fromModule === "ASSIGNED_OFFICE" &&
      mov1?.status === "INBOUND" &&
      mov1?.currentStatus === "Pending Receive" &&
      mov1?.movementType === "BACK_TO_PROCESS" &&
      hist1 !== null &&
      audit1 !== null &&
      (audit1?.description || "").includes(userAmal.name || "Amal");

    reports.push({
      testNumber: 1,
      testName: "Authorized Process recipient",
      result: isPass ? "PASS" : "FAIL",
      evidence: `Bundle: ${res1.bundleNumbers?.[0]}, toModule: ${mov1?.toModule}, currentModule: ${mov1?.currentModule}, status: ${mov1?.status}, currentStatus: ${mov1?.currentStatus}, recipient: ${res1.authorizedRecipients}`,
    });
    console.log(`[TEST 1] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 1] Error:", e);
    reports.push({
      testNumber: 1,
      testName: "Authorized Process recipient",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  // =========================================================================
  // TEST 2: Unauthorized Office Visibility
  // =========================================================================
  console.log("\n[TEST 2] Testing Unauthorized Office Visibility...");
  try {
    const recipients = await getAuthorizedProcessRecipientsForAssignedOffice({
      assignedOfficeLocIds: [aoLoc.id],
      ownerAdminId,
    });
    const bobIncluded = recipients.some((u) => u.id === userBob.id);
    const amalIncluded = recipients.some((u) => u.id === userAmal.id);

    const isPass = !bobIncluded && amalIncluded;
    reports.push({
      testNumber: 2,
      testName: "Unauthorized office visibility",
      result: isPass ? "PASS" : "FAIL",
      evidence: `Bob (no visibility) included: ${bobIncluded}, Amal (has visibility) included: ${amalIncluded}, Total resolved: ${recipients.length}`,
    });
    console.log(`[TEST 2] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 2] Error:", e);
    reports.push({
      testNumber: 2,
      testName: "Unauthorized office visibility",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  // =========================================================================
  // TEST 3: No Authorized Process User
  // =========================================================================
  console.log("\n[TEST 3] Testing No Authorized Process User...");
  try {
    const doc3 = await createAODocument("T3", isolatedLoc.id);
    let errorMsg = "";
    try {
      await transferBackToProcess({
        trackingNumbers: [doc3.tNum],
        officeId: isolatedAOAccount.id,
        userId: isolatedAOAccount.id,
        userName: isolatedAOAccount.username,
        ownerAdminId: `isolated-tenant-${runId}`,
      });
    } catch (err: any) {
      errorMsg = err.message;
    }

    const mov3 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: doc3.tNum },
    });

    const isPass =
      errorMsg.includes("No authorized Process user is configured for this Assigned Office.") &&
      mov3?.currentModule === "ASSIGNED_OFFICE" &&
      mov3?.status === "IN_HAND";

    reports.push({
      testNumber: 3,
      testName: "No authorized recipient",
      result: isPass ? "PASS" : "FAIL",
      evidence: `Rejection error: "${errorMsg}", Document retained in currentModule: ${mov3?.currentModule}, status: ${mov3?.status}`,
    });
    console.log(`[TEST 3] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 3] Error:", e);
    reports.push({
      testNumber: 3,
      testName: "No authorized recipient",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  // =========================================================================
  // TEST 4: Direct API Attack
  // =========================================================================
  console.log("\n[TEST 4] Testing Direct API Attack (Payload Injection)...");
  try {
    const doc4 = await createAODocument("T4");
    // Attacker passes an arbitrary/unauthorized userId (e.g. userBob who has no visibility) in the body
    const res4 = await transferBackToProcess({
      trackingNumbers: [doc4.tNum],
      officeId: aoAccount.id,
      userId: userBob.id, // Direct client injection attempt
      userName: userBob.name || "Attacker Bob",
      ownerAdminId,
      remarks: "Direct API injection test",
    });

    // Server-side RBAC must resolve only Amal (authorized), never Bob
    const recipients4 = res4.authorizedRecipients || "";
    const isPass =
      res4.success &&
      recipients4.includes(userAmal.name || "Amal") &&
      !recipients4.includes(userBob.name || "Bob");

    reports.push({
      testNumber: 4,
      testName: "Direct API attack",
      result: isPass ? "PASS" : "FAIL",
      evidence: `Client passed unauthorized userId: ${userBob.id}, Server resolved authorized recipient: ${recipients4}`,
    });
    console.log(`[TEST 4] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 4] Error:", e);
    reports.push({
      testNumber: 4,
      testName: "Direct API attack",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  // =========================================================================
  // TEST 5: Duplicate Request (Idempotency)
  // =========================================================================
  console.log("\n[TEST 5] Testing Duplicate Request (Idempotency)...");
  try {
    const doc5 = await createAODocument("T5");
    const res5First = await transferBackToProcess({
      trackingNumbers: [doc5.tNum],
      officeId: aoAccount.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
    });

    // Repeat identical request immediately (simulate double click / replay)
    const res5Second = await transferBackToProcess({
      trackingNumbers: [doc5.tNum],
      officeId: aoAccount.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
    });

    const movements5 = await prisma.documentMovement.findMany({
      where: { trackingNumber: doc5.tNum },
    });
    const history5 = await prisma.movementHistory.findMany({
      where: { trackingNumber: doc5.tNum, action: "Back To Process" },
    });

    const isPass =
      res5First.count === 1 &&
      res5Second.count === 0 &&
      movements5.length === 1 &&
      history5.length === 1;

    reports.push({
      testNumber: 5,
      testName: "Duplicate request",
      result: isPass ? "PASS" : "FAIL",
      evidence: `First call count: ${res5First.count}, Second call count: ${res5Second.count}, Total movement records: ${movements5.length}, Total history entries: ${history5.length}`,
    });
    console.log(`[TEST 5] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 5] Error:", e);
    reports.push({
      testNumber: 5,
      testName: "Duplicate request",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  // =========================================================================
  // TEST 6: Process Inbound -> Receive -> Document In Hand
  // =========================================================================
  console.log("\n[TEST 6] Testing Process Inbound -> Receive -> Document In Hand...");
  try {
    const doc6 = await createAODocument("T6");
    await transferBackToProcess({
      trackingNumbers: [doc6.tNum],
      officeId: aoAccount.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
    });

    // 1. Verify document is in Inbound list for Amal's visible office
    const inboundList = await listProcessAssignments(
      ownerAdminId,
      aoOfficeName,
      undefined,
      "inbound"
    );
    const inInbound = inboundList.some((item: any) =>
      item.items ? item.items.some((sub: any) => sub.trackingNumber === doc6.tNum) : item.trackingNumber === doc6.tNum
    );

    // 2. Perform Receive action in Process Module
    const receiveResult = await processBulkMove({
      trackingNumbers: [doc6.tNum],
      action: "RECEIVE",
      userId: userAmal.id,
      ownerAdminId,
      officeLocationName: aoOfficeName,
    });

    // 3. Verify document transitioned to Document In Hand
    const mov6 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: doc6.tNum },
    });
    const reg6 = await prisma.registration.findFirst({
      where: { trackingNumber: doc6.tNum },
    });

    const isPass =
      inInbound &&
      receiveResult.success &&
      mov6?.status === "IN_HAND" &&
      mov6?.currentStatus === "Document In Hand" &&
      mov6?.currentModule === "PROCESS_MODULE" &&
      reg6?.trackingStatus === "Document In Hand" &&
      reg6?.bmStatus === "Received";

    reports.push({
      testNumber: 6,
      testName: "Process Inbound -> Receive",
      result: isPass ? "PASS" : "FAIL",
      evidence: `Found in Inbound: ${inInbound}, Receive success: ${receiveResult.success}, New movement status: ${mov6?.status} (${mov6?.currentStatus}), Registration trackingStatus: ${reg6?.trackingStatus}`,
    });
    console.log(`[TEST 6] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 6] Error:", e);
    reports.push({
      testNumber: 6,
      testName: "Process Inbound -> Receive",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  // =========================================================================
  // TEST 7: Existing Home Workflow Regression
  // =========================================================================
  console.log("\n[TEST 7] Testing Existing Home Workflow Regression...");
  try {
    const tNumHome = `TEST-HOME-${runId}`;
    const regHome = await prisma.registration.create({
      data: {
        trackingNumber: tNumHome,
        customerName: "Home Flow Customer",
        documentType: "Personal Certificate",
        processType: "Attestation",
        ownerAdminId,
        regionOfRegistration: kochiHQName,
        trackingStatus: "Document In Hand",
        bmStatus: "Received",
        advancePaid: 100,
        advancePaymentStatus: "Approved",
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: tNumHome,
        registrationId: regHome.id,
        fromOfficeId: kochiLoc.id,
        toOfficeId: kochiLoc.id,
        currentOfficeId: kochiLoc.id,
        fromModule: "HOME",
        toModule: "HOME",
        currentModule: "HOME",
        status: "HOME",
        currentStatus: "Document In Hand",
      },
    });

    // Create Home Transfer Bundle (Kochi -> another office)
    const transferRes = await createTransferBundle({
      trackingNumbers: [tNumHome],
      fromOfficeId: kochiLoc.id,
      toOfficeId: aoLoc.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
      remarks: "Regression test Home transfer",
    });

    const movAfterTransfer = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNumHome },
    });

    const isPass =
      transferRes !== null &&
      movAfterTransfer?.status === "INBOUND_PENDING" &&
      movAfterTransfer?.currentStatus === "Pending Receive";

    reports.push({
      testNumber: 7,
      testName: "Home workflow regression",
      result: isPass ? "PASS" : "FAIL",
      evidence: `Bundle created: ${transferRes?.bundleNumber}, Status: ${movAfterTransfer?.status}, CurrentStatus: ${movAfterTransfer?.currentStatus}`,
    });
    console.log(`[TEST 7] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 7] Error:", e);
    reports.push({
      testNumber: 7,
      testName: "Home workflow regression",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  // =========================================================================
  // TEST 8: Existing Assigned Office Workflow Regression
  // =========================================================================
  console.log("\n[TEST 8] Testing Existing Assigned Office Workflow Regression...");
  try {
    const tNumAO = `TEST-AO-INBOUND-${runId}`;
    const regAO = await prisma.registration.create({
      data: {
        trackingNumber: tNumAO,
        customerName: "AO Inbound Customer",
        documentType: "Personal Certificate",
        processType: "Attestation",
        ownerAdminId,
        regionOfRegistration: kochiHQName,
        trackingStatus: "In Transfer",
        bmStatus: "Transferred",
      },
    });

    // Create Inbound Bundle for Assigned Office
    const aoBundle = await prisma.bundle.create({
      data: {
        bundleNumber: `BND-AO-${runId}`,
        fromOfficeId: kochiLoc.id,
        toOfficeId: aoLoc.id,
        status: "INBOUND_PENDING",
        ownerAdminId,
        items: {
          create: [{ trackingNumber: tNumAO, status: "INBOUND_PENDING" }],
        },
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: tNumAO,
        registrationId: regAO.id,
        fromOfficeId: kochiLoc.id,
        toOfficeId: aoLoc.id,
        currentOfficeId: kochiLoc.id,
        fromModule: "HOME",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "INBOUND_PENDING",
        currentStatus: "Pending Receive",
        bundleId: aoBundle.id,
      },
    });

    // 1. Receive bundle at Assigned Office
    const receiveAORes = await receiveBundleDocuments({
      bundleId: aoBundle.id,
      selectedTrackingNumbers: [tNumAO],
      officeId: aoAccount.id,
      userId: aoAccount.id,
      userName: aoAccount.username,
      ownerAdminId,
    });

    const movAfterReceive = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNumAO },
    });

    // 2. Transfer to SubPackage at Assigned Office
    // Ensure a subpackage exists for testing
    let subPkg = await (prisma as any).subPackage?.findFirst({
      where: { ownerAdminId },
    });
    if (!subPkg && (prisma as any).subPackage) {
      subPkg = await (prisma as any).subPackage.create({
        data: {
          name: `SubPkg ${runId}`,
          processType: "Attestation",
          ownerAdminId,
        },
      });
    }

    let subPkgTransferOk = true;
    if (subPkg) {
      const subTransferRes = await transferToSubPackage({
        items: [{ trackingNumber: tNumAO, subPackageId: subPkg.id }],
        officeId: aoAccount.id,
        userId: aoAccount.id,
        userName: aoAccount.username,
        ownerAdminId,
      });
      subPkgTransferOk = Boolean(subTransferRes);
    }

    const isPass =
      receiveAORes !== null &&
      (movAfterReceive?.status === "Received" || movAfterReceive?.status === "IN_HAND") &&
      movAfterReceive?.currentStatus === "Document In Hand" &&
      movAfterReceive?.currentModule === "ASSIGNED_OFFICE" &&
      subPkgTransferOk;

    reports.push({
      testNumber: 8,
      testName: "Assigned Office workflow regression",
      result: isPass ? "PASS" : "FAIL",
      evidence: `Receive success: status ${movAfterReceive?.status}, currentStatus: ${movAfterReceive?.currentStatus}, currentModule: ${movAfterReceive?.currentModule}, SubPackage transfer: ${subPkgTransferOk}`,
    });
    console.log(`[TEST 8] Finished -> ${isPass ? "PASS" : "FAIL"}`);
  } catch (e: any) {
    console.error("[TEST 8] Error:", e);
    reports.push({
      testNumber: 8,
      testName: "Assigned Office workflow regression",
      result: "FAIL",
      evidence: `Exception: ${e.message}`,
    });
  }

  console.log("\n===================================================================");
  console.log("FINAL RESULTS TABLE:");
  console.log("===================================================================");
  console.table(reports);

  const allPassed = reports.every((r) => r.result === "PASS");
  console.log(`\nOVERALL STATUS: ${allPassed ? "ALL 8 TESTS PASSED" : "SOME TESTS FAILED"}`);
}

runAll8Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test runner encountered critical error:", err);
    process.exit(1);
  });
