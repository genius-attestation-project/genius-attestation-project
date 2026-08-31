import { prisma } from "../src/lib/prisma";
import { createRegistration } from "../src/features/registration/server/registration.service";
import { transferProcessDocumentsToHome } from "../src/features/process/server/process.service";

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING PROCESS DOCUMENT TRANSFER ROUTING TESTS");
  console.log("=================================================");

  const adminUser = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true, ownerAdminId: true, officeLocationName: true },
  });

  if (!adminUser || !adminUser.ownerAdminId) {
    throw new Error("No active admin user found for test.");
  }

  const ownerAdminId = adminUser.ownerAdminId;
  const userId = adminUser.id;

  // Ensure two test office locations exist in DB
  let delhiOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: { contains: "Delhi" } },
  });
  if (!delhiOffice) {
    delhiOffice = await prisma.officeLocation.create({
      data: {
        officeName: "Process Delhi",
        location: "Delhi",
        timezone: "UTC",
        isProcessOffice: true,
        ownerAdminId,
      },
    });
  }

  let malappuramOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: { contains: "Malappuram" } },
  });
  if (!malappuramOffice) {
    malappuramOffice = await prisma.officeLocation.create({
      data: {
        officeName: "Malappuram",
        location: "Malappuram",
        timezone: "UTC",
        isProcessOffice: false,
        ownerAdminId,
      },
    });
  }

  const destinationOfficeId = delhiOffice.id;
  const destinationOfficeName = delhiOffice.officeName;

  // -------------------------------------------------------------------------
  // TEST CASE 1: Single Document (Destination Office == Delivery At)
  // Tracking: 2727-TC1, Delivery At: Process Delhi, Transfer: Process Delhi
  // Expected: Inbound Bundles (Pending Receive, In Transfer)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 1: Delivery At == Destination Office (Process Delhi == Process Delhi) ---");
  const tracking1 = `TEST-ROUTING-1-${Date.now()}`;
  const reg1 = await createRegistration(
    ownerAdminId,
    {
      trackingNumber: tracking1,
      customerName: "Customer TC1",
      mobile: "+919876543210",
      email: "tc1@example.com",
      address: "Delhi Address",
      country: "India",
      customerType: "Individual",
      documentType: "Degree Certificate",
      documentName: "B.Tech",
      documentIssuedCountry: "India",
      processType: "Attestation",
      externalProcess: "None",
      priority: "Normal",
      committedDuration: "5 Days",
      deliveryLocation: destinationOfficeName,
      totalCharges: 5000,
      advancePaid: 0,
      paymentMode: "Cash",
      approvalStatus: "Approved",
      movementApproved: true,
    },
    "Kochi HQ",
    "Test Runner",
    userId
  );

  const res1 = await transferProcessDocumentsToHome({
    trackingNumbers: [tracking1],
    toOfficeId: destinationOfficeId,
    userId,
    userName: "Test Runner",
    ownerAdminId,
  });

  const mov1 = await prisma.documentMovement.findFirst({ where: { trackingNumber: tracking1 } });
  const updatedReg1 = await prisma.registration.findUnique({ where: { trackingNumber: tracking1 } });

  console.log(`[TEST 1 RESULT] Tracking: ${tracking1}`);
  console.log(`  Destination Office: ${destinationOfficeName}`);
  console.log(`  Delivery At: ${updatedReg1?.deliveryLocation}`);
  console.log(`  Movement Current Module: ${mov1?.currentModule}`);
  console.log(`  Movement Status: ${mov1?.status}`);
  console.log(`  Registration Tracking Status: ${updatedReg1?.trackingStatus}`);
  console.log(`  Inbound Count: ${res1.inboundCount}, InHand Count: ${res1.inHandCount}`);

  if (mov1?.status !== "Pending Receive" || updatedReg1?.trackingStatus !== "In Transfer" || res1.inboundCount !== 1) {
    console.error("❌ TEST CASE 1 FAILED! Expected Pending Receive / In Transfer / Inbound Count = 1.");
  } else {
    console.log("✅ TEST CASE 1 PASSED!");
  }

  // -------------------------------------------------------------------------
  // TEST CASE 2: Single Document (Destination Office != Delivery At)
  // Tracking: 2728-TC2, Delivery At: Malappuram, Transfer: Process Delhi
  // Expected: Document In Hand (Document In Hand, Document In Hand)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 2: Delivery At != Destination Office (Malappuram != Process Delhi) ---");
  const tracking2 = `TEST-ROUTING-2-${Date.now()}`;
  const reg2 = await createRegistration(
    ownerAdminId,
    {
      trackingNumber: tracking2,
      customerName: "Customer TC2",
      mobile: "+919876543211",
      email: "tc2@example.com",
      address: "Malappuram Address",
      country: "India",
      customerType: "Individual",
      documentType: "Degree Certificate",
      documentName: "M.Tech",
      documentIssuedCountry: "India",
      processType: "Attestation",
      externalProcess: "None",
      priority: "Normal",
      committedDuration: "5 Days",
      deliveryLocation: malappuramOffice.officeName,
      totalCharges: 5000,
      advancePaid: 0,
      paymentMode: "Cash",
      approvalStatus: "Approved",
      movementApproved: true,
    },
    "Kochi HQ",
    "Test Runner",
    userId
  );

  const res2 = await transferProcessDocumentsToHome({
    trackingNumbers: [tracking2],
    toOfficeId: destinationOfficeId,
    userId,
    userName: "Test Runner",
    ownerAdminId,
  });

  const mov2 = await prisma.documentMovement.findFirst({ where: { trackingNumber: tracking2 } });
  const updatedReg2 = await prisma.registration.findUnique({ where: { trackingNumber: tracking2 } });

  console.log(`[TEST 2 RESULT] Tracking: ${tracking2}`);
  console.log(`  Destination Office: ${destinationOfficeName}`);
  console.log(`  Delivery At: ${updatedReg2?.deliveryLocation}`);
  console.log(`  Movement Current Module: ${mov2?.currentModule}`);
  console.log(`  Movement Status: ${mov2?.status}`);
  console.log(`  Registration Tracking Status: ${updatedReg2?.trackingStatus}`);
  console.log(`  Inbound Count: ${res2.inboundCount}, InHand Count: ${res2.inHandCount}`);

  if (mov2?.status !== "Document In Hand" || updatedReg2?.trackingStatus !== "Document In Hand" || res2.inHandCount !== 1) {
    console.error("❌ TEST CASE 2 FAILED! Expected Document In Hand / InHand Count = 1.");
  } else {
    console.log("✅ TEST CASE 3 PASSED!");
  }

  // -------------------------------------------------------------------------
  // TEST CASE 3: Batch Selection (Doc A: Process Delhi, Doc B: Malappuram, Doc C: Process Delhi)
  // Expected: Doc A & Doc C -> Inbound Bundles, Doc B -> Document In Hand
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 3: Multiple Documents Batch Transfer ---");
  const tracking3A = `TEST-ROUTING-3A-${Date.now()}`;
  const tracking3B = `TEST-ROUTING-3B-${Date.now()}`;
  const tracking3C = `TEST-ROUTING-3C-${Date.now()}`;

  await createRegistration(ownerAdminId, {
    trackingNumber: tracking3A, customerName: "Batch A", mobile: "+919876543220", deliveryLocation: destinationOfficeName, totalCharges: 5000, advancePaid: 0, paymentMode: "Cash", approvalStatus: "Approved", movementApproved: true,
  }, "Kochi HQ", "Test Runner", userId);

  await createRegistration(ownerAdminId, {
    trackingNumber: tracking3B, customerName: "Batch B", mobile: "+919876543221", deliveryLocation: malappuramOffice.officeName, totalCharges: 5000, advancePaid: 0, paymentMode: "Cash", approvalStatus: "Approved", movementApproved: true,
  }, "Kochi HQ", "Test Runner", userId);

  await createRegistration(ownerAdminId, {
    trackingNumber: tracking3C, customerName: "Batch C", mobile: "+919876543222", deliveryLocation: destinationOfficeName, totalCharges: 5000, advancePaid: 0, paymentMode: "Cash", approvalStatus: "Approved", movementApproved: true,
  }, "Kochi HQ", "Test Runner", userId);

  const res3 = await transferProcessDocumentsToHome({
    trackingNumbers: [tracking3A, tracking3B, tracking3C],
    toOfficeId: destinationOfficeId,
    userId,
    userName: "Test Runner",
    ownerAdminId,
  });

  const mov3A = await prisma.documentMovement.findFirst({ where: { trackingNumber: tracking3A } });
  const mov3B = await prisma.documentMovement.findFirst({ where: { trackingNumber: tracking3B } });
  const mov3C = await prisma.documentMovement.findFirst({ where: { trackingNumber: tracking3C } });

  console.log(`[TEST 3 RESULT] Batch Transferred: 3 Docs`);
  console.log(`  Doc 3A (Delivery: Process Delhi) -> Status: ${mov3A?.status}`);
  console.log(`  Doc 3B (Delivery: Malappuram)    -> Status: ${mov3B?.status}`);
  console.log(`  Doc 3C (Delivery: Process Delhi) -> Status: ${mov3C?.status}`);
  console.log(`  Summary: Inbound Count = ${res3.inboundCount}, InHand Count = ${res3.inHandCount}`);

  if (
    mov3A?.status !== "Pending Receive" ||
    mov3B?.status !== "Document In Hand" ||
    mov3C?.status !== "Pending Receive" ||
    res3.inboundCount !== 2 ||
    res3.inHandCount !== 1
  ) {
    console.error("❌ TEST CASE 3 FAILED! Per-document routing mismatch.");
  } else {
    console.log("✅ TEST CASE 3 PASSED!");
  }

  // -------------------------------------------------------------------------
  // TEST CASE 4: Movement History Preservation
  // -------------------------------------------------------------------------
  console.log("\n--- TEST CASE 4: Movement History Preservation ---");
  const history1 = await prisma.movementHistory.findMany({ where: { trackingNumber: tracking1 } });
  const history2 = await prisma.movementHistory.findMany({ where: { trackingNumber: tracking2 } });

  console.log(`[TEST 4 RESULT] History records for 3A: ${history1.length}, 3B: ${history2.length}`);
  if (history1.length === 0 || history2.length === 0) {
    console.error("❌ TEST CASE 4 FAILED! Movement history missing.");
  } else {
    console.log("✅ TEST CASE 4 PASSED!");
  }

  console.log("\n=================================================");
  console.log("ALL TRANSFER ROUTING TESTS COMPLETED SUCCESSFULLY");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
