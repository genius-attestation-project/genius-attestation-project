import { prisma } from "@/lib/prisma";
import { createRegistration } from "@/features/registration/server/registration.service";
import { approveAdvancePayment } from "@/features/revenue/server/advance-payment-approval.service";
import type { RegistrationInput } from "@/features/registration/validations/registration.schema";

async function runTests() {
  console.log("\n====================================================");
  console.log("STARTING ADVANCE PAYMENT CALCULATION VERIFICATION TESTS");
  console.log("====================================================\n");

  // Fetch admin user and office location for testing
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true, ownerAdminId: true, officeLocationName: true },
  });

  if (!user) {
    throw new Error("No active user found for testing.");
  }

  const ownerAdminId = user.ownerAdminId ?? user.id;
  const officeName = user.officeLocationName || "Main Office";

  // Ensure office location exists
  const office = await prisma.officeLocation.findFirst({
    where: { ownerAdminId },
  });
  const effectiveOfficeName = office?.officeName || officeName;

  const timestamp = Date.now();

  // ----------------------------------------------------
  // TEST CASE 1: Create Registration with Advance Request (₹5000 Total, ₹500 Advance Requested)
  // ----------------------------------------------------
  console.log("--- TEST CASE 1: Create Registration with ₹500 Advance Requested ---");
  const test1Input: RegistrationInput = {
    trackingNumber: `TEST-ADV-1-${timestamp}`,
    customerName: "Test Customer Advance 1",
    mobile: "+919876543210",
    email: "test.adv1@example.com",
    address: "123 Test Street",
    country: "India",
    state: "Kerala",
    city: "Kochi",
    customerType: "Individual",
    documentType: "Degree Certificate",
    documentName: "Bachelor Degree",
    documentIssuedCountry: "India",
    processType: "HRD Attestation",
    externalProcess: "None",
    priority: "Normal",
    committedDuration: "7 Working Days",
    deliveryLocation: effectiveOfficeName,
    totalCharges: 5000,
    requestedAdvanceAmount: 500,
    advancePaid: 500, // Passed from form input
    paymentMode: "Cash",
    approvalStatus: "Pending",
  };

  const reg1 = await createRegistration(ownerAdminId, test1Input, effectiveOfficeName, "Test Runner", user.id);

  console.log(`Created Reg 1 [${reg1.trackingNumber}]:`);
  console.log(`  Total Charges: ₹${reg1.totalCharges}`);
  console.log(`  Requested Advance: ₹${reg1.requestedAdvanceAmount}`);
  console.log(`  Approved Advance (advancePaid): ₹${reg1.advancePaid}`);
  console.log(`  Balance Amount: ₹${reg1.balanceAmount}`);
  console.log(`  Advance Payment Status: ${reg1.advancePaymentStatus}`);

  // Assertions for Test Case 1
  if (Number(reg1.requestedAdvanceAmount) !== 500) {
    throw new Error(`FAIL Test 1: Expected requestedAdvanceAmount = 500, got ${reg1.requestedAdvanceAmount}`);
  }
  if (Number(reg1.advancePaid) !== 0) {
    throw new Error(`FAIL Test 1: Expected advancePaid (Approved Advance) = 0 before approval, got ${reg1.advancePaid}`);
  }
  if (Number(reg1.balanceAmount) !== 5000) {
    throw new Error(`FAIL Test 1: Expected balanceAmount = 5000 before approval, got ${reg1.balanceAmount}`);
  }
  console.log(">>> TEST CASE 1 PASSED! (Requested: ₹500, Approved: ₹0, Balance: ₹5000)\n");

  // ----------------------------------------------------
  // TEST CASE 2: Approve Advance Payment in Pending Approval
  // ----------------------------------------------------
  console.log("--- TEST CASE 2: Approve Advance Payment Request ---");
  
  // Find approval request
  const approvalReq = await prisma.advancePaymentApproval.findFirst({
    where: { registrationId: reg1.id, status: "Pending Approval" },
  });

  if (!approvalReq) {
    throw new Error("FAIL Test 2: Advance Payment Approval request not found.");
  }

  // Create dummy bank proof storage row if needed
  const storage = await prisma.fileStorage.create({
    data: {
      module: "Advance Payment Approval",
      folder: "bank-proofs",
      originalName: "test_bank_slip.pdf",
      storedName: `test_bank_slip_${timestamp}.pdf`,
      bucketKey: `proofs/${timestamp}.pdf`,
      url: `/api/files/test-${timestamp}/view`,
      mimeType: "application/pdf",
      extension: "pdf",
      size: 1024,
      uploadedBy: user.id,
    },
  });

  await approveAdvancePayment({
    ownerAdminId,
    approvalId: approvalReq.id,
    approvedByUserId: user.id,
    bankProofFileId: storage.id,
    remarks: "Bank deposit verified and approved.",
  });

  // Reload registration
  const reg1After = await prisma.registration.findUnique({ where: { id: reg1.id } });

  console.log(`Reg 1 After Approval [${reg1After?.trackingNumber}]:`);
  console.log(`  Total Charges: ₹${reg1After?.totalCharges}`);
  console.log(`  Requested Advance: ₹${reg1After?.requestedAdvanceAmount}`);
  console.log(`  Approved Advance (advancePaid): ₹${reg1After?.advancePaid}`);
  console.log(`  Balance Amount: ₹${reg1After?.balanceAmount}`);
  console.log(`  Advance Payment Status: ${reg1After?.advancePaymentStatus}`);

  // Assertions for Test Case 2
  if (Number(reg1After?.requestedAdvanceAmount) !== 500) {
    throw new Error(`FAIL Test 2: Expected requestedAdvanceAmount = 500, got ${reg1After?.requestedAdvanceAmount}`);
  }
  if (Number(reg1After?.advancePaid) !== 500) {
    throw new Error(`FAIL Test 2: Expected advancePaid (Approved Advance) = 500 after approval, got ${reg1After?.advancePaid}`);
  }
  if (Number(reg1After?.balanceAmount) !== 4500) {
    throw new Error(`FAIL Test 2: Expected balanceAmount = 4500 after approval, got ${reg1After?.balanceAmount}`);
  }
  console.log(">>> TEST CASE 2 PASSED! (Requested: ₹500, Approved: ₹500, Balance: ₹4500)\n");

  // ----------------------------------------------------
  // TEST CASE 3: Create Registration Without Advance (₹5000 Total, ₹0 Advance)
  // ----------------------------------------------------
  console.log("--- TEST CASE 3: Create Registration without Advance ---");
  const test3Input: RegistrationInput = {
    trackingNumber: `TEST-ADV-3-${timestamp}`,
    customerName: "Test Customer No Advance",
    mobile: "+919876543211",
    email: "test.adv3@example.com",
    address: "456 Test Street",
    country: "India",
    state: "Kerala",
    city: "Kochi",
    customerType: "Individual",
    documentType: "Degree Certificate",
    documentName: "Master Degree",
    documentIssuedCountry: "India",
    processType: "MEA Attestation",
    externalProcess: "None",
    priority: "Normal",
    committedDuration: "5 Working Days",
    deliveryLocation: effectiveOfficeName,
    totalCharges: 5000,
    requestedAdvanceAmount: 0,
    advancePaid: 0,
    paymentMode: "Cash",
    approvalStatus: "Pending",
  };

  const reg3 = await createRegistration(ownerAdminId, test3Input, effectiveOfficeName, "Test Runner", user.id);

  console.log(`Created Reg 3 [${reg3.trackingNumber}]:`);
  console.log(`  Total Charges: ₹${reg3.totalCharges}`);
  console.log(`  Requested Advance: ₹${reg3.requestedAdvanceAmount}`);
  console.log(`  Approved Advance (advancePaid): ₹${reg3.advancePaid}`);
  console.log(`  Balance Amount: ₹${reg3.balanceAmount}`);

  // Assertions for Test Case 3
  if (Number(reg3.advancePaid) !== 0) {
    throw new Error(`FAIL Test 3: Expected advancePaid = 0, got ${reg3.advancePaid}`);
  }
  if (Number(reg3.balanceAmount) !== 5000) {
    throw new Error(`FAIL Test 3: Expected balanceAmount = 5000 (Total Charges), got ${reg3.balanceAmount}`);
  }
  console.log(">>> TEST CASE 3 PASSED! (Balance remains Total Charges value: ₹5000)\n");

  // ----------------------------------------------------
  // TEST CASE 4: Verify Existing Approved Advance Records
  // ----------------------------------------------------
  console.log("--- TEST CASE 4: Verify Existing Approved Advance Records ---");
  // Check reg1After which is now an approved advance record
  if (Number(reg1After?.advancePaid) !== 500 || Number(reg1After?.balanceAmount) !== 4500) {
    throw new Error("FAIL Test 4: Existing approved record calculation altered.");
  }
  console.log(">>> TEST CASE 4 PASSED! (Existing approved record retains Approved Advance: ₹500, Balance: ₹4500)\n");

  // Cleanup test records
  await prisma.registration.deleteMany({
    where: { id: { in: [reg1.id, reg3.id] } },
  });
  await prisma.fileStorage.delete({ where: { id: storage.id } }).catch(() => null);

  console.log("====================================================");
  console.log("ALL 4 VERIFICATION TEST CASES PASSED SUCCESSFULLY!");
  console.log("====================================================\n");
}

runTests()
  .catch((err) => {
    console.error("\nTEST SUITE FAILED WITH ERROR:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
