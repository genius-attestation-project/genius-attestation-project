import { prisma } from "../src/lib/prisma";
import {
  createEditRequest,
  approveEditRequest,
  rejectEditRequest,
  listEditRequests,
  getEditRequestById,
} from "../src/features/registration/server/registration-edit-request.service";
import { createRegistration } from "../src/features/registration/server/registration.service";

async function main() {
  console.log("=================================================================");
  console.log("TEST SUITE: FAILED_REVIEW PROTECTION & PENDING APPROVAL WORKFLOW");
  console.log("=================================================================\n");

  const admin = await prisma.user.findFirst({
    where: { role: { name: { in: ["Super Admin", "Admin"] } } },
  });

  if (!admin) {
    throw new Error("No admin user found in database.");
  }

  const ownerAdminId = admin.ownerAdminId || admin.id;
  const userId = admin.id;
  const testSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Create two distinct test offices for visibility testing
  const officeA = await prisma.officeLocation.create({
    data: {
      officeName: `OfficeA_${testSuffix}`,
      location: "LocA",
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  const officeB = await prisma.officeLocation.create({
    data: {
      officeName: `OfficeB_${testSuffix}`,
      location: "LocB",
      timezone: "Asia/Kolkata",
      ownerAdminId,
    },
  });

  const cleanupIds: { regIds: string[]; editIds: string[]; officeIds: string[] } = {
    regIds: [],
    editIds: [],
    officeIds: [officeA.id, officeB.id],
  };

  try {
    // =========================================================================
    // CASE 1: Tracking Number 61897 Verification
    // =========================================================================
    console.log("--- CASE 1: Tracking Number 61897 Verification ---");
    const edit61897 = await prisma.registrationEditRequest.findFirst({
      where: { trackingNumber: "61897" },
    });

    if (!edit61897) {
      console.log("[INFO] 61897 record not found in this environment (clean DB).");
    } else {
      console.log(`[PASS] Found 61897: DB Status = '${edit61897.status}'`);
      if (edit61897.status !== "FAILED_REVIEW") {
        throw new Error(`Expected 61897 status to be FAILED_REVIEW, got '${edit61897.status}'`);
      }

      // Verify that listEditRequests with default (PENDING) does NOT return 61897
      const pendingList = await listEditRequests(ownerAdminId, { status: "PENDING" });
      const contains61897 = pendingList.items.some((i) => i.trackingNumber === "61897");
      if (contains61897) {
        throw new Error("FAIL: 61897 with status FAILED_REVIEW appeared in PENDING approval list!");
      }
      console.log("[PASS] 61897 is correctly excluded from PENDING approval list.");

      // Verify that direct approval of 61897 is authoritatively rejected by backend
      let directApprovalBlocked = false;
      try {
        await approveEditRequest({
          ownerAdminId: edit61897.ownerAdminId,
          id: edit61897.id,
          approvedById: userId,
          approvedByName: "Approver",
        });
      } catch (err: any) {
        directApprovalBlocked = true;
        if (!err.message.includes("Cannot approve request with status 'FAILED_REVIEW'")) {
          throw new Error(`Unexpected error message: ${err.message}`);
        }
        console.log(`[PASS] Authoritative backend validation blocked approval: "${err.message}"`);
      }

      if (!directApprovalBlocked) {
        throw new Error("FAIL: FAILED_REVIEW request was approved unexpectedly!");
      }
    }

    // =========================================================================
    // CASE 2: PENDING Edit Request Flow
    // =========================================================================
    console.log("\n--- CASE 2: PENDING Request Lifecycle ---");
    const tNum2 = `T-PEND-${testSuffix}`;
    const reg2 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum2,
        customerName: "Customer Two",
        documentName: "Degree Certificate",
        documentType: "Educational",
        processType: "Attestation",
        totalCharges: 2500,
        deliveryLocation: officeA.officeName,
      },
      officeA.officeName,
      "Staff",
      userId
    );
    cleanupIds.regIds.push(reg2.id);

    const editReq2 = await createEditRequest({
      ownerAdminId,
      registrationId: reg2.id,
      input: { customerName: "Customer Two Updated" },
      sourceOfficeName: officeA.officeName,
      requestedById: userId,
      requestedByName: "Staff",
    });
    cleanupIds.editIds.push(editReq2.id);

    if (editReq2.status !== "PENDING") {
      throw new Error(`FAIL: Expected status PENDING, got '${editReq2.status}'`);
    }

    // Must appear in PENDING list
    const pendingList2 = await listEditRequests(ownerAdminId, { status: "PENDING" });
    const inPending2 = pendingList2.items.some((i) => i.id === editReq2.id);
    if (!inPending2) {
      throw new Error("FAIL: PENDING request did not appear in PENDING list!");
    }
    console.log("[PASS] PENDING request appears in PENDING queue.");

    // Approve the request
    const approved2 = await approveEditRequest({
      ownerAdminId,
      id: editReq2.id,
      approvedById: userId,
      approvedByName: "Approver",
    });
    if (approved2.editRequest.status !== "APPROVED") {
      throw new Error(`FAIL: Expected APPROVED, got '${approved2.editRequest.status}'`);
    }
    console.log("[PASS] PENDING request successfully approved.");

    // Verify it is no longer in PENDING list
    const pendingAfterApprove = await listEditRequests(ownerAdminId, { status: "PENDING" });
    if (pendingAfterApprove.items.some((i) => i.id === editReq2.id)) {
      throw new Error("FAIL: APPROVED request still in PENDING list!");
    }
    console.log("[PASS] APPROVED request removed from PENDING list.");

    // =========================================================================
    // CASE 3: APPROVED & REJECTED Requests Cannot Be Approved Again
    // =========================================================================
    console.log("\n--- CASE 3: Double Approval / Terminal State Protection ---");
    let doubleApproveBlocked = false;
    try {
      await approveEditRequest({
        ownerAdminId,
        id: editReq2.id,
        approvedById: userId,
        approvedByName: "Approver",
      });
    } catch (err: any) {
      doubleApproveBlocked = true;
      if (!err.message.includes("Cannot approve request with status 'APPROVED'")) {
        throw new Error(`Unexpected error: ${err.message}`);
      }
      console.log(`[PASS] Double approval blocked: "${err.message}"`);
    }
    if (!doubleApproveBlocked) {
      throw new Error("FAIL: Re-approving an APPROVED request was allowed!");
    }

    // Create a request to reject
    const tNum3 = `T-REJ-${testSuffix}`;
    const reg3 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum3,
        customerName: "Customer Three",
        documentName: "Diploma",
        documentType: "Educational",
        processType: "Apostille",
        totalCharges: 1800,
        deliveryLocation: officeA.officeName,
      },
      officeA.officeName,
      "Staff",
      userId
    );
    cleanupIds.regIds.push(reg3.id);

    const editReq3 = await createEditRequest({
      ownerAdminId,
      registrationId: reg3.id,
      input: { customerName: "Customer Three New" },
      sourceOfficeName: officeA.officeName,
      requestedById: userId,
      requestedByName: "Staff",
    });
    cleanupIds.editIds.push(editReq3.id);

    await rejectEditRequest({
      ownerAdminId,
      id: editReq3.id,
      rejectionReason: "Invalid data provided",
      rejectedById: userId,
      rejectedByName: "Approver",
    });

    let approveRejectedBlocked = false;
    try {
      await approveEditRequest({
        ownerAdminId,
        id: editReq3.id,
        approvedById: userId,
        approvedByName: "Approver",
      });
    } catch (err: any) {
      approveRejectedBlocked = true;
      if (!err.message.includes("Cannot approve request with status 'REJECTED'")) {
        throw new Error(`Unexpected error: ${err.message}`);
      }
      console.log(`[PASS] Approving a REJECTED request blocked: "${err.message}"`);
    }
    if (!approveRejectedBlocked) {
      throw new Error("FAIL: Approving a REJECTED request was allowed!");
    }

    // =========================================================================
    // CASE 4: Stale Request Protection -> FAILED_REVIEW Lifecycle & Audit
    // =========================================================================
    console.log("\n--- CASE 4: Stale Request Protection & FAILED_REVIEW Audit ---");
    const tNum4 = `T-STALE-${testSuffix}`;
    const reg4 = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum4,
        customerName: "Customer Four",
        documentName: "Medical Certificate",
        documentType: "Personal",
        processType: "Attestation",
        totalCharges: 1200,
        deliveryLocation: officeA.officeName,
      },
      officeA.officeName,
      "Staff",
      userId
    );
    cleanupIds.regIds.push(reg4.id);

    const editReq4 = await createEditRequest({
      ownerAdminId,
      registrationId: reg4.id,
      input: { customerName: "Customer Four New Name" },
      sourceOfficeName: officeA.officeName,
      requestedById: userId,
      requestedByName: "Staff",
    });
    cleanupIds.editIds.push(editReq4.id);

    // Modify registration document after snapshot
    await new Promise((r) => setTimeout(r, 1100));
    await prisma.registration.update({
      where: { id: reg4.id },
      data: { customerName: "Customer Four Modified Concurrently" },
    });

    let staleDetected = false;
    try {
      await approveEditRequest({
        ownerAdminId,
        id: editReq4.id,
        approvedById: userId,
        approvedByName: "Approver",
      });
    } catch (err: any) {
      staleDetected = true;
      if (err.statusCode !== 409 || !err.isStale) {
        throw new Error(`Expected 409 isStale, got: ${err.message}`);
      }
      console.log(`[PASS] Stale document error caught: "${err.message}"`);
    }
    if (!staleDetected) {
      throw new Error("FAIL: Stale request was not detected!");
    }

    // Check that request in DB is now FAILED_REVIEW
    const updatedReq4 = await getEditRequestById(ownerAdminId, editReq4.id);
    if (updatedReq4?.status !== "FAILED_REVIEW") {
      throw new Error(`FAIL: Expected status FAILED_REVIEW, got '${updatedReq4?.status}'`);
    }
    console.log("[PASS] Edit request transitioned to FAILED_REVIEW in database.");

    // Check that an audit trail record was created
    const auditRecord = await prisma.auditTrail.findFirst({
      where: {
        registrationId: reg4.id,
        action: "Edit request failed review",
      },
    });
    if (!auditRecord) {
      throw new Error("FAIL: Audit trail for 'Edit request failed review' was not created!");
    }
    console.log(`[PASS] Audit trail recorded: "${auditRecord.description}"`);

    // Verify user can now submit a fresh edit request for the same registration
    const freshEditReq4 = await createEditRequest({
      ownerAdminId,
      registrationId: reg4.id,
      input: { customerName: "Customer Four Resubmitted Name" },
      sourceOfficeName: officeA.officeName,
      requestedById: userId,
      requestedByName: "Staff",
    });
    cleanupIds.editIds.push(freshEditReq4.id);
    if (freshEditReq4.status !== "PENDING") {
      throw new Error(`FAIL: Fresh edit request should be PENDING, got '${freshEditReq4.status}'`);
    }
    console.log("[PASS] New edit request successfully created after old request became FAILED_REVIEW.");

    // =========================================================================
    // CASE 5: Office Visibility Access Scoping
    // =========================================================================
    console.log("\n--- CASE 5: Office Visibility Access Scoping ---");
    const tNum5A = `T-OFFA-${testSuffix}`;
    const reg5A = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum5A,
        customerName: "Office A Customer",
        documentName: "Cert A",
        documentType: "Commercial",
        processType: "Attestation",
        totalCharges: 5000,
        deliveryLocation: officeA.officeName,
      },
      officeA.officeName,
      "Staff",
      userId
    );
    cleanupIds.regIds.push(reg5A.id);

    const editReq5A = await createEditRequest({
      ownerAdminId,
      registrationId: reg5A.id,
      input: { totalCharges: 5500 },
      sourceOfficeName: officeA.officeName,
      requestedById: userId,
      requestedByName: "Staff",
    });
    cleanupIds.editIds.push(editReq5A.id);

    const tNum5B = `T-OFFB-${testSuffix}`;
    const reg5B = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNum5B,
        customerName: "Office B Customer",
        documentName: "Cert B",
        documentType: "Commercial",
        processType: "Attestation",
        totalCharges: 4000,
        deliveryLocation: officeB.officeName,
      },
      officeB.officeName,
      "Staff",
      userId
    );
    cleanupIds.regIds.push(reg5B.id);

    const editReq5B = await createEditRequest({
      ownerAdminId,
      registrationId: reg5B.id,
      input: { totalCharges: 4500 },
      sourceOfficeName: officeB.officeName,
      requestedById: userId,
      requestedByName: "Staff",
    });
    cleanupIds.editIds.push(editReq5B.id);

    // Test 1: User with visibility ONLY to OfficeA
    const userOffAResults = await listEditRequests(ownerAdminId, {
      status: "PENDING",
      isSuperAdmin: false,
      allowedOfficeNames: [officeA.officeName],
    });
    const hasA = userOffAResults.items.some((i) => i.id === editReq5A.id);
    const hasB = userOffAResults.items.some((i) => i.id === editReq5B.id);
    if (!hasA || hasB) {
      throw new Error(`FAIL: Office visibility failed! Expected OfficeA only, hasA=${hasA}, hasB=${hasB}`);
    }
    console.log("[PASS] Office visibility correctly scoped to allowed office (OfficeA only).");

    // Test 2: User with empty allowedOfficeNames
    const emptyResults = await listEditRequests(ownerAdminId, {
      status: "PENDING",
      isSuperAdmin: false,
      allowedOfficeNames: [],
    });
    if (emptyResults.items.length !== 0) {
      throw new Error(`FAIL: User with empty allowed offices saw ${emptyResults.items.length} items!`);
    }
    console.log("[PASS] User with no office access correctly receives 0 items.");

    // Test 3: Super Admin sees both OfficeA and OfficeB
    const superAdminResults = await listEditRequests(ownerAdminId, {
      status: "PENDING",
      isSuperAdmin: true,
      allowedOfficeNames: null,
    });
    const saHasA = superAdminResults.items.some((i) => i.id === editReq5A.id);
    const saHasB = superAdminResults.items.some((i) => i.id === editReq5B.id);
    if (!saHasA || !saHasB) {
      throw new Error(`FAIL: Super Admin failed to see all offices! saHasA=${saHasA}, saHasB=${saHasB}`);
    }
    console.log("[PASS] Super Admin correctly sees edit requests from all offices.");

    console.log("\n=================================================================");
    console.log("ALL VERIFICATION CASES PASSED SUCCESSFULLY (100%)");
    console.log("=================================================================\n");
  } finally {
    console.log("Cleaning up test records...");
    for (const id of cleanupIds.editIds) {
      await prisma.registrationEditRequest.deleteMany({ where: { id } }).catch(() => null);
    }
    for (const id of cleanupIds.regIds) {
      await prisma.auditTrail.deleteMany({ where: { registrationId: id } }).catch(() => null);
      await prisma.documentMovement.deleteMany({ where: { registrationId: id } }).catch(() => null);
      await prisma.movementHistory.deleteMany({ where: { trackingNumber: { contains: testSuffix } } }).catch(() => null);
      await prisma.registration.deleteMany({ where: { id } }).catch(() => null);
    }
    for (const id of cleanupIds.officeIds) {
      await prisma.officeLocation.deleteMany({ where: { id } }).catch(() => null);
    }
    console.log("Cleanup complete.");
  }
}

main()
  .catch((err) => {
    console.error("\nTEST SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
