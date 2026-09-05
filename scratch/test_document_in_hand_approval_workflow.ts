import { prisma } from "../src/lib/prisma";
import { createRegistration, deleteRegistration } from "../src/features/registration/server/registration.service";
import {
  approveAdvancePayment,
  rejectAdvancePayment,
  listAdvancePaymentApprovals,
} from "../src/features/revenue/server/advance-payment-approval.service";
import {
  createMovementApprovalRequest,
  approveMovementApproval,
  rejectMovementApproval,
  listPendingMovementApprovals,
} from "../src/features/document-movement/server/movement-approval.service";
import {
  listDocumentInHand,
  createTransferBundle,
  receiveBundle,
} from "../src/features/home/server/bundle-workflow.service";

async function runTests() {
  console.log("=================================================================");
  console.log("STARTING DOCUMENT IN HAND APPROVAL & VISIBILITY TEST SUITE");
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
  const officeA = await prisma.officeLocation.create({
    data: {
      officeName: `TestOffA_${testSuffix}`,
      location: "Location A",
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  const officeB = await prisma.officeLocation.create({
    data: {
      officeName: `TestOffB_${testSuffix}`,
      location: "Location B",
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  const createdRegIds: string[] = [];

  try {
    // =====================================================================
    // TEST 1: Route 1 - Advance > 0 with Pending Approval (Must be HIDDEN)
    // =====================================================================
    console.log("--- TEST 1: Route 1 - Advance > 0 with Pending Approval ---");
    const tNum1 = `T-R1-PEND-${testSuffix}`;
    const reg1 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum1,
        customerName: "Route 1 Pending Customer",
        documentName: "Degree Certificate",
        documentType: "Certificate",
        processType: "Attestation",
        totalCharges: 5000,
        advancePaid: 1500,
        requestedAdvanceAmount: 1500,
        paymentMode: "Cash",
      },
      officeA.officeName,
      "Test User",
      userId
    );
    createdRegIds.push(reg1.id);

    // Verify initial state
    const inHand1 = await listDocumentInHand({ ownerAdminId, officeId: officeA.id });
    const isDoc1InHand = inHand1.some((d: any) => d.trackingNumber === tNum1);

    if (isDoc1InHand) {
      throw new Error(`FAIL Test 1: Document ${tNum1} with pending advance payment MUST NOT appear in Document In Hand!`);
    }

    // Verify attempting to create transfer bundle fails
    let transferFailed = false;
    try {
      await createTransferBundle({
        trackingNumbers: [tNum1],
        fromOfficeId: officeA.id,
        toOfficeId: officeB.id,
        userId,
        ownerAdminId,
      });
    } catch (err: any) {
      transferFailed = true;
      console.log(`[PASS] Expected transfer block caught: "${err.message}"`);
    }

    if (!transferFailed) {
      throw new Error(`FAIL Test 1: createTransferBundle should have blocked unapproved document ${tNum1}!`);
    }
    console.log("[PASS] Test 1: Advance > 0 document is strictly hidden while Advance Payment Approval is Pending.\n");

    // =====================================================================
    // TEST 2: Route 1 - Advance > 0 Approved (Must become VISIBLE)
    // =====================================================================
    console.log("--- TEST 2: Route 1 - Advance > 0 Approved ---");
    const advApprovals1 = await listAdvancePaymentApprovals(ownerAdminId, { registrationId: reg1.id });
    const advApp1 = advApprovals1.items[0];

    if (!advApp1) {
      throw new Error("FAIL Test 2: AdvancePaymentApproval request was not created for Route 1 registration!");
    }

    // Create a dummy file for bank proof
    const bankProofFile = await prisma.fileStorage.create({
      data: {
        module: "ADVANCE_PROOF",
        folder: "proofs",
        originalName: "bank_receipt.pdf",
        storedName: "bank_receipt_123.pdf",
        bucketKey: "proofs/bank_receipt_123.pdf",
        mimeType: "application/pdf",
        extension: "pdf",
        size: 1024,
        url: "/api/files/test/view",
        uploadedBy: userId,
      },
    });

    await approveAdvancePayment({
      ownerAdminId,
      approvalId: advApp1.id,
      approvedByUserId: userId,
      bankProofFileId: bankProofFile.id,
      remarks: "Payment verified in company account",
    });

    const inHand2 = await listDocumentInHand({ ownerAdminId, officeId: officeA.id });
    const doc2InHand = inHand2.find((d: any) => d.trackingNumber === tNum1);

    if (!doc2InHand || !doc2InHand.canTransfer) {
      throw new Error(`FAIL Test 2: Document ${tNum1} MUST appear in Document In Hand after Advance Payment Approval!`);
    }
    console.log(`[PASS] Test 2: Document ${tNum1} is now visible in Document In Hand (canTransfer=${doc2InHand.canTransfer}).\n`);

    // =====================================================================
    // TEST 3: Route 1 - Advance > 0 Rejected (Must remain HIDDEN)
    // =====================================================================
    console.log("--- TEST 3: Route 1 - Advance > 0 Rejected ---");
    const tNum3 = `T-R1-REJ-${testSuffix}`;
    const reg3 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum3,
        customerName: "Route 1 Reject Customer",
        documentName: "Diploma",
        documentType: "Certificate",
        processType: "Attestation",
        totalCharges: 4000,
        advancePaid: 1000,
        requestedAdvanceAmount: 1000,
        paymentMode: "Bank Transfer",
      },
      officeA.officeName,
      "Test User",
      userId
    );
    createdRegIds.push(reg3.id);

    const advApprovals3 = await listAdvancePaymentApprovals(ownerAdminId, { registrationId: reg3.id });
    const advApp3 = advApprovals3.items[0];

    await rejectAdvancePayment({
      ownerAdminId,
      approvalId: advApp3.id,
      rejectedByUserId: userId,
      rejectionReason: "Fake bank receipt reference",
    });

    const inHand3 = await listDocumentInHand({ ownerAdminId, officeId: officeA.id });
    const isDoc3InHand = inHand3.some((d: any) => d.trackingNumber === tNum3);

    if (isDoc3InHand) {
      throw new Error(`FAIL Test 3: Rejected advance document ${tNum3} MUST NOT appear in Document In Hand!`);
    }
    console.log("[PASS] Test 3: Rejected advance document remains hidden from Document In Hand.\n");

    // =====================================================================
    // TEST 4: Route 2 - Zero Advance without Movement Request (Must be HIDDEN)
    // =====================================================================
    console.log("--- TEST 4: Route 2 - Zero Advance without Movement Request ---");
    const tNum4 = `T-R2-NONE-${testSuffix}`;
    const reg4 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum4,
        customerName: "Route 2 Zero Advance Customer",
        documentName: "Commercial Invoice",
        documentType: "Commercial",
        processType: "Apostille",
        totalCharges: 3000,
        advancePaid: 0,
        requestedAdvanceAmount: 0,
      },
      officeA.officeName,
      "Test User",
      userId
    );
    createdRegIds.push(reg4.id);

    const inHand4 = await listDocumentInHand({ ownerAdminId, officeId: officeA.id });
    const isDoc4InHand = inHand4.some((d: any) => d.trackingNumber === tNum4);

    if (isDoc4InHand) {
      throw new Error(`FAIL Test 4: Zero-advance document ${tNum4} MUST NOT appear in Document In Hand before request & approval!`);
    }
    console.log("[PASS] Test 4: Zero-advance document without movement request is strictly hidden.\n");

    // =====================================================================
    // TEST 5: Route 2 - Zero Advance with Movement Request Pending (Must be HIDDEN)
    // =====================================================================
    console.log("--- TEST 5: Route 2 - Zero Advance with Movement Request Pending ---");
    const movAppReq = await createMovementApprovalRequest({
      ownerAdminId,
      registrationId: reg4.id,
      performedBy: "Test User",
      requestedByUserId: userId,
      remarks: "Urgent processing requested by client without advance payment",
    });

    if (!movAppReq || movAppReq.status !== "Pending") {
      throw new Error("FAIL Test 5: createMovementApprovalRequest failed or status is not Pending!");
    }

    const inHand5 = await listDocumentInHand({ ownerAdminId, officeId: officeA.id });
    const isDoc5InHand = inHand5.some((d: any) => d.trackingNumber === tNum4);

    if (isDoc5InHand) {
      throw new Error(`FAIL Test 5: Document ${tNum4} with pending movement approval MUST NOT appear in Document In Hand!`);
    }
    console.log("[PASS] Test 5: Zero-advance document with pending Movement Approval remains hidden.\n");

    // =====================================================================
    // TEST 6: Route 2 - Zero Advance Movement Approved (Must become VISIBLE)
    // =====================================================================
    console.log("--- TEST 6: Route 2 - Zero Advance Movement Approved ---");
    await approveMovementApproval({
      id: movAppReq.id,
      ownerAdminId,
      approvedByUserId: userId,
      approvedByName: "Admin Approver",
      remarks: "Movement approved by BM",
    });

    const inHand6 = await listDocumentInHand({ ownerAdminId, officeId: officeA.id });
    const doc6InHand = inHand6.find((d: any) => d.trackingNumber === tNum4);

    if (!doc6InHand || !doc6InHand.canTransfer) {
      throw new Error(`FAIL Test 6: Document ${tNum4} MUST appear in Document In Hand after Movement Approval!`);
    }
    console.log(`[PASS] Test 6: Approved zero-advance document is now visible in Document In Hand (canTransfer=${doc6InHand.canTransfer}).\n`);

    // =====================================================================
    // TEST 7: Route 2 - Zero Advance Movement Rejected (Must remain HIDDEN)
    // =====================================================================
    console.log("--- TEST 7: Route 2 - Zero Advance Movement Rejected ---");
    const tNum7 = `T-R2-REJ-${testSuffix}`;
    const reg7 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum7,
        customerName: "Route 2 Reject Customer",
        documentName: "Medical Certificate",
        documentType: "Personal",
        processType: "Embassy Attestation",
        totalCharges: 2500,
        advancePaid: 0,
        requestedAdvanceAmount: 0,
      },
      officeA.officeName,
      "Test User",
      userId
    );
    createdRegIds.push(reg7.id);

    const movAppReq7 = await createMovementApprovalRequest({
      ownerAdminId,
      registrationId: reg7.id,
      performedBy: "Test User",
      requestedByUserId: userId,
      remarks: "Requesting waiver",
    });

    await rejectMovementApproval({
      id: movAppReq7!.id,
      ownerAdminId,
      rejectedByUserId: userId,
      rejectedByName: "Admin Rejector",
      rejectionReason: "No advance waiver allowed for this process",
    });

    const inHand7 = await listDocumentInHand({ ownerAdminId, officeId: officeA.id });
    const isDoc7InHand = inHand7.some((d: any) => d.trackingNumber === tNum7);

    if (isDoc7InHand) {
      throw new Error(`FAIL Test 7: Rejected movement document ${tNum7} MUST NOT appear in Document In Hand!`);
    }
    console.log("[PASS] Test 7: Rejected movement document remains strictly hidden.\n");

    // =====================================================================
    // TEST 8: Transferred / Received Document from Inbound Bundle
    // =====================================================================
    console.log("--- TEST 8: Transferred & Received Document Preservation ---");
    // Transfer approved document 1 from Office A to Office B
    const bundleRes = await createTransferBundle({
      trackingNumbers: [tNum1],
      fromOfficeId: officeA.id,
      toOfficeId: officeB.id,
      userId,
      ownerAdminId,
      remarks: "Transferring approved document to Office B",
    });

    // Receive bundle at Office B
    await receiveBundle({
      bundleId: bundleRes.id,
      receivedTrackingNumbers: [tNum1],
      userId,
      ownerAdminId,
      remarks: "Received at Office B",
    });

    const inHand8B = await listDocumentInHand({ ownerAdminId, officeId: officeB.id });
    const doc8B = inHand8B.find((d: any) => d.trackingNumber === tNum1);

    if (!doc8B) {
      throw new Error(`FAIL Test 8: Transferred and received document ${tNum1} MUST appear in Office B Document In Hand!`);
    }

    if (doc8B.inHandCategory !== "RECEIVED") {
      throw new Error(`FAIL Test 8: Transferred document ${tNum1} should have category 'RECEIVED', got '${doc8B.inHandCategory}'!`);
    }
    console.log(`[PASS] Test 8: Transferred document correctly visible in Office B In Hand under category '${doc8B.inHandCategory}'.\n`);

    console.log("=================================================================");
    console.log("ALL 8 AUTOMATED TESTS PASSED SUCCESSFULLY (100% PASS RATE)");
    console.log("=================================================================");
  } finally {
    // Cleanup temporary test offices and test registrations
    console.log("\nCleaning up test artifacts...");
    try {
      for (const id of createdRegIds) {
        await prisma.auditTrail.deleteMany({ where: { registrationId: id } });
        await prisma.movementHistory.deleteMany({ where: { trackingNumber: { contains: testSuffix } } });
        await prisma.bundleItem.deleteMany({ where: { trackingNumber: { contains: testSuffix } } });
        await prisma.documentMovement.deleteMany({ where: { trackingNumber: { contains: testSuffix } } });
        await prisma.movementApproval.deleteMany({ where: { registrationId: id } });
        await prisma.advancePaymentAuditLog.deleteMany({ where: { registrationId: id } });
        await prisma.advancePaymentApproval.deleteMany({ where: { registrationId: id } });
        await prisma.accountStatementEntry.deleteMany({ where: { registrationId: id } });
        await prisma.registration.delete({ where: { id } }).catch(() => null);
      }
      await prisma.bundle.deleteMany({ where: { fromOfficeId: officeA.id } });
      await prisma.bundle.deleteMany({ where: { toOfficeId: officeB.id } });
      await prisma.officeLocation.delete({ where: { id: officeA.id } }).catch(() => null);
      await prisma.officeLocation.delete({ where: { id: officeB.id } }).catch(() => null);
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
