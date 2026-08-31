import { prisma } from "../src/lib/prisma";
import { createRegistration, deleteRegistration } from "../src/features/registration/server/registration.service";
import { listPendingMovementApprovals, bulkApproveMovementApprovals, approveMovementApproval } from "../src/features/document-movement/server/movement-approval.service";
import { listDocumentInHand, createTransferBundle } from "../src/features/home/server/bundle-workflow.service";

async function runBulkApprovalTests() {
  console.log("=================================================");
  console.log("STARTING BULK MOVEMENT APPROVAL TEST SUITE");
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

  const tNum1 = `TEST-BLK-1-${Date.now()}`;
  const tNum2 = `TEST-BLK-2-${Date.now()}`;
  const tNum3 = `TEST-BLK-3-${Date.now()}`;
  const tNum4 = `TEST-BLK-4-${Date.now()}`;
  const tNum5 = `TEST-BLK-5-${Date.now()}`;
  const allTracking = [tNum1, tNum2, tNum3, tNum4, tNum5];

  try {
    // Setup registrations
    const reg1 = await createRegistration(ownerAdminId, { trackingNumber: tNum1, customerName: "Cust 1", documentName: "Doc 1", totalCharges: 3000, advancePaid: 0, approvalStatus: "Approved" }, officeKochi.officeName, "User", userId);
    const reg2 = await createRegistration(ownerAdminId, { trackingNumber: tNum2, customerName: "Cust 2", documentName: "Doc 2", totalCharges: 4000, advancePaid: 0, approvalStatus: "Approved" }, officeKochi.officeName, "User", userId);
    const reg3 = await createRegistration(ownerAdminId, { trackingNumber: tNum3, customerName: "Cust 3", documentName: "Doc 3", totalCharges: 5000, advancePaid: 0, approvalStatus: "Approved" }, officeKochi.officeName, "User", userId);
    const reg4 = await createRegistration(ownerAdminId, { trackingNumber: tNum4, customerName: "Cust 4", documentName: "Doc 4", totalCharges: 2000, advancePaid: 0, approvalStatus: "Approved" }, officeKochi.officeName, "User", userId);
    const reg5 = await createRegistration(ownerAdminId, { trackingNumber: tNum5, customerName: "Cust 5", documentName: "Doc 5 (Advance > 0)", totalCharges: 6000, advancePaid: 1500, approvalStatus: "Approved" }, officeKochi.officeName, "User", userId);
    await prisma.registration.update({ where: { id: reg5.id }, data: { advancePaid: 1500 } });

    // Fetch initial queue
    const initialQueue = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    console.log(`Initial Pending Movement Approvals queue length: ${initialQueue.length}`);

    const item1 = initialQueue.find((i: any) => i.trackingNumber === tNum1);
    const item2 = initialQueue.find((i: any) => i.trackingNumber === tNum2);
    const item3 = initialQueue.find((i: any) => i.trackingNumber === tNum3);
    const item4 = initialQueue.find((i: any) => i.trackingNumber === tNum4);

    if (!item1 || !item2 || !item3 || !item4) {
      throw new Error("FAIL: Zero advance registrations did not appear in pending movement approvals queue!");
    }

    // ---------------------------------------------------------
    // TEST 1: SINGLE DOCUMENT BULK APPROVAL
    // ---------------------------------------------------------
    console.log("\n--- TEST 1: Bulk Approve Single Document ---");
    const result1 = await bulkApproveMovementApprovals({
      ids: [item1.id],
      ownerAdminId,
      approvedByUserId: userId,
      approvedByName: "Test Admin",
      remarks: "Bulk approval test 1",
    });

    if (result1.count !== 1) {
      throw new Error(`FAIL Test 1: Expected 1 approval, got ${result1.count}`);
    }

    const queueAfter1 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const inQueue1 = queueAfter1.some((i: any) => i.trackingNumber === tNum1);
    if (inQueue1) {
      throw new Error("FAIL Test 1: Approved document item1 still in queue!");
    }
    console.log("PASSED TEST 1: Single document bulk approved and removed from queue.\n");

    // ---------------------------------------------------------
    // TEST 2: MULTIPLE DOCUMENTS BULK APPROVAL (3 DOCS)
    // ---------------------------------------------------------
    console.log("--- TEST 2: Bulk Approve Multiple Documents (3 Docs) ---");
    const bulkRemarks = "Bulk approved for regional office transfer.";
    const result2 = await bulkApproveMovementApprovals({
      ids: [item2.id, item3.id, item4.id],
      ownerAdminId,
      approvedByUserId: userId,
      approvedByName: "Test Admin",
      remarks: bulkRemarks,
    });

    if (result2.count !== 3) {
      throw new Error(`FAIL Test 2: Expected 3 approvals, got ${result2.count}`);
    }

    // Verify shared remarks and history for all 3
    const histories = await prisma.movementHistory.findMany({
      where: { trackingNumber: { in: [tNum2, tNum3, tNum4] }, action: "Movement Approved" },
    });

    for (const h of histories) {
      if (h.remarks !== bulkRemarks) {
        throw new Error(`FAIL Test 2: Remarks mismatch for ${h.trackingNumber}. Got: ${h.remarks}`);
      }
    }

    const queueAfter2 = await listPendingMovementApprovals({ ownerAdminId, officeId: officeKochi.id });
    const remainingInQueue = queueAfter2.filter((i: any) => [tNum2, tNum3, tNum4].includes(i.trackingNumber));
    if (remainingInQueue.length > 0) {
      throw new Error("FAIL Test 2: Approved items still in queue!");
    }
    console.log("PASSED TEST 2: Multiple documents bulk approved with shared remarks.\n");

    // ---------------------------------------------------------
    // TEST 3: ADVANCE AMOUNT > 0 REJECTION PROTECTION
    // ---------------------------------------------------------
    console.log("--- TEST 3: Advance Amount > 0 Rejection Protection ---");
    // Create an artificial movement approval record for reg5 (advance = 1500)
    const badApp = await prisma.movementApproval.create({
      data: {
        registrationId: reg5.id,
        trackingNumber: tNum5,
        advanceAmount: 1500,
        status: "Pending",
        ownerAdminId,
      },
    });

    let caughtError = false;
    try {
      await bulkApproveMovementApprovals({
        ids: [badApp.id],
        ownerAdminId,
        approvedByUserId: userId,
      });
    } catch (err: any) {
      caughtError = true;
      console.log(`Successfully caught advance protection error: "${err.message}"`);
    }

    if (!caughtError) {
      throw new Error("FAIL Test 3: Backend failed to reject bulk approval for document with advance > 0!");
    }
    console.log("PASSED TEST 3: Backend successfully protects against approving advance > 0 documents.\n");

    // ---------------------------------------------------------
    // TEST 4: POST APPROVAL HOME TRANSFER WORKFLOW
    // ---------------------------------------------------------
    console.log("--- TEST 4: Post-Approval Home Transfer Verification ---");
    const inHandDocs = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const checkDoc1 = inHandDocs.find((d: any) => d.trackingNumber === tNum1);
    const checkDoc2 = inHandDocs.find((d: any) => d.trackingNumber === tNum2);

    if (!checkDoc1?.canTransfer || !checkDoc2?.canTransfer) {
      throw new Error("FAIL Test 4: Bulk approved documents are not marked canTransfer = true in Home!");
    }

    const bundle = await createTransferBundle({
      ownerAdminId,
      trackingNumbers: [tNum1, tNum2],
      fromOfficeId: officeKochi.id,
      toOfficeId: officeMalappuram.id,
      userId,
      userName: "Test Admin",
    });

    console.log(`Successfully created transfer bundle ${bundle.bundleCode} containing bulk-approved documents!`);
    console.log("PASSED TEST 4: Bulk-approved documents seamlessly support transfer.\n");

    console.log("=================================================");
    console.log("ALL BULK MOVEMENT APPROVAL TEST CASES PASSED!");
    console.log("=================================================");
  } finally {
    console.log("\nCleaning up test records...");
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

runBulkApprovalTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
