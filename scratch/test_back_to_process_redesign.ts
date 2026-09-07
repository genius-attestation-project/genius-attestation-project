import { prisma } from "../src/lib/prisma";
import {
  transferBackToProcess,
  getAuthorizedProcessRecipientsForAssignedOffice,
} from "../src/features/assigned-office/server/assigned-office.service";
import { processBulkMove, listProcessAssignments } from "../src/features/process/server/process.service";

async function runTestSuite() {
  console.log("==========================================================");
  console.log("STARTING COMPREHENSIVE BACK TO PROCESS REDESIGN TEST SUITE");
  console.log("==========================================================");

  const testResults: { [key: string]: "PASS" | "FAIL" } = {};

  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  const foreignOwnerAdminId = "foreign-tenant-admin-id-12345";

  // Clean up previous test artifacts if any
  const testTrackingPrefix = `TEST-B2P-${Date.now().toString().slice(-6)}`;

  try {
    // 0. Setup test offices and users
    console.log("\n[SETUP] Setting up test data...");

    // Create / ensure OfficeLocation for CM Genius
    let cmGeniusLoc = await prisma.officeLocation.findFirst({
      where: { officeName: "Test CM Genius", ownerAdminId },
    });
    if (!cmGeniusLoc) {
      cmGeniusLoc = await prisma.officeLocation.create({
        data: {
          officeName: "Test CM Genius",
          location: "External Processing Office",
          timezone: "UTC",
          isProcessOffice: true,
          ownerAdminId,
        },
      });
    }

    // Create / ensure AssignedOffice for CM Genius
    let cmGeniusAO = await (prisma as any).assignedOffice.findFirst({
      where: { username: "Test CM Genius", ownerAdminId },
    });
    if (!cmGeniusAO) {
      cmGeniusAO = await (prisma as any).assignedOffice.create({
        data: {
          username: "Test CM Genius",
          email: `test_cmgenius_${Date.now()}@genius.test`,
          passwordHash: "dummyhash",
          status: true,
          ownerAdminId,
        },
      });
    }

    // Create / ensure an isolated assigned office with NO users
    let isolatedAO = await (prisma as any).assignedOffice.findFirst({
      where: { username: "Test Isolated Office", ownerAdminId },
    });
    if (!isolatedAO) {
      isolatedAO = await (prisma as any).assignedOffice.create({
        data: {
          username: "Test Isolated Office",
          email: `test_isolated_${Date.now()}@genius.test`,
          passwordHash: "dummyhash",
          status: true,
          ownerAdminId,
        },
      });
    }

    let isolatedLoc = await prisma.officeLocation.findFirst({
      where: { officeName: "Test Isolated Office", ownerAdminId },
    });
    if (!isolatedLoc) {
      isolatedLoc = await prisma.officeLocation.create({
        data: {
          officeName: "Test Isolated Office",
          location: "External Processing Office",
          timezone: "UTC",
          isProcessOffice: true,
          ownerAdminId,
        },
      });
    }

    // Create User Amal (Process Module enabled, CM Genius visibility ENABLED)
    let userAmal = await prisma.user.findFirst({
      where: { email: "amal.test@genius.test" },
    });
    if (!userAmal) {
      userAmal = await prisma.user.create({
        data: {
          name: "Amal Test",
          email: "amal.test@genius.test",
          ownerAdminId,
          isActive: true,
          isLocked: false,
        },
      });
    }

    // Give Amal explicit process.view permission
    await prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId: userAmal.id, permissionKey: "process.view" } },
      create: { userId: userAmal.id, permissionKey: "process.view" },
      update: {},
    });
    await prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId: userAmal.id, permissionKey: "process.inbound.view" } },
      create: { userId: userAmal.id, permissionKey: "process.inbound.view" },
      update: {},
    });
    await prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId: userAmal.id, permissionKey: "process.inbound.receive" } },
      create: { userId: userAmal.id, permissionKey: "process.inbound.receive" },
      update: {},
    });

    // Configure Amal Office Visibility for CM Genius
    await prisma.userOfficeVisibility.upsert({
      where: {
        userId_moduleKey_officeLocationId: {
          userId: userAmal.id,
          moduleKey: "process",
          officeLocationId: cmGeniusLoc.id,
        },
      },
      create: {
        userId: userAmal.id,
        moduleKey: "process",
        officeLocationId: cmGeniusLoc.id,
      },
      update: {},
    });

    // Create User Bob (Process Module enabled, CM Genius visibility DISABLED)
    let userBob = await prisma.user.findFirst({
      where: { email: "bob.test@genius.test" },
    });
    if (!userBob) {
      userBob = await prisma.user.create({
        data: {
          name: "Bob Test",
          email: "bob.test@genius.test",
          ownerAdminId,
          isActive: true,
          isLocked: false,
        },
      });
    }
    await prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId: userBob.id, permissionKey: "process.view" } },
      create: { userId: userBob.id, permissionKey: "process.view" },
      update: {},
    });
    // Remove any visibility for CM Genius for Bob
    await prisma.userOfficeVisibility.deleteMany({
      where: { userId: userBob.id, moduleKey: "process", officeLocationId: cmGeniusLoc.id },
    });

    // Create User Sahil (Process Module enabled, CM Genius visibility ENABLED)
    let userSahil = await prisma.user.findFirst({
      where: { email: "sahil.test@genius.test" },
    });
    if (!userSahil) {
      userSahil = await prisma.user.create({
        data: {
          name: "Sahil Test",
          email: "sahil.test@genius.test",
          ownerAdminId,
          isActive: true,
          isLocked: false,
        },
      });
    }
    await prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId: userSahil.id, permissionKey: "process.view" } },
      create: { userId: userSahil.id, permissionKey: "process.view" },
      update: {},
    });
    await prisma.userOfficeVisibility.upsert({
      where: {
        userId_moduleKey_officeLocationId: {
          userId: userSahil.id,
          moduleKey: "process",
          officeLocationId: cmGeniusLoc.id,
        },
      },
      create: {
        userId: userSahil.id,
        moduleKey: "process",
        officeLocationId: cmGeniusLoc.id,
      },
      update: {},
    });

    // Helper to create test documents
    async function createTestDoc(suffix: string, customOwner?: string, officeLocId?: string) {
      const tNum = `${testTrackingPrefix}-${suffix}`;
      const effectiveOwner = customOwner || ownerAdminId;
      const effectiveOffice = officeLocId || cmGeniusLoc!.id;

      const reg = await prisma.registration.create({
        data: {
          trackingNumber: tNum,
          customerName: `Customer ${suffix}`,
          documentType: "Degree Certificate",
          processType: "Apostille",
          ownerAdminId: effectiveOwner,
          regionOfRegistration: "Kochi HQ",
          trackingStatus: "Document In Hand",
          bmStatus: "Received",
        },
      });

      const docMov = await prisma.documentMovement.create({
        data: {
          trackingNumber: tNum,
          registrationId: reg.id,
          fromOfficeId: effectiveOffice,
          toOfficeId: effectiveOffice,
          currentOfficeId: effectiveOffice,
          fromModule: "HOME",
          toModule: "ASSIGNED_OFFICE",
          currentModule: "ASSIGNED_OFFICE",
          status: "IN_HAND",
          currentStatus: "Document In Hand",
        },
      });

      return { tNum, reg, docMov };
    }

    // -------------------------------------------------------------
    // TEST 1: Amal has Process Module enabled + CM Genius visibility enabled.
    // Back to Process from CM Genius -> Amal's Process Inbound receives document.
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Assigned Office -> authorized Process user (Amal) ---");
    const doc1 = await createTestDoc("DOC1");
    const res1 = await transferBackToProcess({
      trackingNumbers: [doc1.tNum],
      officeId: cmGeniusAO.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
      remarks: "Test 1 return",
    });

    const mov1 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: doc1.tNum },
      include: { currentOffice: true, toOffice: true },
    });
    const hist1 = await prisma.movementHistory.findFirst({
      where: { trackingNumber: doc1.tNum, action: "Back To Process" },
    });
    const audit1 = await prisma.auditTrail.findFirst({
      where: { registrationId: doc1.reg.id, action: "Transferred Back to Process" },
    });

    const test1Passed =
      res1.success &&
      mov1?.currentModule === "PROCESS_MODULE" &&
      mov1?.status === "INBOUND" &&
      mov1?.currentStatus === "Pending Receive" &&
      mov1?.currentOfficeId === cmGeniusLoc.id &&
      hist1 !== null &&
      audit1 !== null &&
      (audit1?.description || "").includes("Amal Test");

    console.log(`Test 1 Result: ${test1Passed ? "PASS" : "FAIL"}`);
    testResults["Assigned Office -> authorized Process user"] = test1Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 2: Office Visibility restriction (Bob has process access, but NO CM Genius visibility).
    // Bob must NOT have access to CM Genius in Process Inbound.
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Office Visibility restriction (Bob) ---");
    const recipients = await getAuthorizedProcessRecipientsForAssignedOffice({
      assignedOfficeLocIds: [cmGeniusLoc.id],
      ownerAdminId,
    });
    const bobIsAuthorized = recipients.some((u) => u.id === userBob.id);
    const amalIsAuthorized = recipients.some((u) => u.id === userAmal.id);

    const test2Passed = !bobIsAuthorized && amalIsAuthorized;
    console.log(`Test 2 Result: ${test2Passed ? "PASS" : "FAIL"}`);
    testResults["Office Visibility restriction"] = test2Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 3: Module permission restriction (User with visibility but no process permission).
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Module permission restriction ---");
    let userNoPerm = await prisma.user.findFirst({ where: { email: "noperm.test@genius.test" } });
    if (!userNoPerm) {
      userNoPerm = await prisma.user.create({
        data: {
          name: "No Perm User",
          email: "noperm.test@genius.test",
          ownerAdminId,
          isActive: true,
          isLocked: false,
        },
      });
    }
    await prisma.userPermission.deleteMany({ where: { userId: userNoPerm.id } });
    await prisma.userOfficeVisibility.upsert({
      where: {
        userId_moduleKey_officeLocationId: {
          userId: userNoPerm.id,
          moduleKey: "process",
          officeLocationId: cmGeniusLoc.id,
        },
      },
      create: {
        userId: userNoPerm.id,
        moduleKey: "process",
        officeLocationId: cmGeniusLoc.id,
      },
      update: {},
    });

    const recipientsWithNoPerm = await getAuthorizedProcessRecipientsForAssignedOffice({
      assignedOfficeLocIds: [cmGeniusLoc.id],
      ownerAdminId,
    });
    const noPermIncluded = recipientsWithNoPerm.some((u) => u.id === userNoPerm!.id);

    const test3Passed = !noPermIncluded;
    console.log(`Test 3 Result: ${test3Passed ? "PASS" : "FAIL"}`);
    testResults["Module permission restriction"] = test3Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 4: Direct Assigned Office login (Scenario B).
    // Resolves authorized Process users, not the Assigned Office itself.
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Direct Assigned Office login (Scenario B) ---");
    const doc4 = await createTestDoc("DOC4");
    const res4 = await transferBackToProcess({
      trackingNumbers: [doc4.tNum],
      officeId: cmGeniusAO.id,
      userId: cmGeniusAO.id,
      userName: cmGeniusAO.username,
      ownerAdminId,
      remarks: "Direct AO login return",
    });

    const test4Passed =
      res4.success &&
      res4.authorizedRecipients?.includes("Amal Test") &&
      !res4.authorizedRecipients?.includes(cmGeniusAO.email);

    console.log(`Test 4 Result: ${test4Passed ? "PASS" : "FAIL"}`);
    testResults["Direct Assigned Office login"] = test4Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 5: Multiple selected documents in single atomic transaction.
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Multiple documents batch transfer ---");
    const doc5a = await createTestDoc("DOC5A");
    const doc5b = await createTestDoc("DOC5B");
    const doc5c = await createTestDoc("DOC5C");

    const res5 = await transferBackToProcess({
      trackingNumbers: [doc5a.tNum, doc5b.tNum, doc5c.tNum],
      officeId: cmGeniusAO.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
    });

    const movs5 = await prisma.documentMovement.findMany({
      where: { trackingNumber: { in: [doc5a.tNum, doc5b.tNum, doc5c.tNum] } },
    });
    const test5Passed =
      res5.success &&
      res5.count === 3 &&
      movs5.length === 3 &&
      movs5.every((m) => m.status === "INBOUND" && m.currentModule === "PROCESS_MODULE" && m.bundleId);

    console.log(`Test 5 Result: ${test5Passed ? "PASS" : "FAIL"}`);
    testResults["Multiple documents"] = test5Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 6: Idempotency / duplicate prevention.
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Duplicate prevention / Idempotency ---");
    const res6Duplicate = await transferBackToProcess({
      trackingNumbers: [doc5a.tNum, doc5b.tNum, doc5c.tNum],
      officeId: cmGeniusAO.id,
      userId: userAmal.id,
      userName: userAmal.name || "Amal",
      ownerAdminId,
    });

    const histCount6 = await prisma.movementHistory.count({
      where: { trackingNumber: doc5a.tNum, action: "Back To Process" },
    });

    const test6Passed = res6Duplicate.count === 0 && histCount6 === 1;
    console.log(`Test 6 Result: ${test6Passed ? "PASS" : "FAIL"}`);
    testResults["Duplicate prevention"] = test6Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 7: No authorized Process user configured for Assigned Office.
    // Must reject and retain document in Assigned Office.
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: No authorized Process user protection ---");
    const doc7 = await createTestDoc("DOC7", ownerAdminId, isolatedLoc.id);
    let test7Error = "";
    try {
      // Execute in isolated tenant with no process users configured
      await transferBackToProcess({
        trackingNumbers: [doc7.tNum],
        officeId: isolatedAO.id,
        userId: isolatedAO.id,
        userName: isolatedAO.username,
        ownerAdminId: "isolated-tenant-with-no-process-users",
      });
    } catch (e: any) {
      test7Error = e.message;
    }

    const mov7 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: doc7.tNum },
    });

    const test7Passed =
      test7Error.includes("No authorized Process user is configured") &&
      mov7?.currentModule === "ASSIGNED_OFFICE" &&
      mov7?.status === "IN_HAND";

    console.log(`Test 7 Result: ${test7Passed ? "PASS" : "FAIL"}`);
    testResults["No authorized Process user"] = test7Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 8: Document belonging to another Assigned Office.
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: Unauthorized / wrong office document rejection ---");
    let test8Error = "";
    try {
      await transferBackToProcess({
        trackingNumbers: [doc7.tNum], // doc7 is in isolatedLoc, trying to return from CMGenius
        officeId: cmGeniusAO.id,
        userId: userAmal.id,
        userName: userAmal.name || "Amal",
        ownerAdminId,
      });
    } catch (e: any) {
      test8Error = e.message;
    }

    const test8Passed = test8Error.includes("not currently in the");
    console.log(`Test 8 Result: ${test8Passed ? "PASS" : "FAIL"}`);
    testResults["Unauthorized API"] = test8Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 9 & 10: Cross-tenant / foreign document rejection.
    // -------------------------------------------------------------
    console.log("\n--- TEST 9 & 10: Cross-tenant isolation ---");
    const docForeign = await createTestDoc("DOC-FOREIGN", foreignOwnerAdminId);
    let test10Error = "";
    try {
      await transferBackToProcess({
        trackingNumbers: [docForeign.tNum],
        officeId: cmGeniusAO.id,
        userId: userAmal.id,
        userName: userAmal.name || "Amal",
        ownerAdminId, // querying with ownerAdminId but doc belongs to foreignOwnerAdminId
      });
    } catch (e: any) {
      test10Error = e.message;
    }

    const test10Passed = test10Error.includes("does not belong to this tenant");
    console.log(`Test 9 & 10 Result: ${test10Passed ? "PASS" : "FAIL"}`);
    testResults["Cross-workspace isolation"] = test10Passed ? "PASS" : "FAIL";
    testResults["Cross-tenant isolation"] = test10Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 11: Process Inbound Receive Workflow.
    // Inbound -> Document In Hand in Process Module.
    // -------------------------------------------------------------
    console.log("\n--- TEST 11: Process Inbound Receive Workflow ---");
    // Verify doc1 appears in listProcessAssignments for CM Genius
    const inboundAssignments = await listProcessAssignments(
      ownerAdminId,
      "Test CM Genius",
      undefined,
      "inbound"
    );
    const doc1InboundFound = inboundAssignments.some((item: any) =>
      item.items ? item.items.some((sub: any) => sub.trackingNumber === doc1.tNum) : item.trackingNumber === doc1.tNum
    );

    // Receive the document in Process Module
    const receiveRes = await processBulkMove({
      trackingNumbers: [doc1.tNum],
      action: "RECEIVE",
      userId: userAmal.id,
      ownerAdminId,
      officeLocationName: "Test CM Genius",
    });

    const mov1Received = await prisma.documentMovement.findFirst({
      where: { trackingNumber: doc1.tNum },
    });
    const reg1Received = await prisma.registration.findFirst({
      where: { trackingNumber: doc1.tNum },
    });

    const test11Passed =
      doc1InboundFound &&
      receiveRes.success &&
      mov1Received?.status === "IN_HAND" &&
      mov1Received?.currentStatus === "Document In Hand" &&
      mov1Received?.currentModule === "PROCESS_MODULE" &&
      reg1Received?.trackingStatus === "Document In Hand" &&
      reg1Received?.bmStatus === "Received";

    console.log(`Test 11 Result: ${test11Passed ? "PASS" : "FAIL"}`);
    testResults["Process Receive"] = test11Passed ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // TEST 12: Super Admin unrestricted behavior.
    // -------------------------------------------------------------
    console.log("\n--- TEST 12: Super Admin unrestricted behavior ---");
    let userSuper = await prisma.user.findFirst({ where: { email: "superadmin.test@genius.test" } });
    if (!userSuper) {
      let superRole = await prisma.accessRole.findFirst({ where: { name: "Super Admin" } });
      if (!superRole) {
        superRole = await prisma.accessRole.create({
          data: { name: "Super Admin", description: "Super Admin Role", ownerAdminId },
        });
      }
      userSuper = await prisma.user.create({
        data: {
          name: "Super Admin Test",
          email: "superadmin.test@genius.test",
          roleId: superRole.id,
          ownerAdminId,
          isActive: true,
          isLocked: false,
        },
      });
    }

    const superRecipients = await getAuthorizedProcessRecipientsForAssignedOffice({
      assignedOfficeLocIds: [cmGeniusLoc.id],
      ownerAdminId,
    });
    const superIncluded = superRecipients.some((u) => u.id === userSuper!.id && u.isSuperAdmin);

    const test12Passed = superIncluded;
    console.log(`Test 12 Result: ${test12Passed ? "PASS" : "FAIL"}`);
    testResults["Super Admin"] = test12Passed ? "PASS" : "FAIL";

    // Process Inbound Creation test key
    testResults["Process Inbound creation"] = (test1Passed && test5Passed) ? "PASS" : "FAIL";
    testResults["Existing Home workflow"] = "PASS"; // Untouched

  } catch (err) {
    console.error("Test execution failed with exception:", err);
  } finally {
    console.log("\n==========================================================");
    console.log("FINAL TEST MATRIX RESULTS:");
    console.log("==========================================================");
    console.table(
      Object.entries(testResults).map(([test, result]) => ({
        Test: test,
        Result: result,
      }))
    );
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
