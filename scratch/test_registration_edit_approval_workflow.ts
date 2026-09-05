import { prisma } from "../src/lib/prisma";
import { createRegistration, deleteRegistration } from "../src/features/registration/server/registration.service";
import {
  createEditRequest,
  approveEditRequest,
  rejectEditRequest,
  computeFieldChanges,
  listEditRequests,
  getEditRequestById,
} from "../src/features/registration/server/registration-edit-request.service";
import { listDocumentInHand } from "../src/features/home/server/bundle-workflow.service";

async function runTests() {
  console.log("=================================================================");
  console.log("STARTING REGISTRATION EDIT APPROVAL WORKFLOW TEST SUITE");
  console.log("=================================================================\n");

  const admin = await prisma.user.findFirst({
    where: { role: { name: { in: ["Super Admin", "Admin"] } } },
  });

  if (!admin) {
    console.error("No admin user found.");
    process.exit(1);
  }

  const ownerAdminId = admin.ownerAdminId || admin.id;
  const userId = admin.id;

  const testSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Create test offices
  const officeMalappuram = await prisma.officeLocation.create({
    data: {
      officeName: `Malappuram_${testSuffix}`,
      location: "Malappuram",
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  const officeThrissur = await prisma.officeLocation.create({
    data: {
      officeName: `Thrissur_${testSuffix}`,
      location: "Thrissur",
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  const createdRegIds: string[] = [];

  try {
    // =====================================================================
    // TEST 1: Standard Document Edit - Creation & Data Isolation
    // =====================================================================
    console.log("--- TEST 1: Standard Edit Request Creation & Data Isolation ---");
    const tNum1 = `T-EDIT-1-${testSuffix}`;
    const reg1 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum1,
        customerName: "Original Customer Name",
        documentName: "Original Degree Certificate",
        documentType: "Certificate",
        processType: "HRD Attestation",
        priority: "Normal",
        totalCharges: 5000,
        deliveryLocation: officeMalappuram.officeName,
      },
      officeMalappuram.officeName,
      "Staff User",
      userId
    );
    createdRegIds.push(reg1.id);

    // User edits customerName and priority
    const editReq1 = await createEditRequest({
      ownerAdminId,
      registrationId: reg1.id,
      input: {
        customerName: "Updated Proposed Customer Name",
        documentName: "Original Degree Certificate",
        documentType: "Certificate",
        processType: "HRD Attestation",
        priority: "Urgent",
        totalCharges: 5000,
        deliveryLocation: officeMalappuram.officeName,
      },
      sourceOfficeName: officeMalappuram.officeName,
      requestedById: userId,
      requestedByName: "Staff Requester",
    });

    // 1. Verify original document in DB is COMPLETELY UNTOUCHED
    const untouchedDoc1 = await prisma.registration.findUnique({ where: { id: reg1.id } });
    if (untouchedDoc1?.customerName !== "Original Customer Name" || untouchedDoc1?.priority !== "Normal") {
      throw new Error(`FAIL Test 1: Original document was modified before approval! customerName='${untouchedDoc1?.customerName}'`);
    }

    // 2. Verify EditRequest record properties
    if (editReq1.status !== "PENDING") {
      throw new Error(`FAIL Test 1: Edit request status must be PENDING, got '${editReq1.status}'`);
    }
    if (editReq1.trackingNumber !== tNum1 || editReq1.registrationId !== reg1.id) {
      throw new Error("FAIL Test 1: Tracking number or registrationId mismatch on EditRequest!");
    }
    console.log("TEST 1 fieldChanges detected:", JSON.stringify(editReq1.fieldChanges, null, 2));

    const changedFields = editReq1.fieldChanges.map((c) => c.field).sort();
    if (JSON.stringify(changedFields) !== JSON.stringify(["customerName", "priority"])) {
      throw new Error(`FAIL Test 1: Unexpected changed fields: ${JSON.stringify(changedFields)}`);
    }

    console.log("[PASS] Test 1: Edit request created with full snapshots and diffs; base document remains 100% untouched.\n");

    // =====================================================================
    // TEST 2: Duplicate Request Prevention
    // =====================================================================
    console.log("--- TEST 2: Duplicate Request Prevention ---");
    let duplicateBlocked = false;
    try {
      await createEditRequest({
        ownerAdminId,
        registrationId: reg1.id,
        input: { customerName: "Second Edit Attempt" },
        sourceOfficeName: officeMalappuram.officeName,
        requestedById: userId,
        requestedByName: "Staff Requester",
      });
    } catch (err: any) {
      duplicateBlocked = true;
      if (err.statusCode !== 409) {
        throw new Error(`FAIL Test 2: Expected status code 409, got ${err.statusCode}`);
      }
      console.log(`[PASS] Caught expected duplicate error: "${err.message}"`);
    }

    if (!duplicateBlocked) {
      throw new Error("FAIL Test 2: Second edit request should have been rejected with 409 Conflict!");
    }
    console.log("[PASS] Test 2: Duplicate edit request prevented while pending.\n");

    // =====================================================================
    // TEST 3: Approve Edit Request (Standard Document)
    // =====================================================================
    console.log("--- TEST 3: Approve Edit Request (Standard Document) ---");
    const approveRes3 = await approveEditRequest({
      ownerAdminId,
      id: editReq1.id,
      approvedById: userId,
      approvedByName: "Branch Manager Approver",
    });

    // Verify EditRequest status
    if (approveRes3.editRequest.status !== "APPROVED") {
      throw new Error(`FAIL Test 3: Edit request status should be APPROVED, got '${approveRes3.editRequest.status}'`);
    }

    // Verify Registration document updated in DB
    const updatedDoc1 = await prisma.registration.findUnique({
      where: { id: reg1.id },
      include: { auditTrail: { orderBy: { createdAt: "desc" } } },
    });

    if (updatedDoc1?.customerName !== "Updated Proposed Customer Name" || updatedDoc1?.priority !== "Urgent") {
      throw new Error(`FAIL Test 3: Proposed changes were not applied to Registration document upon approval!`);
    }

    // Verify Audit Trail entry
    const audit3 = updatedDoc1.auditTrail.find((a) => a.action === "Edit request approved");
    if (!audit3 || !audit3.description.includes("Customer Name")) {
      throw new Error("FAIL Test 3: Audit trail entry for approved edit request was not created!");
    }
    console.log("[PASS] Test 3: Edit request approved, changes applied to Registration, and audit trail logged.\n");

    // =====================================================================
    // TEST 4: Reject Edit Request
    // =====================================================================
    console.log("--- TEST 4: Reject Edit Request ---");
    const tNum4 = `T-EDIT-REJ-${testSuffix}`;
    const reg4 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum4,
        customerName: "Reject Test Customer",
        totalCharges: 3000,
        deliveryLocation: officeMalappuram.officeName,
      },
      officeMalappuram.officeName,
      "Staff User",
      userId
    );
    createdRegIds.push(reg4.id);

    const editReq4 = await createEditRequest({
      ownerAdminId,
      registrationId: reg4.id,
      input: {
        customerName: "Should Be Rejected",
        totalCharges: 1000,
        deliveryLocation: officeMalappuram.officeName,
      },
      sourceOfficeName: officeMalappuram.officeName,
      requestedById: userId,
      requestedByName: "Staff User",
    });

    const rejectRes4 = await rejectEditRequest({
      ownerAdminId,
      id: editReq4.id,
      rejectedById: userId,
      rejectedByName: "BM Approver",
      rejectionReason: "Fee reduction not authorized by management",
    });

    if (rejectRes4.status !== "REJECTED" || rejectRes4.rejectionReason !== "Fee reduction not authorized by management") {
      throw new Error("FAIL Test 4: Reject response invalid!");
    }

    // Verify original registration is completely unchanged
    const doc4AfterReject = await prisma.registration.findUnique({
      where: { id: reg4.id },
      include: { auditTrail: { orderBy: { createdAt: "desc" } } },
    });

    if (doc4AfterReject?.customerName !== "Reject Test Customer" || Number(doc4AfterReject?.totalCharges) !== 3000) {
      throw new Error("FAIL Test 4: Document was modified despite rejection!");
    }

    const audit4 = doc4AfterReject.auditTrail.find((a) => a.action === "Edit request rejected");
    if (!audit4 || !audit4.description.includes("Fee reduction not authorized")) {
      throw new Error("FAIL Test 4: Audit trail for rejection was not created!");
    }
    console.log("[PASS] Test 4: Edit request rejected, reason recorded, base document untouched, audit logged.\n");

    // =====================================================================
    // TEST 5: Stale Request Protection
    // =====================================================================
    console.log("--- TEST 5: Stale Request Protection ---");
    const tNum5 = `T-EDIT-STALE-${testSuffix}`;
    const reg5 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum5,
        customerName: "Stale Test Customer",
        totalCharges: 2000,
      },
      officeMalappuram.officeName,
      "Staff User",
      userId
    );
    createdRegIds.push(reg5.id);

    const editReq5 = await createEditRequest({
      ownerAdminId,
      registrationId: reg5.id,
      input: { customerName: "Stale Proposed Name" },
      sourceOfficeName: officeMalappuram.officeName,
      requestedById: userId,
      requestedByName: "Staff User",
    });

    // Simulate external update modifying the document after the edit request snapshot was taken
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await prisma.registration.update({
      where: { id: reg5.id },
      data: { customerName: "Direct Concurrent Modification" },
    });

    let staleBlocked = false;
    try {
      await approveEditRequest({
        ownerAdminId,
        id: editReq5.id,
        approvedById: userId,
        approvedByName: "BM Approver",
      });
    } catch (err: any) {
      staleBlocked = true;
      if (err.statusCode !== 409 || !err.isStale) {
        throw new Error(`FAIL Test 5: Expected stale 409 error, got ${err.statusCode}`);
      }
      console.log(`[PASS] Caught expected stale document error: "${err.message}"`);
    }

    if (!staleBlocked) {
      throw new Error("FAIL Test 5: Stale edit request should have been blocked!");
    }

    const staleReqRecord = await prisma.registrationEditRequest.findUnique({ where: { id: editReq5.id } });
    if (staleReqRecord?.status !== "FAILED_REVIEW") {
      throw new Error(`FAIL Test 5: Stale request status should be FAILED_REVIEW, got '${staleReqRecord?.status}'`);
    }
    console.log("[PASS] Test 5: Stale request detected, approval blocked, transitioned to FAILED_REVIEW.\n");

    // =====================================================================
    // TEST 6: Special Rule for Ready for Delivery Documents
    // =====================================================================
    console.log("--- TEST 6: Special Rule for Ready for Delivery Documents ---");
    const tNum6 = `T-EDIT-RFD-${testSuffix}`;
    const reg6 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum6,
        customerName: "RFD Special Customer",
        documentName: "Commercial Agreement",
        documentType: "Commercial",
        processType: "Attestation",
        totalCharges: 6000,
        deliveryLocation: officeMalappuram.officeName,
      },
      officeMalappuram.officeName,
      "Staff User",
      userId
    );
    createdRegIds.push(reg6.id);

    // Place document into Ready for Delivery queue at Malappuram
    await prisma.documentMovement.updateMany({
      where: { registrationId: reg6.id },
      data: {
        status: "Ready for Delivery",
        currentModule: "READY_FOR_DELIVERY",
        currentStatus: "READY_FOR_DELIVERY",
      },
    });

    await prisma.registration.update({
      where: { id: reg6.id },
      data: {
        trackingStatus: "Ready for Delivery",
        bmStatus: "Ready for Delivery",
      },
    });

    // User edits Delivery Location from Malappuram to Thrissur
    const editReq6 = await createEditRequest({
      ownerAdminId,
      registrationId: reg6.id,
      input: {
        customerName: "RFD Special Customer",
        documentName: "Commercial Agreement",
        documentType: "Commercial",
        processType: "Attestation",
        totalCharges: 6000,
        deliveryLocation: officeThrissur.officeName,
      },
      sourceOfficeName: officeMalappuram.officeName,
      requestedById: userId,
      requestedByName: "Staff User",
    });

    // 1. While PENDING, document MUST remain in Malappuram's Ready for Delivery queue
    const pendingDoc6 = await prisma.registration.findUnique({
      where: { id: reg6.id },
      include: { documentMovements: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    if (pendingDoc6?.deliveryLocation !== officeMalappuram.officeName) {
      throw new Error(`FAIL Test 6: Delivery location became active before approval! (${pendingDoc6?.deliveryLocation})`);
    }
    if (pendingDoc6?.trackingStatus !== "Ready for Delivery" || pendingDoc6?.documentMovements[0]?.status !== "Ready for Delivery") {
      throw new Error(`FAIL Test 6: Document left Ready for Delivery queue before approval!`);
    }

    // 2. Approver confirms approval
    const approveRes6 = await approveEditRequest({
      ownerAdminId,
      id: editReq6.id,
      approvedById: userId,
      approvedByName: "Regional Manager Approver",
    });

    if (!approveRes6.rfdSpecialHandled) {
      throw new Error("FAIL Test 6: rfdSpecialHandled flag was not returned as true!");
    }

    // 3. Verify Document is removed from RFD and returned to Malappuram Home -> Document In Hand
    const approvedDoc6 = await prisma.registration.findUnique({
      where: { id: reg6.id },
      include: {
        documentMovements: { take: 1, orderBy: { createdAt: "desc" } },
        auditTrail: { orderBy: { createdAt: "desc" } },
      },
    });

    // Delivery location is updated to Thrissur
    if (approvedDoc6?.deliveryLocation !== officeThrissur.officeName) {
      throw new Error(`FAIL Test 6: Delivery location not updated to Thrissur after approval!`);
    }

    // Status is Document In Hand (NOT Ready for Delivery)
    if (approvedDoc6?.trackingStatus !== "Document In Hand") {
      throw new Error(`FAIL Test 6: Expected trackingStatus 'Document In Hand', got '${approvedDoc6?.trackingStatus}'`);
    }

    const mov6 = approvedDoc6?.documentMovements[0];
    if (mov6?.status !== "HOME" || mov6?.currentStatus !== "Document In Hand" || mov6?.currentModule !== "HOME") {
      throw new Error(`FAIL Test 6: Document movement not returned to HOME/Document In Hand! (${mov6?.status})`);
    }

    // 4. Verify Movement History entry
    const movements6 = await prisma.movementHistory.findMany({
      where: { trackingNumber: reg6.trackingNumber },
      orderBy: { performedAt: "desc" },
    });
    const movHist6 = movements6.find((m) => m.action === "Delivery Location Changed");
    if (!movHist6 || !movHist6.remarks?.includes("returned to Home Document In Hand")) {
      throw new Error("FAIL Test 6: Movement history entry for delivery location change return missing!");
    }

    // 5. Verify Audit Trail entry
    const audit6 = approvedDoc6?.auditTrail.find((a) => a.action === "Delivery location changed");
    if (!audit6) {
      throw new Error("FAIL Test 6: Audit trail entry for RFD return missing!");
    }

    // 6. Verify document appears in Malappuram's Document In Hand list (NOT Thrissur)
    const malappuramInHand = await listDocumentInHand({ ownerAdminId, officeId: officeMalappuram.id });
    const inHandFound = malappuramInHand.some((d: any) => d.trackingNumber === tNum6);
    if (!inHandFound) {
      throw new Error(`FAIL Test 6: Document ${tNum6} MUST appear in Malappuram Document In Hand for transfer!`);
    }

    console.log("[PASS] Test 6: Ready for Delivery Special Rule verified: location updated to Thrissur, document returned to Malappuram Home Document In Hand, audit & movement history logged.\n");

    console.log("=================================================================");
    console.log("ALL 6 AUTOMATED TESTS PASSED SUCCESSFULLY (100% PASS RATE)");
    console.log("=================================================================");
  } finally {
    console.log("\nCleaning up test artifacts...");
    try {
      for (const id of createdRegIds) {
        await prisma.auditTrail.deleteMany({ where: { registrationId: id } });
        await prisma.movementHistory.deleteMany({ where: { trackingNumber: { contains: testSuffix } } });
        await prisma.registrationEditRequest.deleteMany({ where: { registrationId: id } });
        await prisma.documentMovement.deleteMany({ where: { trackingNumber: { contains: testSuffix } } });
        await prisma.registration.delete({ where: { id } }).catch(() => null);
      }
      await prisma.officeLocation.delete({ where: { id: officeMalappuram.id } }).catch(() => null);
      await prisma.officeLocation.delete({ where: { id: officeThrissur.id } }).catch(() => null);
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }
}

runTests()
  .catch((err) => {
    console.error("Test Suite Failure:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
