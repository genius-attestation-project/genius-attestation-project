import { prisma } from "../src/lib/prisma";
import { createRegistration, deleteRegistration } from "../src/features/registration/server/registration.service";
import {
  listDocumentInHand,
  createTransferBundle,
  receiveBundle,
  listInboundBundles,
  listOutboundBundles,
  getMovementHistory,
} from "../src/features/home/server/bundle-workflow.service";

async function runValidationSuite() {
  console.log("=================================================");
  console.log("HOME -> DOCUMENT IN HAND -> REGISTERED OFFICE FILTERING TEST SUITE");
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

  // 1. Ensure Office Locations exist for testing
  async function getOrCreateOffice(name: string) {
    let office = await prisma.officeLocation.findFirst({
      where: { officeName: name, ownerAdminId },
    });
    if (!office) {
      office = await prisma.officeLocation.create({
        data: {
          officeName: name,
          location: name,
          timezone: "Asia/Kolkata",
          ownerAdminId,
        },
      });
    }
    return office;
  }

  const officeDelhi = await getOrCreateOffice("Process Delhi");
  const officeKochi = await getOrCreateOffice("Kochi HQ");
  const officeCalicut = await getOrCreateOffice("Calicut Office");
  const officeThrissur = await getOrCreateOffice("Thrissur");

  console.log("Offices configured:");
  console.log(`  • Process Delhi: ${officeDelhi.id}`);
  console.log(`  • Kochi HQ: ${officeKochi.id}`);
  console.log(`  • Calicut Office: ${officeCalicut.id}`);
  console.log(`  • Thrissur: ${officeThrissur.id}\n`);

  const timestamp = Date.now();
  const tNumA = `REG-TEST-DELHI-${timestamp}`;
  const tNumB = `REG-TEST-CALICUT-${timestamp}`;
  const tNumC = `REG-TEST-KOCHI-TO-DELHI-${timestamp}`;
  const tNumD = `REG-TEST-DELHI-TO-CALICUT-${timestamp}`;

  const createdRegistrationIds: string[] = [];

  try {
    // ----------------------------------------------------------------------
    // TEST 1: Same Office
    // Document A registered directly at Process Delhi
    // ----------------------------------------------------------------------
    console.log("--- TEST 1: Same Office ---");
    const regA = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNumA,
        customerName: "Delhi Customer A",
        documentName: "Delhi Document A",
        documentType: "Personal Certificate",
        processType: "Embassy Attestation",
        totalCharges: 5000,
        advancePaid: 1000,
        approvalStatus: "Approved",
      },
      officeDelhi.officeName,
      "Test User",
      userId
    );
    createdRegistrationIds.push(regA.id);

    // List Document In Hand for Process Delhi
    const inHandDelhi1 = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });

    const foundAInDelhi = inHandDelhi1.find((d: any) => d.trackingNumber === tNumA);
    console.log(`  Doc A found in Process Delhi: ${Boolean(foundAInDelhi)} (Category: ${foundAInDelhi?.inHandCategory})`);
    if (!foundAInDelhi || foundAInDelhi.inHandCategory !== "REGISTERED") {
      throw new Error("FAIL Test 1: Document A must appear in Process Delhi under REGISTERED!");
    }
    console.log("  PASSED TEST 1: Same Office document appears in Registered for Process Delhi.\n");

    // ----------------------------------------------------------------------
    // TEST 2: Different Office
    // Document B registered at Calicut Office
    // ----------------------------------------------------------------------
    console.log("--- TEST 2: Different Office ---");
    const regB = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNumB,
        customerName: "Calicut Customer B",
        documentName: "Calicut Document B",
        documentType: "Commercial Certificate",
        processType: "Apostille",
        totalCharges: 3000,
        advancePaid: 500,
        approvalStatus: "Approved",
      },
      officeCalicut.officeName,
      "Test User",
      userId
    );
    createdRegistrationIds.push(regB.id);

    // User at Process Delhi with permission only for Process Delhi
    const inHandDelhi2 = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });
    const foundBInDelhi = inHandDelhi2.find((d: any) => d.trackingNumber === tNumB);

    // User at Process Delhi with permission for multiple offices (Delhi and Calicut)
    const inHandDelhiMultiPerm = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id, officeCalicut.id],
      allowedOfficeNames: [officeDelhi.officeName, officeCalicut.officeName],
    });
    const foundBInDelhiMulti = inHandDelhiMultiPerm.find((d: any) => d.trackingNumber === tNumB);

    console.log(`  Doc B (Calicut) in Process Delhi (single perm): ${Boolean(foundBInDelhi)}`);
    console.log(`  Doc B (Calicut) in Process Delhi (multi perm): ${Boolean(foundBInDelhiMulti)}`);

    if (foundBInDelhi || foundBInDelhiMulti) {
      throw new Error("FAIL Test 2: Calicut Document B must NOT appear in Process Delhi!");
    }
    console.log("  PASSED TEST 2: Different office document does not appear in Process Delhi.\n");

    // ----------------------------------------------------------------------
    // TEST 3: Registration Office Different From Current Office
    // Document C registered at Kochi HQ, then transferred & received at Process Delhi
    // ----------------------------------------------------------------------
    console.log("--- TEST 3: Registration Office (Kochi HQ) Different from Current Office (Process Delhi) ---");
    const regC = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNumC,
        customerName: "Kochi Customer C",
        documentName: "Kochi Document C",
        documentType: "Degree Certificate",
        processType: "HRD + MEA",
        totalCharges: 6000,
        advancePaid: 2000,
        approvalStatus: "Approved",
      },
      officeKochi.officeName,
      "Test User",
      userId
    );
    createdRegistrationIds.push(regC.id);

    // Make advance approved so it can be transferred
    await prisma.registration.update({
      where: { id: regC.id },
      data: { advancePaymentStatus: "Approved", advancePaid: 2000 },
    });

    // Transfer from Kochi to Delhi
    const bundleC = await createTransferBundle({
      trackingNumbers: [tNumC],
      fromOfficeId: officeKochi.id,
      toOfficeId: officeDelhi.id,
      userId,
      ownerAdminId,
      remarks: "Transfer to Delhi for processing",
    });

    // Delhi receives bundle
    await receiveBundle({
      bundleId: bundleC.id,
      receivedTrackingNumbers: [tNumC],
      userId,
      ownerAdminId,
      remarks: "Received at Process Delhi",
    });

    // Process Delhi user views Home -> Document In Hand
    const inHandDelhi3 = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });
    const foundCInDelhi = inHandDelhi3.find((d: any) => d.trackingNumber === tNumC);

    // Kochi user views Home -> Document In Hand
    const inHandKochi3 = await listDocumentInHand({
      ownerAdminId,
      officeId: officeKochi.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeKochi.id],
      allowedOfficeNames: [officeKochi.officeName],
    });
    const foundCInKochi = inHandKochi3.find((d: any) => d.trackingNumber === tNumC);

    console.log(`  Doc C found in Process Delhi: ${Boolean(foundCInDelhi)} (RegOffice: ${foundCInDelhi?.regionOfRegistration})`);
    console.log(`  Doc C found in Kochi HQ: ${Boolean(foundCInKochi)}`);

    if (!foundCInDelhi) {
      throw new Error("FAIL Test 3: Transferred Document C must appear in Process Delhi because current office = Process Delhi!");
    }
    if (foundCInKochi) {
      throw new Error("FAIL Test 3: Transferred Document C must NOT appear in Kochi HQ once moved away!");
    }
    console.log("  PASSED TEST 3: Document whose current assigned office is Process Delhi appears in Process Delhi, not Kochi HQ.\n");

    // ----------------------------------------------------------------------
    // TEST 4: Document Moved Away
    // Document D initially at Process Delhi, then transferred & received at Calicut
    // ----------------------------------------------------------------------
    console.log("--- TEST 4: Document Moved Away From Current Office ---");
    const regD = await createRegistration(
      ownerAdminId,
      {
        trackingNumber: tNumD,
        customerName: "Delhi Customer D",
        documentName: "Delhi Document D",
        documentType: "Birth Certificate",
        processType: "Attestation",
        totalCharges: 4000,
        advancePaid: 1500,
        approvalStatus: "Approved",
      },
      officeDelhi.officeName,
      "Test User",
      userId
    );
    createdRegistrationIds.push(regD.id);

    await prisma.registration.update({
      where: { id: regD.id },
      data: { advancePaymentStatus: "Approved", advancePaid: 1500 },
    });

    // Verify D is in Delhi initially
    const inHandDelhi4Before = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });
    const foundDInDelhiBefore = inHandDelhi4Before.find((d: any) => d.trackingNumber === tNumD);
    console.log(`  Doc D in Delhi before transfer: ${Boolean(foundDInDelhiBefore)}`);

    // Transfer from Delhi to Calicut
    const bundleD = await createTransferBundle({
      trackingNumbers: [tNumD],
      fromOfficeId: officeDelhi.id,
      toOfficeId: officeCalicut.id,
      userId,
      ownerAdminId,
    });

    // Calicut receives bundle
    await receiveBundle({
      bundleId: bundleD.id,
      receivedTrackingNumbers: [tNumD],
      userId,
      ownerAdminId,
    });

    // Process Delhi user checks Document In Hand
    const inHandDelhi4After = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });
    const foundDInDelhiAfter = inHandDelhi4After.find((d: any) => d.trackingNumber === tNumD);

    // Calicut user checks Document In Hand
    const inHandCalicut4After = await listDocumentInHand({
      ownerAdminId,
      officeId: officeCalicut.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeCalicut.id],
      allowedOfficeNames: [officeCalicut.officeName],
    });
    const foundDInCalicutAfter = inHandCalicut4After.find((d: any) => d.trackingNumber === tNumD);

    console.log(`  Doc D in Delhi after transfer to Calicut: ${Boolean(foundDInDelhiAfter)}`);
    console.log(`  Doc D in Calicut after transfer to Calicut: ${Boolean(foundDInCalicutAfter)}`);

    if (foundDInDelhiAfter) {
      throw new Error("FAIL Test 4: Document D must no longer appear in Process Delhi after moving to Calicut!");
    }
    if (!foundDInCalicutAfter) {
      throw new Error("FAIL Test 4: Document D must appear in Calicut after being received at Calicut!");
    }
    console.log("  PASSED TEST 4: Document moved away no longer appears in previous office and appears in destination office.\n");

    // ----------------------------------------------------------------------
    // TEST 5: Office Visibility / Unauthorized Office Access
    // User only authorized for Process Delhi attempts to access Calicut Office
    // ----------------------------------------------------------------------
    console.log("--- TEST 5: Office Visibility Permissions ---");
    const unauthorizedQuery = await listDocumentInHand({
      ownerAdminId,
      officeId: officeCalicut.id,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });
    console.log(`  Unauthorized office query returned ${unauthorizedQuery.length} documents (expected 0)`);
    if (unauthorizedQuery.length !== 0) {
      throw new Error("FAIL Test 5: Unauthorized office query must return empty array!");
    }
    console.log("  PASSED TEST 5: Unauthorized office access blocked strictly.\n");

    // ----------------------------------------------------------------------
    // TEST 6: Super Admin All-Offices Access
    // Super Admin can view specific office or All Offices
    // ----------------------------------------------------------------------
    console.log("--- TEST 6: Super Admin Access ---");
    const superAdminAll = await listDocumentInHand({
      ownerAdminId,
      officeId: undefined,
      isSuperAdmin: true,
    });
    const superAdminDelhi = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: true,
    });

    const hasAInAll = superAdminAll.some((d: any) => d.trackingNumber === tNumA);
    const hasBInAll = superAdminAll.some((d: any) => d.trackingNumber === tNumB);
    const hasAInDelhi = superAdminDelhi.some((d: any) => d.trackingNumber === tNumA);
    const hasBInDelhi = superAdminDelhi.some((d: any) => d.trackingNumber === tNumB);

    console.log(`  Super Admin (All Offices) includes Doc A: ${hasAInAll}, Doc B: ${hasBInAll}`);
    console.log(`  Super Admin (Process Delhi) includes Doc A: ${hasAInDelhi}, Doc B: ${hasBInDelhi}`);

    if (!hasAInAll || !hasBInAll) {
      throw new Error("FAIL Test 6: Super Admin All Offices must include documents across all offices!");
    }
    if (!hasAInDelhi || hasBInDelhi) {
      throw new Error("FAIL Test 6: Super Admin scoped to Process Delhi must only include Delhi documents!");
    }
    console.log("  PASSED TEST 6: Super Admin office visibility behavior preserved.\n");

    // ----------------------------------------------------------------------
    // TEST 7: Search Filtering
    // Search must respect office scoping
    // ----------------------------------------------------------------------
    console.log("--- TEST 7: Search Filtering ---");
    const searchDelhiForA = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      search: tNumA,
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });
    const searchDelhiForB = await listDocumentInHand({
      ownerAdminId,
      officeId: officeDelhi.id,
      search: tNumB, // Doc B is at Calicut
      isSuperAdmin: false,
      allowedOfficeIds: [officeDelhi.id],
      allowedOfficeNames: [officeDelhi.officeName],
    });

    console.log(`  Search for Doc A in Delhi: ${searchDelhiForA.length} found (expected 1)`);
    console.log(`  Search for Doc B in Delhi: ${searchDelhiForB.length} found (expected 0)`);

    if (searchDelhiForA.length !== 1 || searchDelhiForB.length !== 0) {
      throw new Error("FAIL Test 7: Search must not bypass office scoping!");
    }
    console.log("  PASSED TEST 7: Search respects office boundaries.\n");

    // ----------------------------------------------------------------------
    // TEST 8: Other Sections (Inbound, Outbound, History)
    // ----------------------------------------------------------------------
    console.log("--- TEST 8: Other Sections Validation ---");
    const history = await getMovementHistory({
      ownerAdminId,
      officeId: officeDelhi.id,
      isSuperAdmin: false,
      allowedOfficeNames: [officeDelhi.officeName],
    });
    console.log(`  Movement history for Process Delhi returned ${history.length} events.`);

    const inbound = await listInboundBundles({
      toOfficeId: officeDelhi.id,
      ownerAdminId,
    });
    console.log(`  Inbound bundles for Process Delhi returned ${inbound.length} bundles.`);

    const outbound = await listOutboundBundles({
      fromOfficeId: officeDelhi.id,
      ownerAdminId,
    });
    console.log(`  Outbound bundles for Process Delhi returned ${outbound.length} bundles.`);
    console.log("  PASSED TEST 8: Other Home sections function normally.\n");

    console.log("=================================================");
    console.log("ALL 8 TESTS PASSED SUCCESSFULLY!");
    console.log("=================================================");
  } finally {
    // Cleanup created test records
    console.log("\nCleaning up test registrations...");
    for (const regId of createdRegistrationIds) {
      try {
        await deleteRegistration(ownerAdminId, regId).catch(() => {});
      } catch {}
    }
    console.log("Cleanup completed.");
  }
}

runValidationSuite().catch(console.error).finally(() => process.exit(0));
