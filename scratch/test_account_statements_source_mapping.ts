import { prisma } from "../src/lib/prisma";
import {
  submitAdvancePaymentApproval,
  approveAdvancePayment,
} from "../src/features/revenue/server/advance-payment-approval.service";
import { getAccountStatements } from "../src/features/account-statements/server/account-statements.service";

async function runTest() {
  console.log("=== STARTING ACCOUNT STATEMENTS SOURCE MAPPING TEST ===");

  // 1. Find or create an ownerAdmin and office
  const admin = await prisma.user.findFirst({
    where: { isActive: true },
  });

  if (!admin) {
    throw new Error("No active user found for testing.");
  }

  const ownerAdminId = admin.ownerAdminId || admin.id;

  const office = await prisma.officeLocation.findFirst({
    where: { ownerAdminId },
  });

  const officeName = office?.officeName || "Dubai Head Office";

  // Clean up any old test registrations
  const testTracking1 = "TEST-TRK-9846";
  const testTracking2 = "TEST-TRK-9847";

  await prisma.accountStatementEntry.deleteMany({
    where: { trackingNumber: { in: [testTracking1, testTracking2] } },
  });
  await prisma.advancePaymentApproval.deleteMany({
    where: { trackingNumber: { in: [testTracking1, testTracking2] } },
  });
  await prisma.registration.deleteMany({
    where: { trackingNumber: { in: [testTracking1, testTracking2] } },
  });

  // Create test original proof file
  const originalProof = await prisma.fileStorage.create({
    data: {
      module: "REVENUE",
      folder: "revenue",
      originalName: "original_customer_bank_slip.pdf",
      storedName: "stored_customer_bank_slip.pdf",
      bucketKey: "proofs/original_customer_bank_slip.pdf",
      url: "/api/files/test_customer_slip/view",
      mimeType: "application/pdf",
      extension: "pdf",
      size: 12345,
      uploadedBy: admin.id,
    },
  });

  // Create approver verification proof file
  const approverProof = await prisma.fileStorage.create({
    data: {
      module: "REVENUE",
      folder: "revenue",
      originalName: "approver_bank_statement.pdf",
      storedName: "stored_approver_bank_statement.pdf",
      bucketKey: "proofs/approver_bank_statement.pdf",
      url: "/api/files/test_approver_statement/view",
      mimeType: "application/pdf",
      extension: "pdf",
      size: 54321,
      uploadedBy: admin.id,
    },
  });

  // Create registration for non-cash Bank Transfer advance
  const reg1 = await prisma.registration.create({
    data: {
      trackingNumber: testTracking1,
      customerName: "Rahul Sharma",
      mobile: "9876543210",
      regionOfRegistration: officeName,
      totalCharges: 5000,
      advancePaid: 0,
      balanceAmount: 5000,
      paymentMode: "Bank Transfer",
      bankName: "State Bank of India",
      transactionRefNo: "9846",
      paymentDescription: "9846 transfer to State Bank of India",
      collectedPerson: "Front Desk Staff",
      ownerAdminId,
      createdBy: admin.id,
    },
  });

  console.log("Created registration 1:", reg1.trackingNumber);

  // 2. Submit Advance Payment Request
  const approval1 = await submitAdvancePaymentApproval({
    ownerAdminId,
    registrationId: reg1.id,
    advanceAmount: 2000,
    paymentDate: new Date("2026-09-24"),
    paymentMode: "Bank Transfer",
    referenceNumber: "Ref: 9846 (State Bank of India)",
    collectedBy: "Front Desk Staff",
    remarks: "9846 transfer to State Bank of India",
    receiptFileId: originalProof.id,
    performedByUserId: admin.id,
    bankName: "State Bank of India",
    transactionRefNo: "9846",
  });

  console.log("Submitted Advance Payment Request 1:", approval1.id);

  // 3. Approve the request with Approver's verification details
  const approved1 = await approveAdvancePayment({
    ownerAdminId,
    approvalId: approval1.id,
    approvedByUserId: admin.id,
    bankProofFileId: approverProof.id,
    approvalDate: "2026-09-24",
    remarks: "Approved by Finance Manager after statement check",
  });

  console.log("Approved Advance Payment 1:", approved1.status);

  // 4. Test Cash Advance Registration
  const reg2 = await prisma.registration.create({
    data: {
      trackingNumber: testTracking2,
      customerName: "Anita Desai",
      mobile: "9876543211",
      regionOfRegistration: officeName,
      totalCharges: 3000,
      advancePaid: 0,
      balanceAmount: 3000,
      paymentMode: "Cash",
      paymentDescription: "Cash advance for 9847",
      collectedPerson: "Cashier Staff",
      ownerAdminId,
      createdBy: admin.id,
    },
  });

  const approval2 = await submitAdvancePaymentApproval({
    ownerAdminId,
    registrationId: reg2.id,
    advanceAmount: 500,
    paymentDate: new Date("2026-09-24"),
    paymentMode: "Cash",
    collectedBy: "Cashier Staff",
    remarks: "Cash advance for 9847",
    receiptFileId: originalProof.id,
    performedByUserId: admin.id,
  });

  await approveAdvancePayment({
    ownerAdminId,
    approvalId: approval2.id,
    approvedByUserId: admin.id,
    bankProofFileId: approverProof.id,
    approvalDate: "2026-09-24",
    remarks: "Cash receipt verified",
  });

  console.log("Approved Advance Payment 2 (Cash)");

  // 5. Query Account Statements
  const statements = await getAccountStatements(
    ownerAdminId,
    {
      office: officeName,
      fromDate: "2026-09-01",
      toDate: "2026-09-30",
    },
    { isSuperAdmin: true }
  );

  console.log("=== ACCOUNT STATEMENTS RESULT ===");
  console.log("Credit Advances (Cash):", JSON.stringify(statements.credit.advances, null, 2));
  console.log("Credit More Advances (Non-Cash):", JSON.stringify(statements.credit.moreAdvances, null, 2));
  console.log("Debit Groups:", JSON.stringify(statements.debit.groups, null, 2));

  // Assertions
  const nonCashItem = statements.credit.moreAdvances.find((it) => it.trackingNumber === testTracking1);
  if (!nonCashItem) {
    throw new Error(`Failed: More Advances does not contain item for ${testTracking1}`);
  }

  console.log("\n--- Verification 1: More Advances Data Source ---");
  console.log("Amount:", nonCashItem.amount, "(Expected: 2000)");
  console.log("Payment Mode:", nonCashItem.paymentMode, "(Expected: Bank Transfer)");
  console.log("Bank Name:", nonCashItem.bankName, "(Expected: State Bank of India)");
  console.log("Narration/Remarks:", nonCashItem.narration, "(Expected: 9846 transfer to State Bank of India)");
  console.log("Tracking Number:", nonCashItem.trackingNumber, "(Expected: TEST-TRK-9846)");
  console.log("Proof URL:", nonCashItem.proofFileUrl, `(Expected: /api/files/${originalProof.id}/view)`);
  console.log("Proof Name:", nonCashItem.proofFileName, `(Expected: ${originalProof.originalName})`);

  if (nonCashItem.amount !== 2000) throw new Error("Mismatch in Amount");
  if (nonCashItem.paymentMode !== "Bank Transfer") throw new Error("Mismatch in Payment Mode");
  if (nonCashItem.bankName !== "State Bank of India") throw new Error("Mismatch in Bank Name");
  if (nonCashItem.narration !== "9846 transfer to State Bank of India") throw new Error("Mismatch in Narration");
  if (!nonCashItem.proofFileUrl?.includes(originalProof.id) && nonCashItem.proofFileUrl !== originalProof.url) {
    throw new Error("Proof URL is NOT the original Advance Payment Request proof!");
  }

  console.log("\n--- Verification 2: Debit Bank Payment Transactions ---");
  const bankGroup = statements.debit.groups.find((g) => g.accountName === "Bank Payment Transactions");
  if (!bankGroup) {
    throw new Error("Failed: Debit groups does not contain 'Bank Payment Transactions'");
  }
  const bankDebitItem = bankGroup.items.find((it) => it.trackingNumber === testTracking1);
  if (!bankDebitItem) {
    throw new Error(`Failed: Bank Payment Transactions does not contain debit item for ${testTracking1}`);
  }

  console.log("Debit Account Name:", bankDebitItem.accountName, "(Expected: State Bank of India)");
  console.log("Debit Narration:", bankDebitItem.narration, "(Expected: 9846 transfer to State Bank of India)");
  console.log("Debit Amount:", bankDebitItem.amount, "(Expected: 2000)");
  console.log("Debit Proof URL:", bankDebitItem.proofFileUrl, `(Expected: original slip /api/files/${originalProof.id}/view)`);

  if (bankDebitItem.accountName !== "State Bank of India") throw new Error("Mismatch in Debit Account Name");
  if (bankDebitItem.narration !== "9846 transfer to State Bank of India") throw new Error("Mismatch in Debit Narration");
  if (bankDebitItem.amount !== 2000) throw new Error("Mismatch in Debit Amount");

  console.log("\n--- Verification 3: Advances (Cash) ---");
  const cashItem = statements.credit.advances.find((it) => it.trackingNumber === testTracking2);
  if (!cashItem) {
    throw new Error(`Failed: Cash advances does not contain item for ${testTracking2}`);
  }
  console.log("Cash Advance Amount:", cashItem.amount, "(Expected: 500)");
  console.log("Cash Advance Mode:", cashItem.paymentMode, "(Expected: Cash)");
  console.log("Cash Advance Narration:", cashItem.narration, "(Expected: Cash advance for 9847)");
  if (cashItem.amount !== 500) throw new Error("Mismatch in Cash Advance Amount");

  console.log("\n--- Verification 4: Approval Remarks Not Overriding Request Data ---");
  if (nonCashItem.narration?.includes("Approved by Finance Manager")) {
    throw new Error("Approval remarks incorrectly leaked into Statement Narration!");
  }
  if (nonCashItem.proofFileUrl?.includes(approverProof.id)) {
    throw new Error("Approver proof file incorrectly replaced original customer slip!");
  }

  // Clean up test records
  await prisma.accountStatementEntry.deleteMany({
    where: { trackingNumber: { in: [testTracking1, testTracking2] } },
  });
  await prisma.advancePaymentApproval.deleteMany({
    where: { trackingNumber: { in: [testTracking1, testTracking2] } },
  });
  await prisma.registration.deleteMany({
    where: { trackingNumber: { in: [testTracking1, testTracking2] } },
  });
  await prisma.fileStorage.deleteMany({
    where: { id: { in: [originalProof.id, approverProof.id] } },
  });

  console.log("\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
