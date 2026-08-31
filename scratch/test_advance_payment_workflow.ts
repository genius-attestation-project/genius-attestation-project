import { prisma } from "../src/lib/prisma";
import { createRegistration } from "../src/features/registration/server/registration.service";
import {
  submitAdvancePaymentApproval,
  approveAdvancePayment,
  rejectAdvancePayment,
  getApprovedAdvanceSum,
} from "../src/features/revenue/server/advance-payment-approval.service";

async function runTests() {
  console.log("==========================================");
  console.log("RUNNING ADVANCE PAYMENT WORKFLOW TEST CASES");
  console.log("==========================================");

  // Find an admin user and office location for testing
  const adminUser = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true, ownerAdminId: true, officeLocationName: true },
  });

  if (!adminUser || !adminUser.ownerAdminId) {
    throw new Error("No active admin user found for test.");
  }

  const ownerAdminId = adminUser.ownerAdminId;
  const officeName = adminUser.officeLocationName || "Kochi";
  const userId = adminUser.id;

  // -------------------------------------------------------------------------
  // TEST CASE 1: Create Registration (Charges = 5000, Request advance = 500)
  // Expected: Approved Advance = 0, Balance = 5000
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 1: Create registration (Charges = 5000, Request advance = 500) ---");
  const trackingNo1 = `TEST-ADV-1-${Date.now()}`;
  const reg1 = await createRegistration(
    ownerAdminId,
    {
      trackingNumber: trackingNo1,
      customerName: "Test Customer 1",
      mobile: "+919876543210",
      email: "test1@example.com",
      address: "Test Address",
      country: "India",
      customerType: "Individual",
      documentType: "Degree Certificate",
      documentName: "Bachelor of Technology",
      documentIssuedCountry: "India",
      processType: "Attestation",
      externalProcess: "None",
      priority: "Normal",
      committedDuration: "5 Days",
      deliveryLocation: officeName,
      totalCharges: 5000,
      advancePaid: 0,
      requestedAdvanceAmount: 500,
      paymentMode: "Cash",
      approvalStatus: "Pending",
    },
    officeName,
    "Test Runner",
    userId
  );

  console.log(`[TEST 1 RESULT] Reg ID: ${reg1.id}`);
  console.log(`  Total Charges: ₹${reg1.totalCharges}`);
  console.log(`  Approved Advance: ₹${reg1.advancePaid}`);
  console.log(`  Balance Amount: ₹${reg1.balanceAmount}`);

  if (Number(reg1.advancePaid) !== 0 || Number(reg1.balanceAmount) !== 5000) {
    console.error(`❌ TEST CASE 1 FAILED! Expected Approved Advance = 0, Balance = 5000. Got Advance = ${reg1.advancePaid}, Balance = ${reg1.balanceAmount}`);
  } else {
    console.log("✅ TEST CASE 1 PASSED!");
  }

  // -------------------------------------------------------------------------
  // TEST CASE 2: Approve Advance (500)
  // Expected: Approved Advance = 500, Balance = 4500
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 2: Approve advance (500) ---");
  // Find pending advance approval for reg1
  const pendingApproval1 = await prisma.advancePaymentApproval.findFirst({
    where: { registrationId: reg1.id, status: "Pending Approval" },
  });

  if (!pendingApproval1) {
    console.error("❌ TEST CASE 2 FAILED! Pending advance approval request not found.");
  } else {
    // Create dummy bank proof storage record
    const dummyStorage = await prisma.fileStorage.create({
      data: {
        module: "ADVANCE_PROOF",
        folder: "proofs",
        originalName: "bank_proof.png",
        storedName: "bank_proof_123.png",
        bucketKey: "proofs/bank_proof_123.png",
        url: "/api/files/dummy/view",
        mimeType: "image/png",
        extension: "png",
        size: 1024,
        uploadedBy: userId,
      },
    });

    await approveAdvancePayment({
      ownerAdminId,
      approvalId: pendingApproval1.id,
      approvedByUserId: userId,
      bankProofFileId: dummyStorage.id,
      remarks: "Approved test advance payment.",
    });

    const updatedReg1 = await prisma.registration.findUnique({ where: { id: reg1.id } });
    console.log(`[TEST 2 RESULT] Reg ID: ${reg1.id}`);
    console.log(`  Total Charges: ₹${updatedReg1?.totalCharges}`);
    console.log(`  Approved Advance: ₹${updatedReg1?.advancePaid}`);
    console.log(`  Balance Amount: ₹${updatedReg1?.balanceAmount}`);

    if (Number(updatedReg1?.advancePaid) !== 500 || Number(updatedReg1?.balanceAmount) !== 4500) {
      console.error(`❌ TEST CASE 2 FAILED! Expected Approved Advance = 500, Balance = 4500. Got Advance = ${updatedReg1?.advancePaid}, Balance = ${updatedReg1?.balanceAmount}`);
    } else {
      console.log("✅ TEST CASE 2 PASSED!");
    }
  }

  // -------------------------------------------------------------------------
  // TEST CASE 3: Reject Advance (Charges = 5000, Request advance = 500, Reject)
  // Expected: Approved Advance = 0, Balance = 5000
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 3: Reject advance (500) ---");
  const trackingNo3 = `TEST-ADV-3-${Date.now()}`;
  const reg3 = await createRegistration(
    ownerAdminId,
    {
      trackingNumber: trackingNo3,
      customerName: "Test Customer 3",
      mobile: "+919876543212",
      email: "test3@example.com",
      address: "Test Address 3",
      country: "India",
      customerType: "Individual",
      documentType: "Degree Certificate",
      documentName: "Master of Science",
      documentIssuedCountry: "India",
      processType: "Attestation",
      externalProcess: "None",
      priority: "Normal",
      committedDuration: "5 Days",
      deliveryLocation: officeName,
      totalCharges: 5000,
      advancePaid: 0,
      requestedAdvanceAmount: 500,
      paymentMode: "Cash",
      approvalStatus: "Pending",
    },
    officeName,
    "Test Runner",
    userId
  );

  const pendingApproval3 = await prisma.advancePaymentApproval.findFirst({
    where: { registrationId: reg3.id, status: "Pending Approval" },
  });

  if (!pendingApproval3) {
    console.error("❌ TEST CASE 3 FAILED! Pending advance approval request not found.");
  } else {
    await rejectAdvancePayment({
      ownerAdminId,
      approvalId: pendingApproval3.id,
      rejectedByUserId: userId,
      rejectionReason: "Test rejection reason.",
    });

    const updatedReg3 = await prisma.registration.findUnique({ where: { id: reg3.id } });
    console.log(`[TEST 3 RESULT] Reg ID: ${reg3.id}`);
    console.log(`  Total Charges: ₹${updatedReg3?.totalCharges}`);
    console.log(`  Approved Advance: ₹${updatedReg3?.advancePaid}`);
    console.log(`  Balance Amount: ₹${updatedReg3?.balanceAmount}`);

    if (Number(updatedReg3?.advancePaid) !== 0 || Number(updatedReg3?.balanceAmount) !== 5000) {
      console.error(`❌ TEST CASE 3 FAILED! Expected Approved Advance = 0, Balance = 5000. Got Advance = ${updatedReg3?.advancePaid}, Balance = ${updatedReg3?.balanceAmount}`);
    } else {
      console.log("✅ TEST CASE 3 PASSED!");
    }
  }

  // -------------------------------------------------------------------------
  // TEST CASE 4: Multiple Advances (Charges = 10000, Adv 1 = 500 Approved, Adv 2 = 1000 Pending)
  // Expected: Approved Advance = 500, Balance = 9500
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 4: Multiple advances (500 Approved, 1000 Pending) ---");
  const trackingNo4 = `TEST-ADV-4-${Date.now()}`;
  const reg4 = await createRegistration(
    ownerAdminId,
    {
      trackingNumber: trackingNo4,
      customerName: "Test Customer 4",
      mobile: "+919876543213",
      email: "test4@example.com",
      address: "Test Address 4",
      country: "India",
      customerType: "Individual",
      documentType: "Degree Certificate",
      documentName: "PhD Diploma",
      documentIssuedCountry: "India",
      processType: "Attestation",
      externalProcess: "None",
      priority: "Normal",
      committedDuration: "5 Days",
      deliveryLocation: officeName,
      totalCharges: 10000,
      advancePaid: 0,
      requestedAdvanceAmount: 500,
      paymentMode: "Cash",
      approvalStatus: "Pending",
    },
    officeName,
    "Test Runner",
    userId
  );

  // Approve Advance 1 (500)
  const pendingApproval4a = await prisma.advancePaymentApproval.findFirst({
    where: { registrationId: reg4.id, status: "Pending Approval" },
  });

  const dummyStorage4 = await prisma.fileStorage.create({
    data: {
      module: "ADVANCE_PROOF",
      folder: "proofs",
      originalName: "bank_proof_4.png",
      storedName: "bank_proof_444.png",
      bucketKey: "proofs/bank_proof_444.png",
      url: "/api/files/dummy4/view",
      mimeType: "image/png",
      extension: "png",
      size: 1024,
      uploadedBy: userId,
    },
  });

  if (pendingApproval4a) {
    await approveAdvancePayment({
      ownerAdminId,
      approvalId: pendingApproval4a.id,
      approvedByUserId: userId,
      bankProofFileId: dummyStorage4.id,
      remarks: "Approved advance 1.",
    });
  }

  // Request Advance 2 (1000) - Keep Pending
  await submitAdvancePaymentApproval({
    ownerAdminId,
    registrationId: reg4.id,
    advanceAmount: 1000,
    paymentDate: new Date(),
    paymentMode: "UPI",
    referenceNumber: "UPI123456",
    performedByUserId: userId,
  });

  const updatedReg4 = await prisma.registration.findUnique({ where: { id: reg4.id } });
  console.log(`[TEST 4 RESULT] Reg ID: ${reg4.id}`);
  console.log(`  Total Charges: ₹${updatedReg4?.totalCharges}`);
  console.log(`  Approved Advance: ₹${updatedReg4?.advancePaid}`);
  console.log(`  Balance Amount: ₹${updatedReg4?.balanceAmount}`);

  if (Number(updatedReg4?.advancePaid) !== 500 || Number(updatedReg4?.balanceAmount) !== 9500) {
    console.error(`❌ TEST CASE 4 FAILED! Expected Approved Advance = 500, Balance = 9500. Got Advance = ${updatedReg4?.advancePaid}, Balance = ${updatedReg4?.balanceAmount}`);
  } else {
    console.log("✅ TEST CASE 4 PASSED!");
  }

  console.log("\n==========================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
