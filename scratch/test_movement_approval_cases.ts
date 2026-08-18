import { prisma } from "../src/lib/prisma";
import { createRegistration, deleteRegistration } from "../src/features/registration/server/registration.service";
import { listPendingMovementApprovals, approveMovementApproval } from "../src/features/document-movement/server/movement-approval.service";
import { listDocumentInHand, createTransferBundle } from "../src/features/home/server/bundle-workflow.service";

async function runTests() {
  console.log("=================================================");
  console.log("STARTING MOVEMENT APPROVAL WORKFLOW VERIFICATION");
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

  let office = await prisma.officeLocation.findFirst({
    where: { ownerAdminId },
  });

  if (!office) {
    office = await prisma.officeLocation.create({
      data: {
        officeName: "Kochi HQ",
        location: "Kochi",
        timezone: "Asia/Kolkata",
        ownerAdminId,
      },
    });
  }

  let destOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, NOT: { id: office.id } },
  });

  if (!destOffice) {
    destOffice = await prisma.officeLocation.create({
      data: {
        officeName: "Dubai HQ",
        location: "Dubai",
        timezone: "Asia/Dubai",
        ownerAdminId,
      },
    });
  }

  const trackingZero = `TEST-ZERO-${Date.now()}`;
  const trackingPaid = `TEST-PAID-${Date.now()}`;

  try {
    // ---------------------------------------------------------
    // TEST CASE 1: Create document with Advance Amount = 0
    // ---------------------------------------------------------
    console.log("--- TEST 1: Create document with Advance Amount = 0 ---");
    const regZero = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: trackingZero,
        customerName: "Test Zero Customer",
        mobile: "9876543210",
        documentName: "Degree Certificate",
        documentType: "Educational",
        processType: "UAE Embassy With MOFA",
        totalCharges: 5000,
        advancePaid: 0,
        approvalStatus: "Approved",
      },
      office.officeName,
      "Test Runner",
      userId
    );
    console.log(`Created registration ${regZero.trackingNumber} with advancePaid = 0`);

    // Check Home Documents in Hand logic
    const homeDocsBefore = await listDocumentInHand({ ownerAdminId, officeId: office.id });
    const foundInHomeBefore = homeDocsBefore.find((d: any) => d.trackingNumber === trackingZero);
    const advanceZero = Number(foundInHomeBefore?.advancePaid ?? 0);
    const approvedZeroBefore = Boolean(foundInHomeBefore?.movementApproved);
    const canMoveZeroBefore = advanceZero > 0 || approvedZeroBefore;

    console.log(`Home Document In Hand check for ${trackingZero}:`);
    console.log(` - advancePaid: ${advanceZero}`);
    console.log(` - movementApproved: ${approvedZeroBefore}`);
    console.log(` - canMove (Checkbox enabled?): ${canMoveZeroBefore}`);

    if (canMoveZeroBefore) {
      throw new Error(`FAIL Test 1: Checkbox should be disabled when advancePaid=0 and movementApproved=false`);
    }

    // Check Pending Approval list
    const pendingApprovalsBefore = await listPendingMovementApprovals(ownerAdminId);
    const approvalReq = pendingApprovalsBefore.find((item: any) => item.trackingNumber === trackingZero);

    if (!approvalReq) {
      throw new Error(`FAIL Test 1: Document ${trackingZero} not found in Pending Approval -> Movement Approval queue!`);
    }
    console.log(`SUCCESS Test 1: Document ${trackingZero} correctly visible in Pending Approval with ID ${approvalReq.id}`);
    console.log(`Approval details: Customer: ${approvalReq.customerName}, Office: ${approvalReq.registrationOffice}, RequestedBy: ${approvalReq.requestedBy}\n`);

    // ---------------------------------------------------------
    // TEST CASE 2: Approve movement
    // ---------------------------------------------------------
    console.log("--- TEST 2: Approve Movement Approval Request ---");
    await approveMovementApproval({
      id: approvalReq.id,
      ownerAdminId,
      approvedByUserId: userId,
      approvedByName: "Test Admin",
      remarks: "Approved by automated test runner",
    });
    console.log(`Approved MovementApproval ID ${approvalReq.id}`);

    // Verify Pending Approval list is cleared for this tracking number
    const pendingApprovalsAfter = await listPendingMovementApprovals(ownerAdminId);
    const stillPending = pendingApprovalsAfter.find((item: any) => item.trackingNumber === trackingZero);
    if (stillPending) {
      throw new Error(`FAIL Test 2: Document ${trackingZero} is still in pending list after approval!`);
    }

    // Verify Home Document state
    const homeDocsAfter = await listDocumentInHand({ ownerAdminId, officeId: office.id });
    const foundInHomeAfter = homeDocsAfter.find((d: any) => d.trackingNumber === trackingZero);
    const approvedZeroAfter = Boolean(foundInHomeAfter?.movementApproved);
    const canMoveZeroAfter = Number(foundInHomeAfter?.advancePaid ?? 0) > 0 || approvedZeroAfter;

    console.log(`Home Document In Hand check after approval:`);
    console.log(` - movementApproved: ${approvedZeroAfter}`);
    console.log(` - canMove (Checkbox enabled?): ${canMoveZeroAfter}`);

    if (!canMoveZeroAfter) {
      throw new Error(`FAIL Test 2: Checkbox should be ENABLED after approval!`);
    }
    console.log(`SUCCESS Test 2: Movement approved successfully and Home checkbox enabled.\n`);

    // ---------------------------------------------------------
    // TEST CASE 3: Transfer document after approval
    // ---------------------------------------------------------
    console.log("--- TEST 3: Transfer Document After Approval ---");
    const bundleZero = await createTransferBundle({
      trackingNumbers: [trackingZero],
      fromOfficeId: office.id,
      toOfficeId: destOffice.id,
      userId,
      userName: "Test Admin",
      ownerAdminId,
      remarks: "Transfer test bundle",
    });
    console.log(`Successfully created Bundle ${bundleZero.bundleNumber}`);

    const historyZero = await prisma.movementHistory.findMany({
      where: { trackingNumber: trackingZero },
      orderBy: { performedAt: "asc" },
    });

    console.log("Movement History Timeline:");
    historyZero.forEach((h, idx) => {
      console.log(`  ${idx + 1}. Action: "${h.action}" | PerformedBy: "${h.performedBy}" | Remarks: "${h.remarks || ""}"`);
    });

    const hasRequested = historyZero.some((h) => h.action.includes("Movement Approval Requested"));
    const hasApproved = historyZero.some((h) => h.action.includes("Movement Approved"));
    const hasTransferred = historyZero.some((h) => h.action.includes("Bundle Transfer") || h.action.includes("Transfer"));

    if (!hasRequested || !hasApproved || !hasTransferred) {
      throw new Error(`FAIL Test 3: Missing required movement history entries. History: ${JSON.stringify(historyZero)}`);
    }
    console.log(`SUCCESS Test 3: Document transferred into Bundle ${bundleZero.bundleNumber} with complete movement history.\n`);

    // ---------------------------------------------------------
    // TEST CASE 4: Create document with Advance Amount > 0
    // ---------------------------------------------------------
    console.log("--- TEST 4: Create Document with Advance Amount > 0 ---");
    const regPaid = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: trackingPaid,
        customerName: "Test Paid Customer",
        mobile: "9876543211",
        documentName: "Diploma Certificate",
        documentType: "Educational",
        processType: "UAE Embassy",
        totalCharges: 5000,
        advancePaid: 1000,
        approvalStatus: "Approved",
      },
      office.officeName,
      "Test Runner",
      userId
    );
    console.log(`Created registration ${regPaid.trackingNumber} with advancePaid = 1000`);

    const pendingApprovalsPaid = await listPendingMovementApprovals(ownerAdminId);
    const paidApprovalReq = pendingApprovalsPaid.find((item: any) => item.trackingNumber === trackingPaid);
    if (paidApprovalReq) {
      throw new Error(`FAIL Test 4: Document with advancePaid > 0 should NOT create a movement approval request!`);
    }

    const bundlePaid = await createTransferBundle({
      trackingNumbers: [trackingPaid],
      fromOfficeId: office.id,
      toOfficeId: destOffice.id,
      userId,
      userName: "Test Admin",
      ownerAdminId,
      remarks: "Direct transfer test",
    });
    console.log(`Direct transfer succeeded. Bundle ${bundlePaid.bundleNumber} created.`);
    console.log(`SUCCESS Test 4: Advance Paid > 0 requires no approval and allows direct transfer.\n`);

    console.log("=================================================");
    console.log("ALL 4 TEST CASES PASSED SUCCESSFULLY!");
    console.log("=================================================");
  } finally {
    // Cleanup test records
    console.log("\nCleaning up test data...");
    await prisma.movementApproval.deleteMany({
      where: { trackingNumber: { in: [trackingZero, trackingPaid] } },
    });
    await prisma.movementHistory.deleteMany({
      where: { trackingNumber: { in: [trackingZero, trackingPaid] } },
    });
    await prisma.bundleItem.deleteMany({
      where: { trackingNumber: { in: [trackingZero, trackingPaid] } },
    });
    await prisma.documentMovement.deleteMany({
      where: { trackingNumber: { in: [trackingZero, trackingPaid] } },
    });
    await prisma.bundle.deleteMany({
      where: { bundleNumber: { contains: "HOME-" }, createdBy: "Test Admin" },
    });
    await deleteRegistration(ownerAdminId, (await prisma.registration.findUnique({ where: { trackingNumber: trackingZero } }))?.id || "").catch(() => {});
    await deleteRegistration(ownerAdminId, (await prisma.registration.findUnique({ where: { trackingNumber: trackingPaid } }))?.id || "").catch(() => {});
    console.log("Cleanup finished.");
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
