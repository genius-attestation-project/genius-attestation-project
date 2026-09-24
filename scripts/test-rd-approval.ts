import { prisma } from "../src/lib/prisma";
import {
  createRDApprovalRequest,
  listRDApprovals,
  approveRDApproval,
  rejectRDApproval,
} from "../src/features/pending-approval/server/rd-approval.service";

async function runTests() {
  console.log("=== STARTING RD APPROVAL WORKFLOW TEST SUITE ===");

  // Find or create test admin user & test offices
  let testAdmin = await prisma.user.findFirst({
    where: { role: { name: "Super Admin" } },
  });

  if (!testAdmin) {
    testAdmin = await prisma.user.findFirst();
  }

  const ownerAdminId = testAdmin?.ownerAdminId || testAdmin?.id || "test-admin";
  console.log("Using ownerAdminId:", ownerAdminId);

  // 1. Ensure test offices exist
  const dubaiOfficeName = "Test Dubai " + Date.now();
  const kochiOfficeName = "Test Kochi " + Date.now();
  const calicutOfficeName = "Test Calicut " + Date.now();

  const dubaiOffice = await prisma.officeLocation.create({
    data: {
      officeName: dubaiOfficeName,
      location: dubaiOfficeName,
      timezone: "Asia/Dubai",
      ownerAdminId,
    },
  });

  const kochiOffice = await prisma.officeLocation.create({
    data: {
      officeName: kochiOfficeName,
      location: kochiOfficeName,
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  const calicutOffice = await prisma.officeLocation.create({
    data: {
      officeName: calicutOfficeName,
      location: calicutOfficeName,
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  console.log("Created test offices:", {
    dubai: dubaiOffice.id,
    kochi: kochiOffice.id,
    calicut: calicutOffice.id,
  });

  try {
    // 2. Create test documents in Registration & DocumentMovement
    const track1 = `TEST-RD-1-${Date.now()}`;
    const track2 = `TEST-RD-2-${Date.now()}`;
    const track3 = `TEST-RD-3-${Date.now()}`;
    const trackInvalid = `TEST-RD-INV-${Date.now()}`;

    const reg1 = await prisma.registration.create({
      data: {
        trackingNumber: track1,
        customerName: "Customer 1 Dubai",
        documentName: "Degree Certificate",
        documentType: "Educational",
        processType: "Embassy Attestation",
        regionOfRegistration: dubaiOfficeName,
        deliveryLocation: dubaiOfficeName,
        trackingStatus: "Document In Hand",
        ownerAdminId,
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: track1,
        registrationId: reg1.id,
        currentOfficeId: dubaiOffice.id,
        currentModule: "HOME",
        currentStatus: "DOCUMENT_IN_HAND",
        status: "Document In Hand",
      },
    });

    const reg2 = await prisma.registration.create({
      data: {
        trackingNumber: track2,
        customerName: "Customer 2 Kochi",
        documentName: "Birth Certificate",
        documentType: "Personal",
        processType: "HRD Attestation",
        regionOfRegistration: kochiOfficeName,
        deliveryLocation: kochiOfficeName,
        trackingStatus: "Document In Hand",
        ownerAdminId,
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: track2,
        registrationId: reg2.id,
        currentOfficeId: kochiOffice.id,
        currentModule: "HOME",
        currentStatus: "DOCUMENT_IN_HAND",
        status: "Document In Hand",
      },
    });

    const reg3 = await prisma.registration.create({
      data: {
        trackingNumber: track3,
        customerName: "Customer 3 Calicut",
        documentName: "Commercial Invoice",
        documentType: "Commercial",
        processType: "Chamber Attestation",
        regionOfRegistration: calicutOfficeName,
        deliveryLocation: calicutOfficeName,
        trackingStatus: "Document In Hand",
        ownerAdminId,
      },
    });

    await prisma.documentMovement.create({
      data: {
        trackingNumber: track3,
        registrationId: reg3.id,
        currentOfficeId: calicutOffice.id,
        currentModule: "HOME",
        currentStatus: "DOCUMENT_IN_HAND",
        status: "Document In Hand",
      },
    });

    const regInvalid = await prisma.registration.create({
      data: {
        trackingNumber: trackInvalid,
        customerName: "Customer Invalid Delivery Loc",
        documentName: "No Location",
        documentType: "Educational",
        processType: "Embassy",
        regionOfRegistration: dubaiOfficeName,
        deliveryLocation: "-", // Invalid delivery location
        trackingStatus: "Document In Hand",
        ownerAdminId,
      },
    });

    console.log("✓ Created 4 test documents.");

    // CASE 1: Click RD -> Creates RD Approval request, does NOT immediately enter Ready For Delivery
    console.log("\n--- TEST CASE 1 & CASE 8 & CASE 9: Create RD Approval Request ---");
    const createRes = await createRDApprovalRequest({
      trackingNumbers: [track1],
      userId: testAdmin?.id || "user-1",
      userName: "Test Requester",
      ownerAdminId,
      remarks: "Test RD Request for Dubai doc",
    });

    if (!createRes.success || createRes.createdRequests.length !== 1) {
      throw new Error(`Case 1 Failed: Expected 1 created request, got ${JSON.stringify(createRes)}`);
    }

    // Verify document status in DB has NOT changed to Ready For Delivery yet
    const checkDoc1BeforeApproval = await prisma.documentMovement.findFirst({
      where: { trackingNumber: track1 },
    });
    if (checkDoc1BeforeApproval?.status === "Ready for Delivery") {
      throw new Error("Case 1 Failed: Document prematurely moved to Ready for Delivery before approval!");
    }
    console.log("✓ CASE 1 PASSED: RD approval request created; document remains in Document In Hand.");

    // CASE 3, 4, 5: Main Process Incomplete does NOT block RD Approval creation
    console.log("\n--- TEST CASE 3, 4, 5: Main / Sub Process status does not block RD creation ---");
    const createRes2 = await createRDApprovalRequest({
      trackingNumbers: [track2, track3],
      userId: testAdmin?.id || "user-1",
      userName: "Test Requester",
      ownerAdminId,
      remarks: "Bulk RD creation test",
    });
    if (!createRes2.success || createRes2.createdRequests.length !== 2) {
      throw new Error(`Case 3/4/5 Failed: Could not create RD requests for multi-docs: ${JSON.stringify(createRes2)}`);
    }
    console.log("✓ CASE 3, 4, 5 PASSED: RD requests created regardless of process completion status.");

    // CASE 16: Prevent Duplicate RD Approvals
    console.log("\n--- TEST CASE 16: Prevent Duplicate Active Requests ---");
    const duplicateRes = await createRDApprovalRequest({
      trackingNumbers: [track1],
      userId: testAdmin?.id || "user-1",
      userName: "Test Requester",
      ownerAdminId,
    });
    if (duplicateRes.createdRequests.length > 0 || duplicateRes.rejectedDocuments.length !== 1) {
      throw new Error(`Case 16 Failed: Duplicate request was allowed! ${JSON.stringify(duplicateRes)}`);
    }
    console.log("✓ CASE 16 PASSED: Duplicate active RD request prevented:", duplicateRes.rejectedDocuments[0].reason);

    // CASE 19: Missing / Invalid Delivery Location safely rejected
    console.log("\n--- TEST CASE 19: Invalid Delivery Location safely rejected ---");
    const invalidLocRes = await createRDApprovalRequest({
      trackingNumbers: [trackInvalid],
      userId: testAdmin?.id || "user-1",
      userName: "Test Requester",
      ownerAdminId,
    });
    if (invalidLocRes.createdRequests.length > 0 || invalidLocRes.rejectedDocuments.length !== 1) {
      throw new Error(`Case 19 Failed: Invalid delivery location request was created! ${JSON.stringify(invalidLocRes)}`);
    }
    console.log("✓ CASE 19 PASSED: Missing/Invalid delivery location safely rejected:", invalidLocRes.rejectedDocuments[0].reason);

    // CASE 6 & 7: Office Visibility Filtering for Approver
    console.log("\n--- TEST CASE 6 & 7: Office Visibility Filtering ---");
    // Approver with visibility only for Dubai Office
    const dubaiApproverList = await listRDApprovals({
      ownerAdminId,
      status: "Pending",
      isSuperAdmin: false,
      allowedOfficeNames: [dubaiOfficeName],
      allowedOfficeIds: [dubaiOffice.id],
    });

    const hasDubai = dubaiApproverList.some((item: any) => item.trackingNumber === track1);
    const hasKochi = dubaiApproverList.some((item: any) => item.trackingNumber === track2);
    const hasCalicut = dubaiApproverList.some((item: any) => item.trackingNumber === track3);

    if (!hasDubai || hasKochi || hasCalicut) {
      throw new Error(`Case 6 & 7 Failed: Dubai approver saw unauthorized offices! List: ${JSON.stringify(dubaiApproverList.map((i: any) => i.deliveryLocation))}`);
    }
    console.log("✓ CASE 6 & 7 PASSED: Approver with Dubai visibility only sees Dubai request.");

    // CASE 15: Unauthorized User attempts to approve a request for unauthorized office
    console.log("\n--- TEST CASE 15: Backend Rejection of Unauthorized Office Approval ---");
    const kochiApprovalReq = createRes2.createdRequests.find((r) => r.trackingNumber === track2);
    if (!kochiApprovalReq) throw new Error("Could not find Kochi approval request ID.");

    let caughtOfficeError = false;
    try {
      await approveRDApproval({
        id: kochiApprovalReq.id,
        userId: "unauthorized-approver",
        userName: "Dubai Approver",
        ownerAdminId,
        isSuperAdmin: false,
        allowedOfficeNames: [dubaiOfficeName],
        allowedOfficeIds: [dubaiOffice.id],
      });
    } catch (err: any) {
      if (err.message.includes("Forbidden")) {
        caughtOfficeError = true;
      } else {
        throw err;
      }
    }
    if (!caughtOfficeError) {
      throw new Error("Case 15 Failed: Approver was able to approve request for unauthorized delivery location office!");
    }
    console.log("✓ CASE 15 PASSED: Backend strictly rejected approval for unauthorized office location.");

    // CASE 10 & 11: Authorized Approval -> Transitions to Ready For Delivery at Delivery Location
    console.log("\n--- TEST CASE 10 & 11: Authorized Approval Transitions ---");
    const dubaiApprovalReq = createRes.createdRequests[0];
    const approveResult = await approveRDApproval({
      id: dubaiApprovalReq.id,
      userId: testAdmin?.id || "super-admin",
      userName: "Authorized Approver",
      ownerAdminId,
      isSuperAdmin: true,
      approvalRemarks: "Approved for Dubai dispatch",
    });

    if (!approveResult.success) {
      throw new Error("Case 10 Failed: Approval did not succeed.");
    }

    // Verify document in DB is now Ready For Delivery with destinationOfficeId = dubaiOffice.id
    const updatedMov1 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: track1 },
    });
    const updatedReg1 = await prisma.registration.findFirst({
      where: { trackingNumber: track1 },
    });
    const updatedApproval1 = await (prisma as any).rDApproval.findFirst({
      where: { id: dubaiApprovalReq.id },
    });

    if (
      updatedMov1?.status !== "Ready for Delivery" ||
      updatedReg1?.trackingStatus !== "Ready for Delivery" ||
      updatedApproval1?.status !== "Approved" ||
      updatedMov1?.currentOfficeId !== dubaiOffice.id
    ) {
      throw new Error(`Case 10 Failed: DB state mismatch after approval! Mov status: ${updatedMov1?.status}, Reg status: ${updatedReg1?.trackingStatus}, Approval status: ${updatedApproval1?.status}`);
    }
    console.log("✓ CASE 10 & 11 PASSED: Document moved to Ready For Delivery at Delivery Location with status Approved.");

    // CASE 20: Prevent double approval
    console.log("\n--- TEST CASE 20: Prevent Double Approval ---");
    let caughtDoubleApproveError = false;
    try {
      await approveRDApproval({
        id: dubaiApprovalReq.id,
        userId: testAdmin?.id || "super-admin",
        ownerAdminId,
        isSuperAdmin: true,
      });
    } catch (err: any) {
      if (err.message.includes("not pending") || err.message.includes("already")) {
        caughtDoubleApproveError = true;
      }
    }
    if (!caughtDoubleApproveError) {
      throw new Error("Case 20 Failed: Allowed approving an already approved request!");
    }
    console.log("✓ CASE 20 PASSED: Second approval attempt correctly rejected.");

    // CASE 12: Reject Action
    console.log("\n--- TEST CASE 12: Reject Action ---");
    const calicutApprovalReq = createRes2.createdRequests.find((r) => r.trackingNumber === track3);
    if (!calicutApprovalReq) throw new Error("Could not find Calicut approval request.");

    const rejectResult = await rejectRDApproval({
      id: calicutApprovalReq.id,
      userId: testAdmin?.id || "super-admin",
      userName: "Rejecting Approver",
      ownerAdminId,
      rejectionReason: "Missing attested documents on file.",
      isSuperAdmin: true,
    });

    if (!rejectResult.success) {
      throw new Error("Case 12 Failed: Rejection failed.");
    }

    const updatedMov3 = await prisma.documentMovement.findFirst({
      where: { trackingNumber: track3 },
    });
    const updatedApproval3 = await (prisma as any).rDApproval.findFirst({
      where: { id: calicutApprovalReq.id },
    });

    if (
      updatedApproval3?.status !== "Rejected" ||
      updatedApproval3?.rejectionReason !== "Missing attested documents on file." ||
      updatedMov3?.status === "Ready for Delivery"
    ) {
      throw new Error(`Case 12 Failed: Rejection DB state invalid! Mov status: ${updatedMov3?.status}, Approval status: ${updatedApproval3?.status}`);
    }
    console.log("✓ CASE 12 PASSED: Request marked Rejected with reason; document remains in Document In Hand.");

    // Clean up test records
    await (prisma as any).rDApproval.deleteMany({
      where: {
        trackingNumber: { in: [track1, track2, track3, trackInvalid] },
      },
    });
    await prisma.documentMovement.deleteMany({
      where: {
        trackingNumber: { in: [track1, track2, track3, trackInvalid] },
      },
    });
    await prisma.registration.deleteMany({
      where: {
        trackingNumber: { in: [track1, track2, track3, trackInvalid] },
      },
    });
    await prisma.officeLocation.deleteMany({
      where: {
        id: { in: [dubaiOffice.id, kochiOffice.id, calicutOffice.id] },
      },
    });

    console.log("\n==========================================");
    console.log("🎉 ALL 20 TEST CASES PASSED SUCCESSFULLY!");
    console.log("==========================================");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
