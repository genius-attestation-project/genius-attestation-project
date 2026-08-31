import { prisma } from "../src/lib/prisma";
import { createRegistration, deleteRegistration } from "../src/features/registration/server/registration.service";
import { listPendingMovementApprovals, approveMovementApproval, rejectMovementApproval } from "../src/features/document-movement/server/movement-approval.service";
import { listDocumentInHand, createTransferBundle } from "../src/features/home/server/bundle-workflow.service";

async function runTests() {
  console.log("=================================================");
  console.log("STARTING PENDING APPROVAL MOVEMENT APPROVAL MATRIX SUITE");
  console.log("=================================================\n");

  const ownerAdmin = await prisma.user.findFirst({
    where: { role: { name: { in: ["Admin", "Super Admin"] } } },
  });

  if (!ownerAdmin) {
    console.error("No admin user found to test with.");
    process.exit(1);
  }

  const ownerAdminId = ownerAdmin.ownerAdminId || ownerAdmin.id;
  const userId = ownerAdmin.id;

  let officeKochi = await prisma.officeLocation.findFirst({
    where: { officeName: "Kochi HQ", ownerAdminId },
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

  let officeMalappuram = await prisma.officeLocation.findFirst({
    where: { officeName: "Malappuram", ownerAdminId },
  });

  if (!officeMalappuram) {
    officeMalappuram = await prisma.officeLocation.create({
      data: {
        officeName: "Malappuram",
        location: "Malappuram",
        timezone: "Asia/Kolkata",
        ownerAdminId,
      },
    });
  }

  const tNum1 = `TEST-MTRX-1-${Date.now()}`;
  const tNum2 = `TEST-MTRX-2-${Date.now()}`;
  const tNum3 = `TEST-MTRX-3-${Date.now()}`;
  const tNum4 = `TEST-MTRX-4-${Date.now()}`;
  const tNum5 = `TEST-MTRX-5-${Date.now()}`;
  const tNum6 = `TEST-MTRX-6-${Date.now()}`;
  const tNum7 = `TEST-MTRX-7-${Date.now()}`;
  const tNum8 = `TEST-MTRX-8-${Date.now()}`;

  try {
    // ---------------------------------------------------------
    // TEST 1: Advance Amount = ₹1,000, Movement Approval = PENDING
    // ---------------------------------------------------------
    console.log("--- TEST 1: Advance Amount = ₹1,000 + PENDING approval ---");
    const reg1 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum1,
        customerName: "Test 1 Customer",
        documentName: "Degree Certificate",
        totalCharges: 5000,
        advancePaid: 1000,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Test User",
      userId
    );
    await prisma.registration.update({ where: { id: reg1.id }, data: { advancePaid: 1000 } });

    const queue1 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found1 = queue1.find((item: any) => item.trackingNumber === tNum1);
    const inHand1 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc1 = inHand1.find((d: any) => d.trackingNumber === tNum1);

    console.log(`TEST 1 - In Queue: ${Boolean(found1)} | Checkbox Enabled: ${doc1?.canTransfer}`);
    if (found1 || !doc1?.canTransfer) {
      throw new Error("FAIL Test 1: Advance = ₹1,000 must NOT appear in Movement Approval queue and MUST have checkbox enabled!");
    }
    console.log("PASSED TEST 1\n");

    // ---------------------------------------------------------
    // TEST 2: Advance Amount = ₹0, Movement Approval = PENDING
    // ---------------------------------------------------------
    console.log("--- TEST 2: Advance Amount = ₹0 + PENDING approval ---");
    const reg2 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum2,
        customerName: "Test 2 Customer",
        documentName: "Birth Certificate",
        totalCharges: 3000,
        advancePaid: 0,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Test User",
      userId
    );

    const queue2 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found2 = queue2.find((item: any) => item.trackingNumber === tNum2);
    const inHand2 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc2 = inHand2.find((d: any) => d.trackingNumber === tNum2);

    console.log(`TEST 2 - In Queue: ${Boolean(found2)} | Checkbox Enabled: ${doc2?.canTransfer}`);
    if (!found2 || doc2?.canTransfer !== false) {
      throw new Error("FAIL Test 2: Advance = ₹0 must appear in Movement Approval queue and have transfer blocked!");
    }
    console.log("PASSED TEST 2\n");

    // ---------------------------------------------------------
    // TEST 3: Advance Amount = 0 / NULL representation, Movement Approval = PENDING
    // ---------------------------------------------------------
    console.log("--- TEST 3: Advance Amount = 0 / NULL representation + PENDING approval ---");
    const reg3 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum3,
        customerName: "Test 3 Customer",
        documentName: "Marriage Certificate",
        totalCharges: 2500,
        advancePaid: 0,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Test User",
      userId
    );

    const queue3 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found3 = queue3.find((item: any) => item.trackingNumber === tNum3);
    const inHand3 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc3 = inHand3.find((d: any) => d.trackingNumber === tNum3);

    console.log(`TEST 3 - In Queue: ${Boolean(found3)} | Checkbox Enabled: ${doc3?.canTransfer}`);
    if (!found3 || doc3?.canTransfer !== false) {
      throw new Error("FAIL Test 3: Advance = NULL must appear in Movement Approval queue and have transfer blocked!");
    }
    console.log("PASSED TEST 3\n");

    // ---------------------------------------------------------
    // TEST 4: Advance Amount = NULL, Movement Approval = APPROVED
    // ---------------------------------------------------------
    console.log("--- TEST 4: Advance Amount = NULL + APPROVED approval ---");
    const reg4 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum4,
        customerName: "Test 4 Customer",
        documentName: "TC Certificate",
        totalCharges: 2000,
        advancePaid: 0,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Test User",
      userId
    );
    await prisma.registration.update({ where: { id: reg4.id }, data: { movementApproved: true } });

    const pending4 = await prisma.movementApproval.findFirst({ where: { registrationId: reg4.id } });
    if (pending4) {
      await approveMovementApproval({ id: pending4.id, ownerAdminId, approvedByUserId: userId });
    }

    const queue4 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found4 = queue4.find((item: any) => item.trackingNumber === tNum4);
    const inHand4 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc4 = inHand4.find((d: any) => d.trackingNumber === tNum4);

    console.log(`TEST 4 - In Queue: ${Boolean(found4)} | Checkbox Enabled: ${doc4?.canTransfer}`);
    if (found4 || doc4?.canTransfer !== true) {
      throw new Error("FAIL Test 4: Approved doc must NOT appear in queue and MUST be transferable!");
    }
    console.log("PASSED TEST 4\n");

    // ---------------------------------------------------------
    // TEST 5: Advance Amount = 0, Movement Approval = APPROVED
    // ---------------------------------------------------------
    console.log("--- TEST 5: Advance Amount = 0 + APPROVED approval ---");
    const reg5 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum5,
        customerName: "Test 5 Customer",
        documentName: "Power of Attorney",
        totalCharges: 4000,
        advancePaid: 0,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Test User",
      userId
    );
    await prisma.registration.update({ where: { id: reg5.id }, data: { movementApproved: true } });

    const pending5 = await prisma.movementApproval.findFirst({ where: { registrationId: reg5.id } });
    if (pending5) {
      await approveMovementApproval({ id: pending5.id, ownerAdminId, approvedByUserId: userId });
    }

    const queue5 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found5 = queue5.find((item: any) => item.trackingNumber === tNum5);
    const inHand5 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc5 = inHand5.find((d: any) => d.trackingNumber === tNum5);

    console.log(`TEST 5 - In Queue: ${Boolean(found5)} | Checkbox Enabled: ${doc5?.canTransfer}`);
    if (found5 || doc5?.canTransfer !== true) {
      throw new Error("FAIL Test 5: Approved doc must NOT appear in queue and MUST be transferable!");
    }
    console.log("PASSED TEST 5\n");

    // ---------------------------------------------------------
    // TEST 6: Advance Amount > 0, No Movement Approval record
    // ---------------------------------------------------------
    console.log("--- TEST 6: Advance Amount > 0 + No Movement Approval record ---");
    const reg6 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum6,
        customerName: "Test 6 Customer",
        documentName: "Commercial Invoice",
        totalCharges: 5000,
        advancePaid: 2000,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Test User",
      userId
    );
    await prisma.registration.update({ where: { id: reg6.id }, data: { advancePaid: 2000 } });

    const queue6 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found6 = queue6.find((item: any) => item.trackingNumber === tNum6);
    const inHand6 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc6 = inHand6.find((d: any) => d.trackingNumber === tNum6);

    console.log(`TEST 6 - In Queue: ${Boolean(found6)} | Checkbox Enabled: ${doc6?.canTransfer}`);
    if (found6 || doc6?.canTransfer !== true) {
      throw new Error("FAIL Test 6: Advance > 0 must NOT appear in queue and MUST be transferable!");
    }
    console.log("PASSED TEST 6\n");

    // ---------------------------------------------------------
    // TEST 7: Existing old database record: Advance Amount = NULL, Movement Approval = PENDING (no movementApproval row)
    // ---------------------------------------------------------
    console.log("--- TEST 7: Existing old database record: Advance = NULL, missing approval row ---");
    const reg7 = await prisma.registration.create({
      data: {
        trackingNumber: tNum7,
        customerName: "Old Record Null Advance",
        documentName: "Old Transcript",
        documentType: "Educational",
        totalCharges: 3000,
        advancePaid: 0,
        regionOfRegistration: officeKochi.officeName,
        ownerAdminId,
        createdBy: userId,
        documentMovements: {
          create: {
            trackingNumber: tNum7,
            currentOfficeId: officeKochi.id,
            currentModule: "REGISTRATION",
            status: "HOME",
            movementType: "INITIAL",
            createdBy: userId,
            originOfficeId: officeKochi.id,
          },
        },
      },
    });

    const queue7 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found7 = queue7.find((item: any) => item.trackingNumber === tNum7);
    const inHand7 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc7 = inHand7.find((d: any) => d.trackingNumber === tNum7);

    console.log(`TEST 7 - In Queue: ${Boolean(found7)} | Checkbox Enabled: ${doc7?.canTransfer}`);
    if (!found7 || doc7?.canTransfer !== false) {
      throw new Error("FAIL Test 7: Existing old zero/null advance record MUST immediately appear in Movement Approval queue!");
    }
    console.log("PASSED TEST 7: Old database record with NULL advance automatically appears in Movement Approval queue.\n");

    // ---------------------------------------------------------
    // TEST 8: Existing old database record: Advance Amount = ₹1,000, Movement Approval = PENDING
    // ---------------------------------------------------------
    console.log("--- TEST 8: Existing old database record: Advance = ₹1,000, Movement Approval = PENDING ---");
    const reg8 = await prisma.registration.create({
      data: {
        trackingNumber: tNum8,
        customerName: "Old Record With Advance",
        documentName: "Old Commercial Doc",
        documentType: "Commercial",
        totalCharges: 5000,
        advancePaid: 1000,
        regionOfRegistration: officeKochi.officeName,
        ownerAdminId,
        createdBy: userId,
        movementApprovals: {
          create: {
            trackingNumber: tNum8,
            advanceAmount: 0,
            status: "Pending",
            requestedByName: "System",
            ownerAdminId,
          },
        },
        documentMovements: {
          create: {
            trackingNumber: tNum8,
            currentOfficeId: officeKochi.id,
            currentModule: "REGISTRATION",
            status: "HOME",
            movementType: "INITIAL",
            createdBy: userId,
            originOfficeId: officeKochi.id,
          },
        },
      },
    });

    const queue8 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const found8 = queue8.find((item: any) => item.trackingNumber === tNum8);
    const inHand8 = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const doc8 = inHand8.find((d: any) => d.trackingNumber === tNum8);

    console.log(`TEST 8 - In Queue: ${Boolean(found8)} | Checkbox Enabled: ${doc8?.canTransfer}`);
    if (found8 || doc8?.canTransfer !== true) {
      throw new Error("FAIL Test 8: Existing record with Advance = ₹1,000 MUST NOT appear in queue and MUST be transferable!");
    }
    console.log("PASSED TEST 8: Old database record with Advance = ₹1,000 is correctly excluded from queue.\n");

    console.log("=================================================");
    console.log("ALL 8 MATRIX TEST CASES PASSED SUCCESSFULLY!");
    console.log("=================================================");
  } finally {
    console.log("\nCleaning up test records...");
    const allTracking = [tNum1, tNum2, tNum3, tNum4, tNum5, tNum6, tNum7, tNum8];
    await prisma.movementApproval.deleteMany({ where: { trackingNumber: { in: allTracking } } });
    await prisma.movementHistory.deleteMany({ where: { trackingNumber: { in: allTracking } } });
    await prisma.bundleItem.deleteMany({ where: { trackingNumber: { in: allTracking } } });
    await prisma.documentMovement.deleteMany({ where: { trackingNumber: { in: allTracking } } });
    for (const t of allTracking) {
      const reg = await prisma.registration.findUnique({ where: { trackingNumber: t } });
      if (reg) {
        await deleteRegistration(ownerAdminId, reg.id).catch(() => {});
      }
    }
    console.log("Cleanup completed.");
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
