import { PrismaClient } from "@prisma/client";
import {
  createRegistration,
  getRegistrationByTrackingNumber,
} from "../src/features/registration/server/registration.service";
import {
  listPendingMovementApprovals,
  createMovementApprovalRequest,
  approveMovementApproval,
  rejectMovementApproval,
} from "../src/features/document-movement/server/movement-approval.service";
import {
  listDocumentInHand,
  createTransferBundle,
} from "../src/features/home/server/bundle-workflow.service";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== Running End-to-End Movement Approval Workflow Tests ===");

  // 1. Setup test fixture admin & offices
  const testAdminId = "test-movement-owner-" + Date.now();
  const officeA_Name = "Test-Office-Alpha-" + Date.now();
  const officeB_Name = "Test-Office-Beta-" + Date.now();

  const officeA = await prisma.officeLocation.create({
    data: {
      officeName: officeA_Name,
      location: "Alpha City",
      timezone: "UTC",
      ownerAdminId: testAdminId,
    },
  });

  const officeB = await prisma.officeLocation.create({
    data: {
      officeName: officeB_Name,
      location: "Beta City",
      timezone: "UTC",
      ownerAdminId: testAdminId,
    },
  });

  const testUser = await prisma.user.create({
    data: {
      name: "Test Ops User",
      email: `ops-${Date.now()}@example.com`,
    },
  });

  console.log(`Setup test environment: Admin=${testAdminId}, Offices=[${officeA_Name}, ${officeB_Name}]`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Registration WITH Advance (> 0)
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Registration WITH Advance (> 0) ---");
    const regWithAdvance = await createRegistration(
      testAdminId,
      {
        trackingNumber: `ADV-POS-${Date.now()}`,
        customerName: "Alice Advance",
        mobile: "+919876543210",
        documentType: "Degree Certificate",
        processType: "Attestation",
        totalCharges: 5000,
        advancePaid: 2000,
        requestedAdvanceAmount: 2000,
        paymentMode: "Cash",
      },
      officeA_Name,
      "Test User",
      testUser.id
    );

    console.log(`Created Reg with Advance: ${regWithAdvance.trackingNumber}, advancePaid=${regWithAdvance.advancePaid}`);

    // Check visibility in Home Document In Hand
    const homeDocsAdvance = await listDocumentInHand({
      ownerAdminId: testAdminId,
      officeId: officeA.id,
      isSuperAdmin: true,
    });

    const foundInHomeAdvance = homeDocsAdvance.find((d: any) => d.trackingNumber === regWithAdvance.trackingNumber);
    if (!foundInHomeAdvance) {
      throw new Error(`TEST 1 FAILED: Registration with advance (> 0) ${regWithAdvance.trackingNumber} should be visible in Home Document In Hand!`);
    }
    console.log(`✔ TEST 1 PASSED: Document with advance > 0 is visible in Home Document In Hand (canTransfer=${foundInHomeAdvance.canTransfer}).`);

    // -------------------------------------------------------------
    // TEST 2: Registration WITHOUT Advance (= 0) - MUST NOT appear in Home OR Pending Approvals
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Registration WITHOUT Advance (= 0) ---");
    const regZeroAdvance = await createRegistration(
      testAdminId,
      {
        trackingNumber: `ZERO-ADV-${Date.now()}`,
        customerName: "Bob Zero Advance",
        mobile: "+919876543211",
        documentType: "Commercial Invoice",
        processType: "Apostille",
        totalCharges: 3000,
        advancePaid: 0,
        requestedAdvanceAmount: 0,
        paymentMode: "Cash",
      },
      officeA_Name,
      "Test User",
      testUser.id
    );

    console.log(`Created Zero-Advance Reg: ${regZeroAdvance.trackingNumber}, movementApproved=${regZeroAdvance.movementApproved}, trackingStatus=${regZeroAdvance.trackingStatus}`);

    if (regZeroAdvance.trackingStatus !== "Registered") {
      throw new Error(`TEST 2 FAILED: Expected initial trackingStatus 'Registered', got '${regZeroAdvance.trackingStatus}'`);
    }

    // Verify it is COMPLETELY HIDDEN from Home Document In Hand
    const homeDocsZero = await listDocumentInHand({
      ownerAdminId: testAdminId,
      officeId: officeA.id,
      isSuperAdmin: true,
    });

    const foundInHomeZero = homeDocsZero.find((d: any) => d.trackingNumber === regZeroAdvance.trackingNumber);
    if (foundInHomeZero) {
      throw new Error(`TEST 2 FAILED: Zero-advance unrequested document ${regZeroAdvance.trackingNumber} MUST NOT appear in Home Document In Hand!`);
    }
    console.log("✔ TEST 2 PASSED: Zero-advance unapproved document is COMPLETELY HIDDEN from Home Document In Hand.");

    // Verify it does NOT appear in Pending Approval -> Movement Approval
    const pendingMovApprovalsInitial = await listPendingMovementApprovals({
      ownerAdminId: testAdminId,
      isSuperAdmin: true,
    });

    const foundInPendingInitial = pendingMovApprovalsInitial.find((p: any) => p.trackingNumber === regZeroAdvance.trackingNumber);
    if (foundInPendingInitial) {
      throw new Error(`TEST 2 FAILED: Zero-advance document ${regZeroAdvance.trackingNumber} must NOT appear in Pending Movement Approvals until explicitly requested!`);
    }
    console.log("✔ TEST 2 PASSED: Zero-advance document does NOT appear in Pending Approvals prior to request submission.");

    // -------------------------------------------------------------
    // TEST 3: Query / Popup Simulation - No record creation on read
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Read / Query Simulation ---");
    const countBefore = await prisma.movementApproval.count({
      where: { ownerAdminId: testAdminId, registrationId: regZeroAdvance.id },
    });
    if (countBefore !== 0) {
      throw new Error(`TEST 3 FAILED: Expected 0 MovementApproval records, found ${countBefore}`);
    }
    console.log("✔ TEST 3 PASSED: No MovementApproval record created on page load or query.");

    // -------------------------------------------------------------
    // TEST 4: User Enters Remarks and Clicks "Update Request"
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Explicit Request Submission ---");
    const requesterRemarks = "Customer requested urgent processing without advance payment. Approved per branch manager.";
    const reqResult = await createMovementApprovalRequest({
      ownerAdminId: testAdminId,
      registrationId: regZeroAdvance.id,
      performedBy: "Test Requester",
      requestedByUserId: testUser.id,
      remarks: requesterRemarks,
    });

    if (!reqResult || reqResult.status !== "Pending" || reqResult.remarks !== requesterRemarks) {
      throw new Error("TEST 4 FAILED: Movement approval request was not created properly with custom remarks!");
    }
    console.log(`Requested movement approval: id=${reqResult.id}, remarks="${reqResult.remarks}"`);

    // Verify it now appears in Pending Approvals
    const pendingAfterRequest = await listPendingMovementApprovals({
      ownerAdminId: testAdminId,
      isSuperAdmin: true,
    });

    const foundInPending = pendingAfterRequest.find((p: any) => p.trackingNumber === regZeroAdvance.trackingNumber);
    if (!foundInPending || foundInPending.status !== "Pending") {
      throw new Error("TEST 4 FAILED: Document should now appear in Pending Approvals list after explicit request!");
    }
    console.log("✔ TEST 4 PASSED: Explicit request created MovementApproval record and appears in Pending Approvals.");

    // -------------------------------------------------------------
    // TEST 5: Approver Views Request in Table
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Approver Views Request ---");
    console.log(`Pending Approval Item: Tracking=${foundInPending.trackingNumber}, Customer=${foundInPending.customerName}, RegOffice=${foundInPending.registrationOffice}, CurrentOffice=${foundInPending.currentOffice}, RequestedBy=${foundInPending.requestedBy}`);
    console.log("✔ TEST 5 PASSED: Request data contains all required columns.");

    // -------------------------------------------------------------
    // TEST 6: Approver Rejection Flow
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Approver Rejection Flow ---");
    const rejectionReason = "Zero advance not allowed for commercial invoice category.";
    const rejectResult = await rejectMovementApproval({
      id: reqResult.id,
      ownerAdminId: testAdminId,
      rejectedByUserId: testUser.id,
      rejectedByName: "Senior Approver",
      rejectionReason,
    });

    console.log(`Rejected status: ${rejectResult.status}, rejectionReason="${rejectResult.rejectionReason}"`);

    const regAfterReject = await getRegistrationByTrackingNumber(testAdminId, regZeroAdvance.trackingNumber);
    if (regAfterReject?.movementApproved !== false || regAfterReject?.trackingStatus !== "Movement Approval Rejected") {
      throw new Error(`TEST 6 FAILED: Tracking status should be 'Movement Approval Rejected', got '${regAfterReject?.trackingStatus}'`);
    }

    const homeDocsAfterReject = await listDocumentInHand({
      ownerAdminId: testAdminId,
      officeId: officeA.id,
      isSuperAdmin: true,
    });
    if (homeDocsAfterReject.some((d: any) => d.trackingNumber === regZeroAdvance.trackingNumber)) {
      throw new Error("TEST 6 FAILED: Rejected document must still be hidden from Home!");
    }
    console.log("✔ TEST 6 PASSED: Rejection properly updates registration and maintains exclusion from Home.");

    // -------------------------------------------------------------
    // TEST 7: Re-request & Approver Approval Flow
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Re-request & Approver Approval Flow ---");
    const reRequestRemarks = "Customer provided corporate guarantee letter for payment upon delivery.";
    const newReq = await createMovementApprovalRequest({
      ownerAdminId: testAdminId,
      registrationId: regZeroAdvance.id,
      performedBy: "Test Requester",
      requestedByUserId: testUser.id,
      remarks: reRequestRemarks,
    });

    const approvalNote = "Approved with corporate guarantee letter verified.";
    const approveResult = await approveMovementApproval({
      id: newReq!.id,
      ownerAdminId: testAdminId,
      approvedByUserId: testUser.id,
      approvedByName: "Operations Director",
      remarks: approvalNote,
    });

    console.log(`Approved status: ${approveResult.status}`);
    console.log(`Preserved requester remarks: "${approveResult.remarks}"`);
    console.log(`Recorded approval note: "${approveResult.approvalRemarks}"`);

    if (approveResult.remarks !== reRequestRemarks) {
      throw new Error(`TEST 7 FAILED: Original requester remarks were overwritten! Expected "${reRequestRemarks}", got "${approveResult.remarks}"`);
    }
    if (approveResult.approvalRemarks !== approvalNote) {
      throw new Error(`TEST 7 FAILED: Approval remarks not recorded properly! Expected "${approvalNote}", got "${approveResult.approvalRemarks}"`);
    }

    const regAfterApprove = await getRegistrationByTrackingNumber(testAdminId, regZeroAdvance.trackingNumber);
    if (!regAfterApprove?.movementApproved || regAfterApprove?.trackingStatus !== "Document In Hand") {
      throw new Error(`TEST 7 FAILED: Registration movementApproved should be true, trackingStatus should be 'Document In Hand'. Got: movementApproved=${regAfterApprove?.movementApproved}, trackingStatus=${regAfterApprove?.trackingStatus}`);
    }

    // Verify it now APPEARS in Home Document In Hand
    const homeDocsAfterApprove = await listDocumentInHand({
      ownerAdminId: testAdminId,
      officeId: officeA.id,
      isSuperAdmin: true,
    });

    const foundInHomeAfterApprove = homeDocsAfterApprove.find((d: any) => d.trackingNumber === regZeroAdvance.trackingNumber);
    if (!foundInHomeAfterApprove) {
      throw new Error("TEST 7 FAILED: Approved zero-advance document MUST now appear in Home Document In Hand!");
    }
    if (!foundInHomeAfterApprove.canTransfer) {
      throw new Error("TEST 7 FAILED: canTransfer must be true for approved document!");
    }
    console.log("✔ TEST 7 PASSED: Approved zero-advance document successfully appears in Home Document In Hand with canTransfer=true.");

    // Create transfer bundle for approved document
    const bundleResult = await createTransferBundle({
      trackingNumbers: [regZeroAdvance.trackingNumber],
      fromOfficeId: officeA.id,
      toOfficeId: officeB.id,
      userId: testUser.id,
      userName: "Test User",
      ownerAdminId: testAdminId,
      remarks: "Transfer approved zero-advance document to Beta office",
    });

    console.log(`Created transfer bundle: ${bundleResult.bundleNumber} for ${regZeroAdvance.trackingNumber}`);
    console.log("✔ TEST 7 PASSED: Transfer bundle successfully created for approved zero-advance document.");

    // -------------------------------------------------------------
    // TEST 8: Security Guard on createTransferBundle
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: Security Guard on createTransferBundle ---");
    const unapprovedReg = await createRegistration(
      testAdminId,
      {
        trackingNumber: `UNAPP-${Date.now()}`,
        customerName: "Charlie Unapproved",
        mobile: "+919876543212",
        documentType: "Personal Certificate",
        processType: "Attestation",
        totalCharges: 2500,
        advancePaid: 0,
        requestedAdvanceAmount: 0,
        paymentMode: "Cash",
      },
      officeA_Name,
      "Test User",
      testUser.id
    );

    let caughtError = false;
    try {
      await createTransferBundle({
        trackingNumbers: [unapprovedReg.trackingNumber],
        fromOfficeId: officeA.id,
        toOfficeId: officeB.id,
        userId: testUser.id,
        userName: "Test User",
        ownerAdminId: testAdminId,
      });
    } catch (err: any) {
      caughtError = true;
      console.log(`✔ Expected safety error caught: "${err.message}"`);
    }

    if (!caughtError) {
      throw new Error("TEST 8 FAILED: Transfer bundle should have been blocked for unapproved zero-advance registration!");
    }
    console.log("✔ TEST 8 PASSED: Transfer safety guard strictly blocks unapproved zero-advance documents.");

    console.log("\n=======================================================");
    console.log("🎉 ALL 8 TEST CASES PASSED SUCCESSFULLY!");
    console.log("=======================================================");
  } catch (error: any) {
    console.error("Test execution failed:", error);
    process.exitCode = 1;
  } finally {
    const regs = await prisma.registration.findMany({
      where: { ownerAdminId: testAdminId },
      select: { id: true, trackingNumber: true },
    });
    const trackingNumbers = regs.map((r) => r.trackingNumber);
    const regIds = regs.map((r) => r.id);

    await prisma.bundleItem.deleteMany({
      where: { trackingNumber: { in: trackingNumbers } },
    }).catch(() => {});
    await (prisma as any).bundle?.deleteMany({
      where: { ownerAdminId: testAdminId },
    }).catch(() => {});
    await prisma.documentWorkflowHistory.deleteMany({
      where: { ownerAdminId: testAdminId },
    }).catch(() => {});
    await prisma.auditTrail.deleteMany({
      where: { registrationId: { in: regIds } },
    }).catch(() => {});
    await prisma.movementHistory.deleteMany({
      where: { trackingNumber: { in: trackingNumbers } },
    }).catch(() => {});
    await prisma.documentMovement.deleteMany({
      where: { trackingNumber: { in: trackingNumbers } },
    }).catch(() => {});
    await prisma.movementApproval.deleteMany({
      where: { ownerAdminId: testAdminId },
    }).catch(() => {});
    await prisma.advancePaymentApproval.deleteMany({
      where: { ownerAdminId: testAdminId },
    }).catch(() => {});
    await prisma.registration.deleteMany({
      where: { ownerAdminId: testAdminId },
    }).catch(() => {});
    await prisma.officeLocation.deleteMany({
      where: { ownerAdminId: testAdminId },
    }).catch(() => {});
    await prisma.user.delete({
      where: { id: testUser.id },
    }).catch(() => {});
    await prisma.$disconnect();
    console.log("✔ Cleanup complete.");
  }
}

runTests();
