import { prisma } from "../src/lib/prisma";
import {
  transferBackToProcess,
  listWorkspaceDocuments,
  receiveBundleDocuments,
  getAuthorizedProcessRecipientsForAssignedOffice,
} from "../src/features/assigned-office/server/assigned-office.service";
import {
  processBulkMove,
  listProcessAssignments,
  transferProcessDocumentsToHome,
} from "../src/features/process/server/process.service";

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

async function runTestMatrix() {
  console.log("=================================================================");
  console.log("STARTING 11-TEST MATRIX FOR BACK TO PROCESS DESTINATION MAPPING");
  console.log("=================================================================\n");

  const results: Array<{ test: string; result: "PASS" | "FAIL"; evidence: string }> = [];

  // Setup unique test tenant and offices
  const OWNER_ID = uid("owner");
  const adminUser = await prisma.user.create({
    data: {
      id: OWNER_ID,
      email: `${uid("admin")}@test.com`,
      name: "Tenant Admin",
      role: {
        create: {
          name: "Tenant Admin",
          description: "Tenant Admin",
        },
      },
    },
  });

  // Create Process Office (Destination)
  const processOffice = await prisma.officeLocation.create({
    data: {
      officeName: uid("ProcOffice"),
      location: "Process Hub",
      timezone: "UTC",
      isProcessOffice: true,
      ownerAdminId: OWNER_ID,
    },
  });

  // Create Assigned Office (Source)
  const assignedOffice = await (prisma as any).assignedOffice.create({
    data: {
      username: uid("AssignedOffice"),
      email: `${uid("assigned")}@test.com`,
      passwordHash: "hash",
      status: true,
      ownerAdminId: OWNER_ID,
    },
  });

  const assignedOfficeLoc = await prisma.officeLocation.create({
    data: {
      id: assignedOffice.id,
      officeName: assignedOffice.username,
      location: "External Processing Office",
      timezone: "UTC",
      isProcessOffice: true,
      ownerAdminId: OWNER_ID,
    },
  });

  // Create Authorized Process User (Amal)
  // Process Module permission enabled + Process Module Office Visibility enabled for assignedOfficeLoc
  const amalUser = await prisma.user.create({
    data: {
      email: `${uid("amal")}@test.com`,
      name: "Amal",
      ownerAdminId: OWNER_ID,
      officeLocationId: processOffice.id,
      officeLocationName: processOffice.officeName,
      userPermissions: {
        create: [
          { permissionKey: "process.view" },
          { permissionKey: "process.inbound.view" },
          { permissionKey: "process.receive" },
        ],
      },
      officeVisibilities: {
        create: [
          { moduleKey: "process", officeLocationId: assignedOfficeLoc.id, createdBy: OWNER_ID },
          { moduleKey: "process", officeLocationId: processOffice.id, createdBy: OWNER_ID },
        ],
      },
    },
  });

  // Helper to create test document in Assigned Office Document In Hand
  async function createDocInAssignedOfficeInHand(trackingNumber: string) {
    const reg = await prisma.registration.create({
      data: {
        trackingNumber,
        customerName: `Customer ${trackingNumber}`,
        mobile: "+919999999999",
        regionOfRegistration: processOffice.officeName,
        trackingStatus: "In Transfer",
        bmStatus: "Received",
        ownerAdminId: OWNER_ID,
        createdBy: OWNER_ID,
      },
    });

    const bundle = await prisma.bundle.create({
      data: {
        bundleNumber: uid("BND-IN"),
        fromOfficeId: processOffice.id,
        toOfficeId: assignedOfficeLoc.id,
        status: "Received",
        ownerAdminId: OWNER_ID,
        items: {
          create: [{ trackingNumber, status: "Received" }],
        },
      },
    });

    const mov = await prisma.documentMovement.create({
      data: {
        trackingNumber,
        registrationId: reg.id,
        fromOfficeId: processOffice.id,
        toOfficeId: assignedOfficeLoc.id,
        currentOfficeId: assignedOfficeLoc.id,
        originalProcessOfficeId: processOffice.id,
        fromModule: "PROCESS_MODULE",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "IN_HAND",
        currentStatus: "Document In Hand",
        bundleId: bundle.id,
      },
    });

    return { reg, bundle, mov };
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Direct Assigned Office Login -> Back to Process -> Process Inbound
    // -------------------------------------------------------------------------
    console.log("Running Test 1...");
    const t1 = uid("DOC1");
    await createDocInAssignedOfficeInHand(t1);

    const res1 = await transferBackToProcess({
      trackingNumbers: [t1],
      officeId: assignedOffice.id,
      userId: assignedOffice.id, // Direct assigned office account login
      userName: assignedOffice.username,
      ownerAdminId: OWNER_ID,
    });

    const mov1 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: t1 },
      include: { bundle: true },
    });

    const assignedInbound1 = await listWorkspaceDocuments({
      officeId: assignedOffice.id,
      tab: "inbound",
      ownerAdminId: OWNER_ID,
    });
    const assignedHasDoc1 = (assignedInbound1 as any[]).some((b: any) =>
      b.items?.some((i: any) => i.trackingNumber === t1)
    );

    const procInbound1 = await listProcessAssignments(OWNER_ID, processOffice.officeName, undefined, "inbound");
    const procHasDoc1 = (procInbound1 as any[]).some((b: any) =>
      b.items?.some((i: any) => i.trackingNumber === t1) || b.trackingNumber === t1
    );

    if (
      res1.success &&
      mov1?.toOfficeId === processOffice.id &&
      mov1?.currentModule === "PROCESS_MODULE" &&
      mov1?.status === "INBOUND" &&
      mov1?.bundle?.toOfficeId === processOffice.id &&
      !assignedHasDoc1 &&
      procHasDoc1
    ) {
      results.push({
        test: "Test 1: Direct Assigned Office Login",
        result: "PASS",
        evidence: `Bundle toOfficeId=${mov1?.bundle?.toOfficeId} (Process Office), not Assigned Office. Found in Process Inbound: true, Assigned Inbound: false`,
      });
    } else {
      results.push({
        test: "Test 1: Direct Assigned Office Login",
        result: "FAIL",
        evidence: `mov.toOfficeId=${mov1?.toOfficeId}, assignedHasDoc1=${assignedHasDoc1}, procHasDoc1=${procHasDoc1}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Authorized User (Amal) opens workspace -> Back to Process -> Amal's Process Inbound
    // -------------------------------------------------------------------------
    console.log("Running Test 2...");
    const t2 = uid("DOC2");
    await createDocInAssignedOfficeInHand(t2);

    const res2 = await transferBackToProcess({
      trackingNumbers: [t2],
      officeId: assignedOffice.id,
      userId: amalUser.id,
      userName: amalUser.name || "Amal",
      ownerAdminId: OWNER_ID,
    });

    const mov2 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: t2 },
      include: { bundle: true },
    });

    if (
      res2.success &&
      mov2?.acceptedBy === amalUser.id &&
      mov2?.toOfficeId === processOffice.id &&
      mov2?.currentModule === "PROCESS_MODULE"
    ) {
      results.push({
        test: "Test 2: Authorized User Opens Workspace",
        result: "PASS",
        evidence: `Accepted by authorized user Amal (${amalUser.id}), routed to Process Office (${processOffice.officeName}).`,
      });
    } else {
      results.push({
        test: "Test 2: Authorized User Opens Workspace",
        result: "FAIL",
        evidence: `acceptedBy=${mov2?.acceptedBy}, expected=${amalUser.id}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: Process Permission Missing
    // -------------------------------------------------------------------------
    console.log("Running Test 3...");
    const noPermUser = await prisma.user.create({
      data: {
        email: `${uid("noperm")}@test.com`,
        name: "No Perm User",
        ownerAdminId: OWNER_ID,
        officeVisibilities: {
          create: [{ moduleKey: "process", officeLocationId: assignedOfficeLoc.id, createdBy: OWNER_ID }],
        },
      },
    });

    const authUsersNoPerm = await getAuthorizedProcessRecipientsForAssignedOffice({
      assignedOfficeLocIds: [assignedOfficeLoc.id],
      ownerAdminId: OWNER_ID,
    });
    const isNoPermIncluded = authUsersNoPerm.some((u) => u.id === noPermUser.id);

    if (!isNoPermIncluded) {
      results.push({
        test: "Test 3: Process Permission Missing",
        result: "PASS",
        evidence: `User without Process Module permissions is successfully excluded from authorized recipients.`,
      });
    } else {
      results.push({
        test: "Test 3: Process Permission Missing",
        result: "FAIL",
        evidence: `User without permissions was incorrectly included in authorized recipients.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Office Visibility Missing
    // -------------------------------------------------------------------------
    console.log("Running Test 4...");
    const noVisUser = await prisma.user.create({
      data: {
        email: `${uid("novis")}@test.com`,
        name: "No Vis User",
        ownerAdminId: OWNER_ID,
        userPermissions: {
          create: [{ permissionKey: "process.view" }],
        },
        officeVisibilities: {
          create: [{ moduleKey: "process", officeLocationId: processOffice.id, createdBy: OWNER_ID }],
        },
      },
    });

    const authUsersNoVis = await getAuthorizedProcessRecipientsForAssignedOffice({
      assignedOfficeLocIds: [assignedOfficeLoc.id],
      ownerAdminId: OWNER_ID,
    });
    const isNoVisIncluded = authUsersNoVis.some((u) => u.id === noVisUser.id);

    if (!isNoVisIncluded) {
      results.push({
        test: "Test 4: Office Visibility Missing",
        result: "PASS",
        evidence: `User without Assigned Office visibility in Process Module is successfully excluded.`,
      });
    } else {
      results.push({
        test: "Test 4: Office Visibility Missing",
        result: "FAIL",
        evidence: `User without office visibility was incorrectly included.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: No Authorized User -> Safe Failure
    // -------------------------------------------------------------------------
    console.log("Running Test 5...");
    const isolatedAssignedOffice = await (prisma as any).assignedOffice.create({
      data: {
        username: uid("IsolatedOffice"),
        email: `${uid("isolated")}@test.com`,
        passwordHash: "hash",
        status: true,
        ownerAdminId: OWNER_ID,
      },
    });
    const isolatedAssignedLoc = await prisma.officeLocation.create({
      data: {
        id: isolatedAssignedOffice.id,
        officeName: isolatedAssignedOffice.username,
        location: "External Processing Office",
        timezone: "UTC",
        isProcessOffice: true,
        ownerAdminId: OWNER_ID,
      },
    });

    const t5 = uid("DOC5");
    const reg5 = await prisma.registration.create({
      data: {
        trackingNumber: t5,
        customerName: "Doc 5",
        mobile: "+919999999999",
        regionOfRegistration: processOffice.officeName,
        trackingStatus: "In Transfer",
        bmStatus: "Received",
        ownerAdminId: OWNER_ID,
        createdBy: OWNER_ID,
      },
    });
    await prisma.documentMovement.create({
      data: {
        trackingNumber: t5,
        registrationId: reg5.id,
        fromOfficeId: processOffice.id,
        toOfficeId: isolatedAssignedLoc.id,
        currentOfficeId: isolatedAssignedLoc.id,
        fromModule: "PROCESS_MODULE",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "IN_HAND",
        currentStatus: "Document In Hand",
      },
    });

    let test5Error: string | null = null;
    try {
      await transferBackToProcess({
        trackingNumbers: [t5],
        officeId: isolatedAssignedOffice.id,
        userId: isolatedAssignedOffice.id,
        ownerAdminId: OWNER_ID,
      });
    } catch (err: any) {
      test5Error = err.message;
    }

    const mov5After = await prisma.documentMovement.findFirst({ where: { trackingNumber: t5 } });

    if (
      test5Error === "No authorized Process user is configured for this Assigned Office." &&
      mov5After?.status === "IN_HAND" &&
      mov5After?.currentModule === "ASSIGNED_OFFICE"
    ) {
      results.push({
        test: "Test 5: No Authorized User",
        result: "PASS",
        evidence: `Safely threw '${test5Error}' and document remained untouched in Assigned Office Document In Hand.`,
      });
    } else {
      results.push({
        test: "Test 5: No Authorized User",
        result: "FAIL",
        evidence: `Error=${test5Error}, mov.status=${mov5After?.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 6: Process Receive -> Document In Hand
    // -------------------------------------------------------------------------
    console.log("Running Test 6...");
    const res6 = await processBulkMove({
      trackingNumbers: [t1],
      action: "RECEIVE",
      userId: amalUser.id,
      ownerAdminId: OWNER_ID,
      officeLocationName: processOffice.officeName,
    });

    const mov1Received = await prisma.documentMovement.findFirst({
      where: { trackingNumber: t1 },
    });
    const reg1Received = await prisma.registration.findUnique({
      where: { trackingNumber: t1 },
    });

    if (
      res6.success &&
      mov1Received?.status === "IN_HAND" &&
      mov1Received?.currentStatus === "Document In Hand" &&
      mov1Received?.currentOfficeId === processOffice.id &&
      reg1Received?.trackingStatus === "Document In Hand"
    ) {
      results.push({
        test: "Test 6: Process Receive",
        result: "PASS",
        evidence: `Document successfully transitioned from Process Inbound to Process Document In Hand at ${processOffice.officeName}.`,
      });
    } else {
      results.push({
        test: "Test 6: Process Receive",
        result: "FAIL",
        evidence: `status=${mov1Received?.status}, currentOfficeId=${mov1Received?.currentOfficeId}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 7: Verify Assigned Office Inbound does NOT contain returned document
    // -------------------------------------------------------------------------
    console.log("Running Test 7...");
    const assignedInboundCheck = await listWorkspaceDocuments({
      officeId: assignedOffice.id,
      tab: "inbound",
      ownerAdminId: OWNER_ID,
    });
    const hasDoc1OrDoc2 = (assignedInboundCheck as any[]).some((b: any) =>
      b.items?.some((i: any) => i.trackingNumber === t1 || i.trackingNumber === t2)
    );

    if (!hasDoc1OrDoc2) {
      results.push({
        test: "Test 7: Verify Assigned Office Inbound",
        result: "PASS",
        evidence: `Assigned Office Inbound strictly does not show returned documents.`,
      });
    } else {
      results.push({
        test: "Test 7: Verify Assigned Office Inbound",
        result: "FAIL",
        evidence: `Returned documents appeared in Assigned Office Inbound!`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 8: Multiple Documents Selection (e.g. 6565 and 444)
    // -------------------------------------------------------------------------
    console.log("Running Test 8...");
    const t8A = uid("6565");
    const t8B = uid("444");
    await createDocInAssignedOfficeInHand(t8A);
    await createDocInAssignedOfficeInHand(t8B);

    const res8 = await transferBackToProcess({
      trackingNumbers: [t8A, t8B],
      officeId: assignedOffice.id,
      userId: assignedOffice.id,
      ownerAdminId: OWNER_ID,
    });

    const mov8A = await prisma.documentMovement.findFirst({ where: { trackingNumber: t8A } });
    const mov8B = await prisma.documentMovement.findFirst({ where: { trackingNumber: t8B } });

    if (
      res8.success &&
      res8.count === 2 &&
      mov8A?.bundleId === mov8B?.bundleId &&
      mov8A?.toOfficeId === processOffice.id &&
      mov8B?.toOfficeId === processOffice.id
    ) {
      results.push({
        test: "Test 8: Multiple Documents",
        result: "PASS",
        evidence: `Both documents bundled together (${res8.bundleNumbers?.[0]}) and mapped to Process Office (${processOffice.officeName}).`,
      });
    } else {
      results.push({
        test: "Test 8: Multiple Documents",
        result: "FAIL",
        evidence: `count=${res8.count}, bundleA=${mov8A?.bundleId}, bundleB=${mov8B?.bundleId}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 9: Duplicate Click / Idempotency Protection
    // -------------------------------------------------------------------------
    console.log("Running Test 9...");
    const res9 = await transferBackToProcess({
      trackingNumbers: [t8A, t8B],
      officeId: assignedOffice.id,
      userId: assignedOffice.id,
      ownerAdminId: OWNER_ID,
    });

    const activeMovementsFor8A = await prisma.documentMovement.count({
      where: { trackingNumber: t8A, status: "INBOUND" },
    });

    if (res9.count === 0 && activeMovementsFor8A === 1) {
      results.push({
        test: "Test 9: Duplicate Click Protection",
        result: "PASS",
        evidence: `Idempotency verified: re-submitting returned count=0 and active inbound records remained exactly 1.`,
      });
    } else {
      results.push({
        test: "Test 9: Duplicate Click Protection",
        result: "FAIL",
        evidence: `res9.count=${res9.count}, activeMovements=${activeMovementsFor8A}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 10: Home Workflow Regression Check
    // -------------------------------------------------------------------------
    console.log("Running Test 10...");
    const t10 = uid("HOME_DOC");
    const reg10 = await prisma.registration.create({
      data: {
        trackingNumber: t10,
        customerName: "Home Reg Customer",
        mobile: "+918888888888",
        regionOfRegistration: processOffice.officeName,
        trackingStatus: "Document In Hand",
        bmStatus: "Received",
        ownerAdminId: OWNER_ID,
        createdBy: OWNER_ID,
      },
    });
    await prisma.documentMovement.create({
      data: {
        trackingNumber: t10,
        registrationId: reg10.id,
        fromOfficeId: processOffice.id,
        toOfficeId: processOffice.id,
        currentOfficeId: processOffice.id,
        fromModule: "PROCESS_MODULE",
        toModule: "PROCESS_MODULE",
        currentModule: "PROCESS_MODULE",
        status: "IN_HAND",
        currentStatus: "Document In Hand",
      },
    });

    const homeTransfer = await transferProcessDocumentsToHome({
      trackingNumbers: [t10],
      toOfficeId: processOffice.id,
      userId: OWNER_ID,
      ownerAdminId: OWNER_ID,
    });

    const mov10After = await prisma.documentMovement.findFirst({ where: { trackingNumber: t10 } });

    if (homeTransfer.success && mov10After?.toModule === "HOME" && mov10After?.currentModule === "HOME") {
      results.push({
        test: "Test 10: Home Regression Check",
        result: "PASS",
        evidence: `Home transfer completed successfully without interference.`,
      });
    } else {
      results.push({
        test: "Test 10: Home Regression Check",
        result: "FAIL",
        evidence: `toModule=${mov10After?.toModule}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 11: Assigned Office Regression Check (Inbound -> Receive -> In Hand)
    // -------------------------------------------------------------------------
    console.log("Running Test 11...");
    const t11 = uid("AO_DOC");
    const reg11 = await prisma.registration.create({
      data: {
        trackingNumber: t11,
        customerName: "AO Normal Customer",
        mobile: "+917777777777",
        regionOfRegistration: processOffice.officeName,
        trackingStatus: "In Transfer",
        bmStatus: "Pending",
        ownerAdminId: OWNER_ID,
        createdBy: OWNER_ID,
      },
    });

    const bundle11 = await prisma.bundle.create({
      data: {
        bundleNumber: uid("BND-NORMAL-AO"),
        fromOfficeId: processOffice.id,
        toOfficeId: assignedOfficeLoc.id,
        status: "Pending Receive",
        ownerAdminId: OWNER_ID,
        items: {
          create: [{ trackingNumber: t11, status: "Pending Receive" }],
        },
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: t11,
        registrationId: reg11.id,
        fromOfficeId: processOffice.id,
        toOfficeId: assignedOfficeLoc.id,
        currentOfficeId: processOffice.id,
        fromModule: "PROCESS_MODULE",
        toModule: "ASSIGNED_OFFICE",
        currentModule: "ASSIGNED_OFFICE",
        status: "INBOUND",
        currentStatus: "Pending Receive",
        bundleId: bundle11.id,
      },
    });

    const aoInboundList = await listWorkspaceDocuments({
      officeId: assignedOffice.id,
      tab: "inbound",
      ownerAdminId: OWNER_ID,
    });
    const hasAoInbound = (aoInboundList as any[]).some((b: any) =>
      b.items?.some((i: any) => i.trackingNumber === t11)
    );

    const receiveAo = await receiveBundleDocuments({
      bundleId: bundle11.id,
      selectedTrackingNumbers: [t11],
      officeId: assignedOffice.id,
      userId: assignedOffice.id,
      ownerAdminId: OWNER_ID,
    });

    const mov11After = await prisma.documentMovement.findFirst({ where: { trackingNumber: t11 } });
    const aoInHandList = await listWorkspaceDocuments({
      officeId: assignedOffice.id,
      tab: "in_hand",
      ownerAdminId: OWNER_ID,
    });
    const hasAoInHand = (aoInHandList as any[]).some((d: any) => d.trackingNumber === t11);

    if (hasAoInbound && receiveAo.success && mov11After?.status === "Received" && hasAoInHand) {
      results.push({
        test: "Test 11: Assigned Office Regression Check",
        result: "PASS",
        evidence: `Assigned Office Inbound -> Receive -> Document In Hand works cleanly.`,
      });
    } else {
      results.push({
        test: "Test 11: Assigned Office Regression Check",
        result: "FAIL",
        evidence: `hasInbound=${hasAoInbound}, status=${mov11After?.status}, hasInHand=${hasAoInHand}`,
      });
    }

  } finally {
    // Cleanup created tenant test data
    console.log("\nCleaning up test matrix tenant data...");
    await prisma.movementHistory.deleteMany({ where: { trackingNumber: { startsWith: "DOC" } } }).catch(() => {});
    await prisma.documentWorkflowHistory.deleteMany({ where: { ownerAdminId: OWNER_ID } }).catch(() => {});
    await prisma.auditTrail.deleteMany({ where: { registration: { ownerAdminId: OWNER_ID } } }).catch(() => {});
    await prisma.bundleItem.deleteMany({ where: { bundle: { ownerAdminId: OWNER_ID } } }).catch(() => {});
    await prisma.bundle.deleteMany({ where: { ownerAdminId: OWNER_ID } }).catch(() => {});
    await prisma.documentMovement.deleteMany({ where: { registration: { ownerAdminId: OWNER_ID } } }).catch(() => {});
    await prisma.registration.deleteMany({ where: { ownerAdminId: OWNER_ID } }).catch(() => {});
    await prisma.userOfficeVisibility.deleteMany({ where: { createdBy: OWNER_ID } }).catch(() => {});
    await prisma.userPermission.deleteMany({ where: { user: { ownerAdminId: OWNER_ID } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { ownerAdminId: OWNER_ID } }).catch(() => {});
    await (prisma as any).assignedOffice.deleteMany({ where: { ownerAdminId: OWNER_ID } }).catch(() => {});
    await prisma.officeLocation.deleteMany({ where: { ownerAdminId: OWNER_ID } }).catch(() => {});
    await prisma.user.delete({ where: { id: OWNER_ID } }).catch(() => {});
  }

  console.log("\n=================================================================");
  console.log("FINAL TEST MATRIX RESULTS");
  console.log("=================================================================\n");
  console.table(results);

  const allPassed = results.every((r) => r.result === "PASS");
  if (!allPassed) {
    console.error("Some tests failed!");
    process.exit(1);
  } else {
    console.log("ALL 11 TESTS PASSED SUCCESSFULLY!");
  }
}

runTestMatrix()
  .catch((err) => {
    console.error("Test Suite Fatal Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

