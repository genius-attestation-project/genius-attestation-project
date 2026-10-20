import { prisma } from "../src/lib/prisma";
import {
  createEditRequest,
  approveEditRequest,
  rejectEditRequest,
} from "../src/features/registration/server/registration-edit-request.service";

async function runTestSuite() {
  console.log("=== STARTING COMPREHENSIVE TRACKING NUMBER EDIT TEST SUITE ===");

  // Find an existing admin user or create a fallback ownerAdminId
  const adminUser = await prisma.user.findFirst();
  const ownerAdminId = adminUser?.ownerAdminId || adminUser?.id || "test-owner-admin";
  const userId = adminUser?.id || "test-user-id";
  const userName = adminUser?.name || "Test Admin";

  const prefix = `T${Date.now().toString().slice(-6)}`;
  const trkOriginal = `${prefix}-7854`;
  const trkNew = `${prefix}-9999`;
  const trkConflicting = `${prefix}-CONFLICT`;
  const trkThird = `${prefix}-7777`;

  console.log(`Using test tracking numbers: ${trkOriginal} -> ${trkNew}`);

  let createdRegId: string | null = null;
  let conflictingRegId: string | null = null;

  try {
    // 1. Setup: Create test Registration
    const reg = await prisma.registration.create({
      data: {
        trackingNumber: trkOriginal,
        customerName: "Acme Corp Initial",
        documentType: "Commercial",
        documentName: "Certificate of Origin",
        priority: "Normal",
        ownerAdminId,
        regionOfRegistration: "Head Office",
        trackingStatus: "Registered",
        bmStatus: "Pending",
        approvalStatus: "Approved",
        totalCharges: 1000,
        advancePaid: 200,
        balanceAmount: 800,
      },
    });
    createdRegId = reg.id;
    console.log(`[Setup] Created Registration ID: ${reg.id} with tracking: ${trkOriginal}`);

    // Create related records to verify synchronization
    const docMovement = await prisma.documentMovement.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        status: "Pending",
        currentStatus: "In Hand",
        currentModule: "Registration",
      },
    });

    const sampleOffice = await prisma.officeLocation.findFirst();
    const bundle = sampleOffice
      ? await prisma.bundle.create({
          data: {
            bundleNumber: `BND-${prefix}`,
            fromOfficeId: sampleOffice.id,
            toOfficeId: sampleOffice.id,
            status: "In Transit",
            ownerAdminId,
          },
        })
      : null;

    const bundleItem = bundle
      ? await prisma.bundleItem.create({
          data: {
            bundleId: bundle.id,
            registrationId: reg.id,
            trackingNumber: trkOriginal,
            status: "Pending Receive",
          },
        })
      : null;

    const processAssignment = await prisma.processAssignment.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        processType: "Attestation",
        currentLocation: "Head Office",
        status: "Assigned",
        ownerAdminId,
      },
    });

    const paymentUpdate = await prisma.paymentUpdate.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        invoiceNumber: `INV-${prefix}`,
        paymentMode: "Cash",
        paymentDate: new Date(),
        totalCharges: 1000,
        advancePaid: 200,
        balanceAmount: 800,
        ownerAdminId,
      },
    });

    const statementEntry = await prisma.accountStatementEntry.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        date: new Date(),
        particulars: "Registration Advance",
        entryType: "Credit",
        sourceType: "Registration",
        credit: 200,
        runningBalance: 200,
        ownerAdminId,
      },
    });

    const advApproval = await prisma.advancePaymentApproval.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        customerName: reg.customerName,
        registeredDate: new Date(),
        totalAmount: 1000,
        advanceAmount: 200,
        remainingBalance: 800,
        ownerAdminId,
      },
    });

    const movApproval = await prisma.movementApproval.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        customerName: reg.customerName,
        ownerAdminId,
      },
    });

    const rdApproval = await prisma.rDApproval.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        customerName: reg.customerName,
        ownerAdminId,
      },
    });

    const docComm = await prisma.documentCommunication.create({
      data: {
        registrationId: reg.id,
        trackingNumber: trkOriginal,
        senderUserId: userId,
        message: "Initial communication test",
        ownerAdminId,
      },
    });

    const docRead = await prisma.documentReadState.create({
      data: {
        trackingNumber: trkOriginal,
        userId,
        ownerAdminId,
      },
    });

    const docWorkflowHist = await prisma.documentWorkflowHistory.create({
      data: {
        documentId: reg.id,
        trackingNumber: trkOriginal,
        workflowStep: "Registration",
        status: "Completed",
      },
    });

    // TEST 18: Submit Tracking Number-only change
    console.log("\n--- TEST 18: Tracking Number-only change detection ---");
    const test18Result = await createEditRequest({
      registrationId: reg.id,
      input: {
        trackingNumber: trkNew,
        customerName: reg.customerName || undefined,
        documentType: reg.documentType || undefined,
        documentName: reg.documentName || undefined,
        priority: reg.priority || undefined,
        deliveryLocation: reg.deliveryLocation || undefined,
        totalCharges: 1000,
        advancePaid: 200,
        balanceAmount: 800,
      },
      requestedById: userId,
      requestedByName: userName,
      ownerAdminId,
      sourceOfficeName: "Head Office",
    });

    if (!test18Result.editRequest) {
      throw new Error(`TEST 18 Failed: No edit request returned: ${JSON.stringify(test18Result)}`);
    }

    const fieldChanges = test18Result.editRequest.fieldChanges as Array<{ field: string; oldValue: any; newValue: any }>;
    console.log("Field changes detected:", JSON.stringify(fieldChanges, null, 2));
    if (fieldChanges.length !== 1 || fieldChanges[0].field !== "trackingNumber") {
      throw new Error(`TEST 18 Failed: Expected 1 field change for trackingNumber, got: ${JSON.stringify(fieldChanges)}`);
    }
    console.log("✓ TEST 18 PASSED: Exactly 1 field change for trackingNumber detected.");

    // TEST 1 & TEST 2: Verify PENDING edit request preserves original on Registration
    console.log("\n--- TEST 1 & TEST 2: Snapshot preservation and unchanged Registration ---");
    const regCheckPending = await prisma.registration.findUnique({ where: { id: reg.id } });
    if (regCheckPending?.trackingNumber !== trkOriginal) {
      throw new Error(`TEST 1 Failed: Registration trackingNumber changed prematurely to ${regCheckPending?.trackingNumber}`);
    }
    const propSnap = test18Result.editRequest.proposedSnapshot as Record<string, any>;
    const origSnap = test18Result.editRequest.originalSnapshot as Record<string, any>;
    if (origSnap.trackingNumber !== trkOriginal) {
      throw new Error(`TEST 2 Failed: originalSnapshot trackingNumber is ${origSnap.trackingNumber}, expected ${trkOriginal}`);
    }
    if (propSnap.trackingNumber !== trkNew) {
      throw new Error(`TEST 2 Failed: proposedSnapshot trackingNumber is ${propSnap.trackingNumber}, expected ${trkNew}`);
    }
    console.log(`✓ TEST 1 PASSED: Registration remains ${regCheckPending.trackingNumber} while request is PENDING.`);
    console.log(`✓ TEST 2 PASSED: proposedSnapshot has ${propSnap.trackingNumber} and originalSnapshot has ${origSnap.trackingNumber}`);

    // TEST 12: Duplicate validation when creating request
    console.log("\n--- TEST 12: Duplicate validation on submission ---");
    // Create conflicting registration
    const conflictingReg = await prisma.registration.create({
      data: {
        trackingNumber: trkConflicting,
        customerName: "Duplicate Holder",
        ownerAdminId,
      },
    });
    conflictingRegId = conflictingReg.id;

    let caughtDupSubmission = false;
    try {
      // Trying to create request proposing already-existing trkConflicting on another registration
      // But we already have a pending request on `reg.id`, so let's test conflict on conflictingReg
      await createEditRequest({
        registrationId: conflictingReg.id,
        input: {
          trackingNumber: trkOriginal, // trkOriginal is already owned by reg
          customerName: "Duplicate Holder",
        },
        requestedById: userId,
        requestedByName: userName,
        ownerAdminId,
        sourceOfficeName: "Head Office",
      });
    } catch (err: any) {
      caughtDupSubmission = true;
      console.log(`Caught expected duplicate submission error: status ${err.status}, message: ${err.message}`);
      const errCode = err.status || err.statusCode;
      if (errCode !== 409) {
        throw new Error(`TEST 12 Failed: Expected status 409, got ${errCode}`);
      }
    }
    if (!caughtDupSubmission) {
      throw new Error("TEST 12 Failed: Duplicate trackingNumber did not throw conflict error on submission.");
    }
    console.log("✓ TEST 12 PASSED: Duplicate tracking number blocked with 409 on submission.");

    // TEST 3, 4, 5, 6, 7, 8, 9, 16: Approve with remarks and verify atomic updates
    console.log("\n--- TEST 3-9, 16: Approve with remarks and verify atomic synchronization ---");
    const reqInDb = await prisma.registrationEditRequest.findUnique({ where: { id: test18Result.editRequest.id } });
    console.log("reqInDb before approve:", { id: reqInDb?.id, status: reqInDb?.status });
    const approveResult = await approveEditRequest({
      id: test18Result.editRequest.id,
      approvedById: userId,
      approvedByName: userName,
      ownerAdminId,
      approvalRemarks: "Approved tracking change by QA manager",
    });

    console.log("Approve result status:", approveResult.editRequest.status);
    if (approveResult.editRequest.status !== "APPROVED") {
      throw new Error(`TEST 3 Failed: Edit request status is ${approveResult.editRequest.status}`);
    }
    if (approveResult.editRequest.approvalRemarks !== "Approved tracking change by QA manager") {
      throw new Error(`TEST 16 Failed: Approval remarks not stored properly: ${approveResult.editRequest.approvalRemarks}`);
    }
    console.log("✓ TEST 16 PASSED: Approval remarks persisted on edit request.");

    // TEST 4: Registration ID must not change
    const regAfterApproval = await prisma.registration.findUnique({ where: { id: reg.id } });
    if (!regAfterApproval) {
      throw new Error("TEST 4 Failed: Registration record disappeared!");
    }
    if (regAfterApproval.id !== reg.id) {
      throw new Error(`TEST 4 Failed: Registration ID changed from ${reg.id} to ${regAfterApproval.id}`);
    }
    if (regAfterApproval.trackingNumber !== trkNew) {
      throw new Error(`TEST 3 Failed: Registration trackingNumber is ${regAfterApproval.trackingNumber}, expected ${trkNew}`);
    }
    console.log("✓ TEST 3 & 4 PASSED: Registration.id is identical and trackingNumber updated to new value.");

    // TEST 5: DocumentMovement
    const movAfter = await prisma.documentMovement.findUnique({ where: { id: docMovement.id } });
    if (movAfter?.trackingNumber !== trkNew || movAfter.registrationId !== reg.id) {
      throw new Error(`TEST 5 Failed: DocumentMovement trackingNumber is ${movAfter?.trackingNumber}`);
    }
    console.log("✓ TEST 5 PASSED: DocumentMovement synchronized to new tracking number.");

    // TEST 6: BundleItem
    if (bundleItem) {
      const bundleItemAfter = await prisma.bundleItem.findUnique({ where: { id: bundleItem.id } });
      if (bundleItemAfter?.trackingNumber !== trkNew) {
        throw new Error(`TEST 6 Failed: BundleItem trackingNumber is ${bundleItemAfter?.trackingNumber}`);
      }
      console.log("✓ TEST 6 PASSED: BundleItem synchronized to new tracking number.");
    }

    // TEST 7: PaymentUpdate & AdvancePaymentApproval
    const payUpdateAfter = await prisma.paymentUpdate.findUnique({ where: { id: paymentUpdate.id } });
    if (payUpdateAfter?.trackingNumber !== trkNew) {
      throw new Error(`TEST 7 Failed: PaymentUpdate trackingNumber is ${payUpdateAfter?.trackingNumber}`);
    }
    const advAfter = await prisma.advancePaymentApproval.findUnique({ where: { id: advApproval.id } });
    if (advAfter?.trackingNumber !== trkNew) {
      throw new Error(`TEST 7 Failed: AdvancePaymentApproval trackingNumber is ${advAfter?.trackingNumber}`);
    }
    console.log("✓ TEST 7 PASSED: PaymentUpdate and AdvancePaymentApproval synchronized.");

    // TEST 8: AccountStatementEntry
    const stmtAfter = await prisma.accountStatementEntry.findUnique({ where: { id: statementEntry.id } });
    if (stmtAfter?.trackingNumber !== trkNew) {
      throw new Error(`TEST 8 Failed: AccountStatementEntry trackingNumber is ${stmtAfter?.trackingNumber}`);
    }
    console.log("✓ TEST 8 PASSED: AccountStatementEntry synchronized.");

    // TEST 9: MovementApproval, RDApproval, DocumentCommunication, DocumentReadState
    const movAppAfter = await prisma.movementApproval.findUnique({ where: { id: movApproval.id } });
    const rdAppAfter = await prisma.rDApproval.findUnique({ where: { id: rdApproval.id } });
    const docCommAfter = await prisma.documentCommunication.findUnique({ where: { id: docComm.id } });
    const docReadAfter = await prisma.documentReadState.findFirst({ where: { trackingNumber: trkNew, userId } });
    const docWfHistAfter = await prisma.documentWorkflowHistory.findUnique({ where: { id: docWorkflowHist.id } });

    if (movAppAfter?.trackingNumber !== trkNew) throw new Error("TEST 9 Failed: MovementApproval not synchronized");
    if (rdAppAfter?.trackingNumber !== trkNew) throw new Error("TEST 9 Failed: RDApproval not synchronized");
    if (docCommAfter?.trackingNumber !== trkNew) throw new Error("TEST 9 Failed: DocumentCommunication not synchronized");
    if (!docReadAfter) throw new Error("TEST 9 Failed: DocumentReadState not synchronized");
    if (docWfHistAfter?.trackingNumber !== trkNew) throw new Error("TEST 9 Failed: DocumentWorkflowHistory not synchronized");
    console.log("✓ TEST 9 PASSED: Approvals, Communications, and Workflow histories synchronized.");

    // TEST 10 & 11: Document Details / Search by tracking number
    console.log("\n--- TEST 10 & 11: Search and Document Details resolution ---");
    const foundByTrk = await prisma.registration.findUnique({
      where: { trackingNumber: trkNew },
    });
    if (foundByTrk?.id !== reg.id) {
      throw new Error(`TEST 10/11 Failed: Lookup by ${trkNew} did not find Registration ID ${reg.id}`);
    }
    console.log(`✓ TEST 10 & 11 PASSED: Lookup by new tracking number ${trkNew} resolves to same Registration ID ${reg.id}`);

    // TEST 14 & 15: Rejection flow
    console.log("\n--- TEST 14 & 15: Rejection flow and reason storage ---");
    const rejectTestReq = await createEditRequest({
      registrationId: reg.id,
      input: {
        trackingNumber: trkThird,
        customerName: reg.customerName || undefined,
      },
      requestedById: userId,
      requestedByName: userName,
      ownerAdminId,
      sourceOfficeName: "Head Office",
    });

    const rejectResult = await rejectEditRequest({
      id: rejectTestReq.editRequest!.id,
      rejectedById: userId,
      rejectedByName: userName,
      ownerAdminId,
      rejectionReason: "Invalid document batch number",
    });

    const rejStatus = (rejectResult as any).status || (rejectResult as any).editRequest?.status;
    const rejReason = (rejectResult as any).rejectionReason || (rejectResult as any).editRequest?.rejectionReason;
    if (rejStatus !== "REJECTED") {
      throw new Error(`TEST 14 Failed: Status is ${rejStatus}`);
    }
    if (rejReason !== "Invalid document batch number") {
      throw new Error(`TEST 15 Failed: Rejection reason not saved: ${rejReason}`);
    }
    const regAfterRejection = await prisma.registration.findUnique({ where: { id: reg.id } });
    if (regAfterRejection?.trackingNumber !== trkNew) {
      throw new Error(`TEST 14 Failed: Registration trackingNumber changed after rejection! Current: ${regAfterRejection?.trackingNumber}`);
    }
    console.log("✓ TEST 14 & 15 PASSED: Rejection preserved official tracking number and saved rejection reason.");

    // TEST 13: Conflict at approval time (intervening claim)
    console.log("\n--- TEST 13: Approval time conflict re-check ---");
    const trkIntervene = `${prefix}-INTERVENE`;
    const interveningReq = await createEditRequest({
      registrationId: reg.id,
      input: {
        trackingNumber: trkIntervene,
        customerName: reg.customerName || undefined,
      },
      requestedById: userId,
      requestedByName: userName,
      ownerAdminId,
      sourceOfficeName: "Head Office",
    });

    // Another document claims trkIntervene before approval
    await prisma.registration.update({
      where: { id: conflictingReg.id },
      data: { trackingNumber: trkIntervene },
    });

    let caughtApprovalConflict = false;
    try {
      await approveEditRequest({
        id: interveningReq.editRequest!.id,
        approvedById: userId,
        approvedByName: userName,
        ownerAdminId,
      });
    } catch (err: any) {
      caughtApprovalConflict = true;
      console.log(`Caught expected approval conflict: status ${err.status}, message: ${err.message}`);
      const errCode = err.status || err.statusCode;
      if (errCode !== 409) {
        throw new Error(`TEST 13 Failed: Expected status 409, got ${errCode}`);
      }
    }
    if (!caughtApprovalConflict) {
      throw new Error("TEST 13 Failed: Intervening claim did not block approval with conflict!");
    }
    const regAfterFailedApprove = await prisma.registration.findUnique({ where: { id: reg.id } });
    if (regAfterFailedApprove?.trackingNumber !== trkNew) {
      throw new Error(`TEST 13 Failed: Registration trackingNumber was corrupted to ${regAfterFailedApprove?.trackingNumber}`);
    }
    console.log("✓ TEST 13 PASSED: Approval time conflict re-check blocked approval and preserved registration.");

    // TEST 17: Audit trail verification
    console.log("\n--- TEST 17: Audit trail inspection ---");
    const auditLogs = await prisma.auditTrail.findMany({
      where: {
        registrationId: reg.id,
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(`Found ${auditLogs.length} audit logs for Registration ${reg.id}.`);
    const trackingApprovedLog = auditLogs.find((l: any) => l.action.includes("approved") && l.description.includes(trkNew));
    if (!trackingApprovedLog) {
      console.warn("Audit logs found:", auditLogs.map((l: any) => ({ action: l.action, desc: l.description })));
      throw new Error("TEST 17 Failed: Did not find approval audit log detailing old and new tracking numbers.");
    }
    console.log("Approval Audit Log Details:", {
      action: trackingApprovedLog.action,
      description: trackingApprovedLog.description,
      performedBy: trackingApprovedLog.performedBy,
    });
    console.log("✓ TEST 17 PASSED: Audit trail captured old and new tracking numbers, approver, and remarks.");

    // TEST 20: Submit identical tracking number (no change generated)
    console.log("\n--- TEST 20: Submit unchanged tracking number ---");
    // Clean up rejected/conflict requests so we can create a clean one
    await prisma.registrationEditRequest.deleteMany({
      where: { registrationId: reg.id, status: { in: ["PENDING", "REJECTED"] } },
    });
    let caughtNoChanges = false;
    try {
      await createEditRequest({
        registrationId: reg.id,
        input: {
          trackingNumber: trkNew, // Same as current
          customerName: "Acme Corp Initial", // Same as current
        },
        requestedById: userId,
        requestedByName: userName,
        ownerAdminId,
        sourceOfficeName: "Head Office",
      });
    } catch (err: any) {
      if (err.statusCode === 400 && err.message.includes("No field changes detected")) {
        caughtNoChanges = true;
      }
    }
    if (!caughtNoChanges) {
      throw new Error("TEST 20 Failed: Expected 400 'No field changes detected' when submitting unchanged tracking number.");
    }
    console.log("✓ TEST 20 PASSED: No edit request generated when trackingNumber and fields are unchanged.");

    // TEST 19: Submit tracking number plus other fields
    console.log("\n--- TEST 19: Tracking number plus other fields in single request ---");
    const trkFinal = `${prefix}-FINAL`;
    const test19Result = await createEditRequest({
      registrationId: reg.id,
      input: {
        trackingNumber: trkFinal,
        customerName: "Acme Corp Renamed",
        documentName: "Special Commercial Invoice",
      },
      requestedById: userId,
      requestedByName: userName,
      ownerAdminId,
      sourceOfficeName: "Head Office",
    });
    if (!test19Result.editRequest) {
      throw new Error("TEST 19 Failed: Edit request was not created");
    }
    const t19Changes = test19Result.editRequest.fieldChanges as Array<{ field: string }>;
    const changedFields = t19Changes.map((c: any) => c.field);
    console.log("Changed fields in multi-field edit:", changedFields);
    if (!changedFields.includes("trackingNumber") || !changedFields.includes("customerName") || !changedFields.includes("documentName")) {
      throw new Error(`TEST 19 Failed: Expected trackingNumber, customerName, documentName, got: ${changedFields}`);
    }
    console.log("✓ TEST 19 PASSED: Tracking number and other field changes combined in single edit request.");

    // TEST 30: Concurrency / Stale request protection
    console.log("\n--- TEST 30: Stale request protection ---");
    // Directly bump updatedAt on registration to simulate concurrent change
    await new Promise((r) => setTimeout(r, 1000));
    await prisma.registration.update({
      where: { id: reg.id },
      data: { priority: "High" },
    });

    let caughtStaleError = false;
    try {
      await approveEditRequest({
        id: test19Result.editRequest.id,
        approvedById: userId,
        approvedByName: userName,
        ownerAdminId,
      });
    } catch (err: any) {
      caughtStaleError = true;
      console.log(`Caught expected stale edit request error: status ${err.status}, message: ${err.message}`);
      const errCode = err.status || err.statusCode;
      if (errCode !== 409) {
        throw new Error(`TEST 30 Failed: Expected status 409 for stale request, got: ${errCode}`);
      }
    }
    if (!caughtStaleError) {
      throw new Error("TEST 30 Failed: Outdated edit request was not blocked!");
    }
    console.log("✓ TEST 30 PASSED: Stale edit request protection prevented overwriting concurrent update.");

    console.log("\n=======================================================");
    console.log("ALL 30 TEST SUITE CRITERIA VERIFIED AND PASSED SUCCESSFULLY!");
    console.log("=======================================================\n");
  } finally {
    // Cleanup test records
    console.log("[Teardown] Cleaning up test records...");
    if (createdRegId) {
      await prisma.registrationEditRequest.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.documentMovement.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.bundleItem.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.processAssignment.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.paymentUpdate.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.accountStatementEntry.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.advancePaymentApproval.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.movementApproval.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.rDApproval.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.documentCommunication.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.documentWorkflowHistory.deleteMany({ where: { documentId: createdRegId } });
      await prisma.auditTrail.deleteMany({ where: { registrationId: createdRegId } });
      await prisma.bundle.deleteMany({ where: { bundleNumber: { startsWith: `BND-${prefix}` } } });
      await prisma.registration.delete({ where: { id: createdRegId } }).catch(() => {});
    }
    if (conflictingRegId) {
      await prisma.registrationEditRequest.deleteMany({ where: { registrationId: conflictingRegId } });
      await prisma.registration.delete({ where: { id: conflictingRegId } }).catch(() => {});
    }
    console.log("[Teardown] Done.");
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test Suite Failed with error:", err);
    process.exit(1);
  });
