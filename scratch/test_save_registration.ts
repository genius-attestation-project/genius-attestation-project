import { prisma } from "@/lib/prisma";
import { createRegistration } from "@/features/registration/server/registration.service";
import { registrationInputSchema } from "@/features/registration/validations/registration.schema";

async function testSave() {
  console.log("\n====================================================");
  console.log("TESTING SAVE REGISTRATION FLOW (3 TEST CASES)");
  console.log("====================================================\n");

  const user = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true, ownerAdminId: true, officeLocationName: true },
  });

  if (!user) throw new Error("No active user found.");

  const ownerAdminId = user.ownerAdminId ?? user.id;
  const office = await prisma.officeLocation.findFirst({ where: { ownerAdminId } });
  const officeName = office?.officeName || user.officeLocationName || "Main Office";

  const ts = Date.now();

  // Test Case 1: Create registration without advance
  console.log("--- TEST CASE 1: Save Registration without Advance ---");
  const payload1 = {
    trackingNumber: `SAVE-TEST-1-${ts}`,
    customerName: "Save Test Customer 1",
    mobile: "+919876543210",
    email: "save1@example.com",
    address: "123 Street",
    country: "India",
    state: null,
    city: null,
    customerType: "Individual",
    corporateDetailId: null,
    documentType: "Degree Certificate",
    documentName: "Bachelor Degree",
    documentIssuedCountry: "India",
    processType: "HRD Attestation",
    subPackage: null,
    externalProcess: "None",
    priority: "Normal",
    committedDuration: "7 Working Days",
    deliveryLocation: officeName,
    totalCharges: "5000",
    advancePaid: "0",
    requestedAdvanceAmount: "0",
    paymentMode: "Cash",
    paymentStatus: "Pending Approval",
    approvalStatus: "Pending",
  };

  const parsed1 = registrationInputSchema.parse(payload1);
  const reg1 = await createRegistration(ownerAdminId, parsed1, officeName, "Test Runner", user.id);

  console.log(`Saved Reg 1 [${reg1.trackingNumber}]:`);
  console.log(`  Total: ₹${reg1.totalCharges}, Approved Advance: ₹${reg1.advancePaid}, Balance: ₹${reg1.balanceAmount}`);
  if (Number(reg1.totalCharges) !== 5000 || Number(reg1.balanceAmount) !== 5000) {
    throw new Error(`FAIL Test 1: Unexpected balance or total charges: ${reg1.balanceAmount}`);
  }
  console.log(">>> TEST CASE 1 PASSED!\n");

  // Test Case 2: Create registration with ₹500 Requested Advance
  console.log("--- TEST CASE 2: Save Registration with ₹500 Advance Requested ---");
  const payload2 = {
    trackingNumber: `SAVE-TEST-2-${ts}`,
    customerName: "Save Test Customer 2",
    mobile: "+919876543211",
    email: "save2@example.com",
    address: "456 Street",
    country: "India",
    state: null,
    city: null,
    customerType: "Individual",
    corporateDetailId: null,
    documentType: "Degree Certificate",
    documentName: "Master Degree",
    documentIssuedCountry: "India",
    processType: "MEA Attestation",
    subPackage: null,
    externalProcess: "None",
    priority: "Normal",
    committedDuration: "5 Working Days",
    deliveryLocation: officeName,
    totalCharges: "₹ 5,000",
    advancePaid: "₹ 500",
    requestedAdvanceAmount: "₹ 500",
    paymentMode: "Cash",
    paymentStatus: "Pending Approval",
    approvalStatus: "Pending",
  };

  const parsed2 = registrationInputSchema.parse(payload2);
  const reg2 = await createRegistration(ownerAdminId, parsed2, officeName, "Test Runner", user.id);

  console.log(`Saved Reg 2 [${reg2.trackingNumber}]:`);
  console.log(`  Total: ₹${reg2.totalCharges}, Approved Advance: ₹${reg2.advancePaid}, Balance: ₹${reg2.balanceAmount}, Status: ${reg2.advancePaymentStatus}`);
  if (Number(reg2.balanceAmount) !== 5000) {
    throw new Error(`FAIL Test 2: Expected balance = 5000, got ${reg2.balanceAmount}`);
  }
  console.log(">>> TEST CASE 2 PASSED!\n");

  // Test Case 3: Registration with files simulation
  console.log("--- TEST CASE 3: Save Registration with File Upload Simulation ---");
  const fileStorage = await prisma.fileStorage.create({
    data: {
      module: "Revenue Registration",
      folder: "documents",
      originalName: "project_1.jpg",
      storedName: `project_1_${ts}.jpg`,
      bucketKey: `documents/${ts}.jpg`,
      url: `/api/files/test-${ts}/view`,
      mimeType: "image/jpeg",
      extension: "jpg",
      size: 2048,
      uploadedBy: user.id,
    },
  });

  await prisma.registrationFile.create({
    data: {
      registrationId: reg2.id,
      fileStorageId: fileStorage.id,
      fileCategory: "DOCUMENT",
    },
  });

  const reg2WithFiles = await prisma.registration.findUnique({
    where: { id: reg2.id },
    include: { files: { include: { fileStorage: true } } },
  });

  console.log(`Reg 2 Linked Files count: ${reg2WithFiles?.files.length}, File name: ${reg2WithFiles?.files[0]?.fileStorage?.originalName}`);
  if (reg2WithFiles?.files.length !== 1) {
    throw new Error("FAIL Test 3: File link failed.");
  }
  console.log(">>> TEST CASE 3 PASSED!\n");

  // Cleanup test records
  await prisma.registration.deleteMany({ where: { id: { in: [reg1.id, reg2.id] } } });
  await prisma.fileStorage.delete({ where: { id: fileStorage.id } }).catch(() => null);

  console.log("====================================================");
  console.log("ALL 3 SAVE REGISTRATION TEST CASES PASSED SUCCESSFULLY!");
  console.log("====================================================\n");
}

testSave()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
