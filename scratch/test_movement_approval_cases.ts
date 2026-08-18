import { prisma } from "../src/lib/prisma";
import { createRegistration, deleteRegistration } from "../src/features/registration/server/registration.service";
import { listPendingMovementApprovals, approveMovementApproval } from "../src/features/document-movement/server/movement-approval.service";
import { listDocumentInHand, createTransferBundle, receiveBundle } from "../src/features/home/server/bundle-workflow.service";

async function runTests() {
  console.log("=================================================");
  console.log("STARTING OFFICE-SPECIFIC MOVEMENT APPROVAL TESTS");
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

  const trackingKochi = `TEST-KOCHI-${Date.now()}`;
  const trackingMlp = `TEST-MLP-${Date.now()}`;

  try {
    // ---------------------------------------------------------
    // TEST CASE 1: Kochi HQ user creates zero-advance doc at Kochi HQ
    // ---------------------------------------------------------
    console.log("--- TEST 1: Zero-advance doc created at Kochi HQ ---");
    const regKochi = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: trackingKochi,
        customerName: "Kochi Customer",
        mobile: "9876543210",
        documentName: "Degree Certificate",
        documentType: "Educational",
        processType: "UAE Embassy With MOFA",
        totalCharges: 5000,
        advancePaid: 0,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Kochi User",
      userId
    );
    console.log(`Created registration ${regKochi.trackingNumber} at Kochi HQ.`);

    // Check Kochi HQ Pending Approval queue
    const kochiApprovals = await listPendingMovementApprovals({
      ownerAdminId,
      officeId: officeKochi.id,
      officeName: officeKochi.officeName,
    });
    const foundInKochi = kochiApprovals.find((item: any) => item.trackingNumber === trackingKochi);

    if (!foundInKochi) {
      throw new Error(`FAIL Test 1: Kochi document ${trackingKochi} should be visible to Kochi HQ user!`);
    }
    console.log(`SUCCESS Test 1: Kochi document ${trackingKochi} correctly visible in Kochi HQ Pending Approval queue.\n`);

    // ---------------------------------------------------------
    // TEST CASE 2: Malappuram zero-advance doc should NOT appear for Kochi HQ user
    // ---------------------------------------------------------
    console.log("--- TEST 2: Malappuram doc created; verify hidden for Kochi HQ user ---");
    const regMlp = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: trackingMlp,
        customerName: "Malappuram Customer",
        mobile: "9876543211",
        documentName: "Diploma Certificate",
        documentType: "Educational",
        processType: "UAE Embassy",
        totalCharges: 5000,
        advancePaid: 0,
        approvalStatus: "Approved",
      },
      officeMalappuram.officeName,
      "Malappuram User",
      userId
    );
    console.log(`Created registration ${regMlp.trackingNumber} at Malappuram.`);

    // Check Kochi HQ Pending Approval queue again
    const kochiApprovals2 = await listPendingMovementApprovals({
      ownerAdminId,
      officeId: officeKochi.id,
      officeName: officeKochi.officeName,
    });
    const mlpDocInKochi = kochiApprovals2.find((item: any) => item.trackingNumber === trackingMlp);

    if (mlpDocInKochi) {
      throw new Error(`FAIL Test 2: Malappuram document ${trackingMlp} should NOT be visible to Kochi HQ user!`);
    }

    // Check Malappuram Pending Approval queue
    const mlpApprovals = await listPendingMovementApprovals({
      ownerAdminId,
      officeId: officeMalappuram.id,
      officeName: officeMalappuram.officeName,
    });
    const foundInMlp = mlpApprovals.find((item: any) => item.trackingNumber === trackingMlp);

    if (!foundInMlp) {
      throw new Error(`FAIL Test 2: Malappuram document ${trackingMlp} should be visible to Malappuram user!`);
    }
    console.log(`SUCCESS Test 2: Malappuram document is correctly HIDDEN from Kochi HQ user and VISIBLE to Malappuram user.\n`);

    // ---------------------------------------------------------
    // TEST CASE 3: Approve Kochi HQ movement approval
    // ---------------------------------------------------------
    console.log("--- TEST 3: Approve Kochi HQ movement approval ---");
    await approveMovementApproval({
      id: foundInKochi.id,
      ownerAdminId,
      approvedByUserId: userId,
      approvedByName: "Kochi Admin",
      remarks: "Approved for transfer",
    });
    console.log(`Approved movement for ${trackingKochi}`);

    const homeDocsAfterApprove = await listDocumentInHand({ ownerAdminId, officeId: officeKochi.id });
    const kochiHomeDoc = homeDocsAfterApprove.find((d: any) => d.trackingNumber === trackingKochi);
    const canMoveAfterApprove = Number(kochiHomeDoc?.advancePaid ?? 0) > 0 || Boolean(kochiHomeDoc?.movementApproved);

    if (!canMoveAfterApprove) {
      throw new Error(`FAIL Test 3: Checkbox should be ENABLED after approval for ${trackingKochi}`);
    }
    console.log(`SUCCESS Test 3: Checkbox enabled for ${trackingKochi} after approval.\n`);

    // ---------------------------------------------------------
    // TEST CASE 4: Transfer document to another office (Kochi -> Malappuram)
    // ---------------------------------------------------------
    console.log("--- TEST 4: Transfer document to Malappuram ---");
    const bundle = await createTransferBundle({
      trackingNumbers: [trackingKochi],
      fromOfficeId: officeKochi.id,
      toOfficeId: officeMalappuram.id,
      userId,
      userName: "Kochi Admin",
      ownerAdminId,
      remarks: "Transferring to Malappuram",
    });
    console.log(`Created Bundle ${bundle.bundleNumber}`);

    // Brief pause to allow previous write transaction connection release
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Receive bundle at Malappuram
    await receiveBundle({
      bundleId: bundle.id,
      receivedTrackingNumbers: [trackingKochi],
      userId,
      userName: "Malappuram Admin",
      ownerAdminId,
    });
    console.log(`Received document ${trackingKochi} at Malappuram.`);

    // Verify current office of document is now Malappuram
    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: trackingKochi },
      orderBy: { performedAt: "asc" },
    });

    console.log("Movement History Log for " + trackingKochi + ":");
    history.forEach((h, idx) => {
      console.log(`  ${idx + 1}. Action: "${h.action}" | PerformedBy: "${h.performedBy}" | OldOffice: "${h.oldOffice || ""}" | NewOffice: "${h.newOffice || ""}"`);
    });

    const lastHistory = history[history.length - 1];
    if (!lastHistory || lastHistory.newOffice !== officeMalappuram.officeName) {
      throw new Error(`FAIL Test 4: Current office should be Malappuram after bundle receive.`);
    }
    console.log(`SUCCESS Test 4: Document current location updated to ${officeMalappuram.officeName} with complete history.\n`);

    console.log("=================================================");
    console.log("ALL 4 OFFICE-SPECIFIC TEST CASES PASSED!");
    console.log("=================================================");
  } finally {
    console.log("\nCleaning up test data...");
    await prisma.movementApproval.deleteMany({
      where: { trackingNumber: { in: [trackingKochi, trackingMlp] } },
    });
    await prisma.movementHistory.deleteMany({
      where: { trackingNumber: { in: [trackingKochi, trackingMlp] } },
    });
    await prisma.bundleItem.deleteMany({
      where: { trackingNumber: { in: [trackingKochi, trackingMlp] } },
    });
    await prisma.documentMovement.deleteMany({
      where: { trackingNumber: { in: [trackingKochi, trackingMlp] } },
    });
    await prisma.bundle.deleteMany({
      where: { bundleNumber: { contains: "HOME-" }, createdBy: "Kochi Admin" },
    });
    await deleteRegistration(ownerAdminId, (await prisma.registration.findUnique({ where: { trackingNumber: trackingKochi } }))?.id || "").catch(() => {});
    await deleteRegistration(ownerAdminId, (await prisma.registration.findUnique({ where: { trackingNumber: trackingMlp } }))?.id || "").catch(() => {});
    console.log("Cleanup finished.");
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
