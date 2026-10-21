import { prisma } from "../src/lib/prisma";
import {
  createRegistrationsInTransaction,
  listRegistrations,
  getRegistrationByTrackingNumber,
} from "../src/features/registration/server/registration.service";
import { multiRegistrationInputSchema } from "../src/features/registration/validations/registration.schema";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING MULTI-DOCUMENT REGISTRATION TEST SUITE");
  console.log("==================================================");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}${details ? ` - ${details}` : ""}`);
      failedTests++;
    }
  }

  // 1. Get owner admin user
  const user = await prisma.user.findFirst({
    where: { email: "testuse.dev@gmail.com" },
    include: { officeLocationRef: true },
  });

  if (!user) {
    throw new Error("Test user testuse.dev@gmail.com not found!");
  }

  const ownerAdminId = user.ownerAdminId || user.id;
  const sourceOfficeName = user.officeLocationRef?.officeName || "Dubai Main Office";

  // Ensure office exists
  await prisma.officeLocation.upsert({
    where: { officeName_ownerAdminId: { officeName: sourceOfficeName, ownerAdminId } },
    update: {},
    create: {
      officeName: sourceOfficeName,
      location: "Dubai",
      timezone: "UTC",
      ownerAdminId,
    },
  });

  const uniqueSuffix = Date.now().toString().slice(-6);

  // Clean up any old test records
  const testTrackPrefix = `TEST-${uniqueSuffix}`;
  const trk1 = `${testTrackPrefix}-7854`;
  const trk2 = `${testTrackPrefix}-9846`;
  const trk3 = `${testTrackPrefix}-65236`;
  const trk4 = `${testTrackPrefix}-SINGLE`;
  const trk5 = `${testTrackPrefix}-ADDITIONAL`;

  let createdLeadId: string | null = null;
  let createdBatchId: string | null = null;

  try {
    // Create test lead
    const testLead = await prisma.lead.create({
      data: {
        leadCode: `LEAD-${uniqueSuffix}`,
        firstName: "Ravi",
        lastName: "KK",
        mobileNumber: "9876543210",
        countryCode: "+91",
        email: `ravi.${uniqueSuffix}@example.com`,
        country: "India",
        service: "UAE Embassy With Mofa Nonedu",
        docType: "Degree Certificate",
        documentName: "Ravi Degree",
        documentIssuedCountry: "Qatar",
        ownerAdminId,
      },
    });
    createdLeadId = testLead.id;
    console.log(`Created test lead: ${testLead.leadCode} (${testLead.id})`);

    // ==================================================
    // TEST 1: Create a Lead with one document
    // ==================================================
    const singleDocResult = await createRegistrationsInTransaction(
      ownerAdminId,
      {
        shared: {
          leadId: testLead.id,
          customerName: "Ravi KK",
          mobile: "+919876543210",
          email: "ravi@example.com",
          country: "India",
        },
        documents: [
          {
            trackingNumber: trk4,
            documentType: "Birth Certificate",
            documentName: "Ravi Birth Certificate",
            totalCharges: 2500,
            advancePaid: 1000,
            paymentMode: "Cash",
          },
        ],
      },
      sourceOfficeName,
      user.name || "Test User",
      user.id,
    );

    assert(
      singleDocResult.length === 1 && singleDocResult[0].trackingNumber === trk4,
      "TEST 1: Create a Lead with one document -> Exactly one Registration record created",
    );
    assert(
      singleDocResult[0].registrationBatchId === null,
      "TEST 1b: Single document registration has registrationBatchId = null for backward compatibility",
    );

    // ==================================================
    // TEST 2: Create one Lead with three documents
    // ==================================================
    const threeDocsResult = await createRegistrationsInTransaction(
      ownerAdminId,
      {
        shared: {
          leadId: testLead.id,
          customerName: "Ravi KK",
          mobile: "+919876543210",
          email: "ravi@example.com",
          country: "India",
        },
        documents: [
          {
            trackingNumber: trk1,
            documentType: "Degree Certificate",
            documentName: "Ravi Degree",
            documentIssuedCountry: "Qatar",
            processType: "UAE Embassy With Mofa Nonedu",
            totalCharges: 5000,
            advancePaid: 2000,
            paymentMode: "Bank Transfer",
          },
          {
            trackingNumber: trk2,
            documentType: "Marriage Certificate",
            documentName: "Ravi Marriage Certificate",
            documentIssuedCountry: "Qatar",
            processType: "UAE Embassy With Mofa Nonedu",
            totalCharges: 3000,
            advancePaid: 1000,
            paymentMode: "UPI",
          },
          {
            trackingNumber: trk3,
            documentType: "Mark Sheet",
            documentName: "Ravi Mark Sheet",
            documentIssuedCountry: "Qatar",
            processType: "UAE Embassy With Mofa Nonedu",
            totalCharges: 2000,
            advancePaid: 0,
            paymentMode: "Cash",
          },
        ],
      },
      sourceOfficeName,
      user.name || "Test User",
      user.id,
    );

    assert(
      threeDocsResult.length === 3,
      "TEST 2: Create one Lead with three documents -> Exactly three Registration records created",
    );

    const regA = threeDocsResult.find((r) => r.trackingNumber === trk1)!;
    const regB = threeDocsResult.find((r) => r.trackingNumber === trk2)!;
    const regC = threeDocsResult.find((r) => r.trackingNumber === trk3)!;

    // ==================================================
    // TEST 3: Verify Registration leadId
    // ==================================================
    assert(
      regA.leadId === testLead.id && regB.leadId === testLead.id && regC.leadId === testLead.id,
      "TEST 3: All three registrations share the same leadId",
    );

    // ==================================================
    // TEST 4: Verify Registration database IDs are different
    // ==================================================
    assert(
      regA.id !== regB.id && regB.id !== regC.id && regA.id !== regC.id,
      "TEST 4: All three registrations have unique and distinct database IDs",
    );

    // ==================================================
    // TEST 5: Verify RegistrationBatch relationship
    // ==================================================
    createdBatchId = regA.registrationBatchId || null;
    assert(
      Boolean(regA.registrationBatchId) &&
      regA.registrationBatchId === regB.registrationBatchId &&
      regB.registrationBatchId === regC.registrationBatchId,
      "TEST 5: All three registrations share the same registrationBatchId",
      `Batch IDs: ${regA.registrationBatchId}, ${regB.registrationBatchId}, ${regC.registrationBatchId}`,
    );

    const batchInDb = await prisma.registrationBatch.findUnique({
      where: { id: regA.registrationBatchId! },
      include: { registrations: true },
    });
    assert(
      batchInDb !== null && batchInDb.registrations.length === 3,
      "TEST 5b: RegistrationBatch database record has 3 linked Registration records",
    );

    // ==================================================
    // TEST 6: Enter duplicate Tracking Numbers in same submission
    // ==================================================
    let duplicateCaught = false;
    try {
      await createRegistrationsInTransaction(
        ownerAdminId,
        {
          shared: { customerName: "Test Dup" },
          documents: [
            { trackingNumber: `${testTrackPrefix}-DUP`, documentType: "Degree" },
            { trackingNumber: `${testTrackPrefix}-DUP`, documentType: "Marriage" },
          ],
        },
        sourceOfficeName,
      );
    } catch (err: any) {
      duplicateCaught = true;
      assert(
        err.message.includes("already used in this submission"),
        "TEST 6: Duplicate Tracking Numbers in same submission throws clear error",
        err.message,
      );
    }
    if (!duplicateCaught) {
      assert(false, "TEST 6: Duplicate Tracking Numbers inside same form must fail");
    }

    // ==================================================
    // TEST 7: Enter Tracking Number that already exists in DB
    // ==================================================
    let existingCaught = false;
    try {
      await createRegistrationsInTransaction(
        ownerAdminId,
        {
          shared: { customerName: "Test Existing" },
          documents: [
            { trackingNumber: trk1, documentType: "Duplicate DB" },
          ],
        },
        sourceOfficeName,
      );
    } catch (err: any) {
      existingCaught = true;
      assert(
        err.message.includes("already exists"),
        "TEST 7: Tracking Number already existing in DB throws clear error",
        err.message,
      );
    }
    if (!existingCaught) {
      assert(false, "TEST 7: Existing Tracking Number must fail");
    }

    // ==================================================
    // TEST 8: Document 2 Tracking Number empty
    // ==================================================
    let emptyCaught = false;
    try {
      await createRegistrationsInTransaction(
        ownerAdminId,
        {
          shared: { customerName: "Test Empty" },
          documents: [
            { trackingNumber: `${testTrackPrefix}-VALID-1`, documentType: "Doc 1" },
            { trackingNumber: "   ", documentType: "Doc 2" },
          ],
        },
        sourceOfficeName,
      );
    } catch (err: any) {
      emptyCaught = true;
      assert(
        err.message.includes("Document 2: Tracking Number is required"),
        "TEST 8: Document 2 with empty Tracking Number identifies exact document in error",
        err.message,
      );
    }
    if (!emptyCaught) {
      assert(false, "TEST 8: Empty Tracking Number must fail");
    }

    // ==================================================
    // TEST 9: Add Document 2, then remove it before saving
    // (Verifies frontend simulation that only remaining documents are passed)
    // ==================================================
    const docList = [
      { trackingNumber: `${testTrackPrefix}-REMAIN`, documentType: "Doc 1" },
      { trackingNumber: `${testTrackPrefix}-REMOVED`, documentType: "Doc 2" },
    ];
    // Remove doc 2
    docList.splice(1, 1);
    const saveRemoved = await createRegistrationsInTransaction(
      ownerAdminId,
      {
        shared: { customerName: "Remove Test" },
        documents: docList,
      },
      sourceOfficeName,
    );
    assert(
      saveRemoved.length === 1 && saveRemoved[0].trackingNumber === `${testTrackPrefix}-REMAIN`,
      "TEST 9: Removing unsaved Document 2 leaves only Document 1 saved",
    );
    const checkRemoved = await prisma.registration.findFirst({
      where: { trackingNumber: `${testTrackPrefix}-REMOVED` },
    });
    assert(checkRemoved === null, "TEST 9b: Removed unsaved document was never created in DB");

    // ==================================================
    // TEST 10 & 11: Edit Registration 7854
    // ==================================================
    await prisma.registration.update({
      where: { id: regA.id },
      data: {
        documentName: "Ravi Master Degree Updated",
        totalCharges: 5500,
      },
    });

    const regAUpdated = await prisma.registration.findUnique({ where: { id: regA.id } });
    const regBCheck = await prisma.registration.findUnique({ where: { id: regB.id } });
    const regCCheck = await prisma.registration.findUnique({ where: { id: regC.id } });

    assert(
      regAUpdated?.documentName === "Ravi Master Degree Updated" && Number(regAUpdated?.totalCharges) === 5500,
      "TEST 11a: Registration 7854 modified successfully",
    );
    assert(
      regBCheck?.documentName === "Ravi Marriage Certificate" && Number(regBCheck?.totalCharges) === 3000,
      "TEST 11b: Registration 9846 remains completely unchanged",
    );
    assert(
      regCCheck?.documentName === "Ravi Mark Sheet" && Number(regCCheck?.totalCharges) === 2000,
      "TEST 11c: Registration 65236 remains completely unchanged",
    );

    // ==================================================
    // TEST 12 & 13: Independent Approval State
    // ==================================================
    await prisma.registration.update({
      where: { id: regA.id },
      data: { approvalStatus: "Approved" },
    });
    await prisma.registration.update({
      where: { id: regB.id },
      data: { approvalStatus: "Rejected", rejectionReason: "Documents not clear" },
    });

    const regAAppr = await prisma.registration.findUnique({ where: { id: regA.id } });
    const regBAppr = await prisma.registration.findUnique({ where: { id: regB.id } });
    const regCAppr = await prisma.registration.findUnique({ where: { id: regC.id } });

    assert(regAAppr?.approvalStatus === "Approved", "TEST 12: Registration 7854 is Approved independently");
    assert(regBAppr?.approvalStatus === "Rejected", "TEST 13: Registration 9846 is Rejected independently");
    assert(regCAppr?.approvalStatus === "Pending", "TEST 13b: Registration 65236 remains Pending independently");

    // ==================================================
    // TEST 14: File handling
    // ==================================================
    // Create dummy FileStorage records
    const file1 = await prisma.fileStorage.create({
      data: {
        module: "Revenue Registration",
        folder: "documents",
        originalName: "ravi_degree.pdf",
        storedName: `ravi_degree_${Date.now()}.pdf`,
        bucketKey: `uploads/ravi_degree_${Date.now()}.pdf`,
        url: "https://storage.example.com/ravi_degree.pdf",
        mimeType: "application/pdf",
        extension: "pdf",
        size: 1024,
      },
    });

    const file2 = await prisma.fileStorage.create({
      data: {
        module: "Revenue Registration",
        folder: "documents",
        originalName: "ravi_marriage.pdf",
        storedName: `ravi_marriage_${Date.now()}.pdf`,
        bucketKey: `uploads/ravi_marriage_${Date.now()}.pdf`,
        url: "https://storage.example.com/ravi_marriage.pdf",
        mimeType: "application/pdf",
        extension: "pdf",
        size: 2048,
      },
    });

    const fileTestTrk1 = `${testTrackPrefix}-FILE-1`;
    const fileTestTrk2 = `${testTrackPrefix}-FILE-2`;

    const fileRegs = await createRegistrationsInTransaction(
      ownerAdminId,
      {
        shared: { customerName: "Ravi File Test" },
        documents: [
          {
            trackingNumber: fileTestTrk1,
            documentType: "Degree Certificate",
            documentFileIds: [file1.id],
          },
          {
            trackingNumber: fileTestTrk2,
            documentType: "Marriage Certificate",
            documentFileIds: [file2.id],
          },
        ],
      },
      sourceOfficeName,
    );

    const regFileA = await prisma.registration.findUnique({
      where: { id: fileRegs[0].id },
      include: { files: true },
    });
    const regFileB = await prisma.registration.findUnique({
      where: { id: fileRegs[1].id },
      include: { files: true },
    });

    assert(
      regFileA?.files.length === 1 && regFileA.files[0].fileStorageId === file1.id,
      "TEST 14a: Document 1 receives only its own file (file1)",
    );
    assert(
      regFileB?.files.length === 1 && regFileB.files[0].fileStorageId === file2.id,
      "TEST 14b: Document 2 receives only its own file (file2)",
    );

    // ==================================================
    // TEST 15: Commercial and Payment Data Independence
    // ==================================================
    assert(
      Number(regA.totalCharges) === 5000 && Number(regA.advancePaid) === 0, // initially 0 approved advance until approval
      "TEST 15a: Document 1 charges and advance remain independent",
    );
    assert(
      Number(regB.totalCharges) === 3000,
      "TEST 15b: Document 2 charges remain independent",
    );

    // ==================================================
    // TEST 16: Atomic Transaction Rollback on Failure
    // ==================================================
    const rollTrk1 = `${testTrackPrefix}-ROLL-1`;
    const rollTrk2 = `${testTrackPrefix}-ROLL-2`;
    const rollTrk3 = trk1; // Intentional collision with existing record trk1!

    let rollbackOccurred = false;
    try {
      await createRegistrationsInTransaction(
        ownerAdminId,
        {
          shared: { customerName: "Rollback Test" },
          documents: [
            { trackingNumber: rollTrk1, documentType: "Doc 1" },
            { trackingNumber: rollTrk2, documentType: "Doc 2" },
            { trackingNumber: rollTrk3, documentType: "Doc 3 Collision" },
          ],
        },
        sourceOfficeName,
      );
    } catch {
      rollbackOccurred = true;
    }

    const checkRoll1 = await prisma.registration.findFirst({ where: { trackingNumber: rollTrk1 } });
    const checkRoll2 = await prisma.registration.findFirst({ where: { trackingNumber: rollTrk2 } });

    assert(
      rollbackOccurred && checkRoll1 === null && checkRoll2 === null,
      "TEST 16: Atomic transaction rollback - when 1 document fails, all documents roll back completely",
    );

    // ==================================================
    // TEST 17: Closed Lead -> Register Additional Revenue
    // ==================================================
    const additionalDoc = await createRegistrationsInTransaction(
      ownerAdminId,
      {
        shared: {
          leadId: testLead.id,
          customerName: "Ravi KK",
          mobile: "+919876543210",
        },
        documents: [
          {
            trackingNumber: trk5,
            documentType: "Police Clearance Certificate",
            totalCharges: 1500,
          },
        ],
      },
      sourceOfficeName,
    );

    assert(
      additionalDoc.length === 1 && additionalDoc[0].leadId === testLead.id,
      "TEST 17: Additional document registration created for existing Lead successfully",
    );

    // ==================================================
    // TEST 19 & 20: Revenue Registration List & Multi-Document Indicator
    // ==================================================
    const listResult = await listRegistrations(ownerAdminId, {
      query: trk1,
      page: 1,
      pageSize: 10,
    });

    const mappedTrk1 = listResult.items.find((i) => i.trackingNumber === trk1);
    assert(
      Boolean(mappedTrk1 && mappedTrk1.linkedDocumentsCount && mappedTrk1.linkedDocumentsCount > 1),
      "TEST 19: Multi-document indicator active (linkedDocumentsCount > 1)",
      `linkedDocumentsCount = ${mappedTrk1?.linkedDocumentsCount}`,
    );

    const linkedTrks = (mappedTrk1?.linkedDocuments || []).map((d) => d.trackingNumber);
    assert(
      linkedTrks.includes(trk1) && linkedTrks.includes(trk2) && linkedTrks.includes(trk3),
      "TEST 20: Linked documents modal list contains related Tracking Numbers",
      linkedTrks.join(", "),
    );

    // ==================================================
    // TEST 22: Search by Tracking Number
    // ==================================================
    const foundByTrk = await getRegistrationByTrackingNumber(ownerAdminId, trk1);
    assert(
      foundByTrk !== null && foundByTrk.trackingNumber === trk1,
      "TEST 22: Search by Tracking Number returns correct Registration record",
    );

    // ==================================================
    // TEST 24: Independent Movement History
    // ==================================================
    const movA = await prisma.movementHistory.findMany({ where: { trackingNumber: trk1 } });
    const movB = await prisma.movementHistory.findMany({ where: { trackingNumber: trk2 } });

    assert(
      movA.length > 0 && movB.length > 0 && movA[0].trackingNumber === trk1 && movB[0].trackingNumber === trk2,
      "TEST 24: Independent Movement History tracked per Tracking Number",
    );

    // ==================================================
    // TEST 25: Independent Approval State
    // ==================================================
    const docMovementA = await prisma.documentMovement.findUnique({ where: { trackingNumber: trk1 } });
    const docMovementB = await prisma.documentMovement.findUnique({ where: { trackingNumber: trk2 } });
    assert(
      Boolean(docMovementA && docMovementB && docMovementA.id !== docMovementB.id),
      "TEST 25: Independent Document Movement records with unique IDs",
    );

    console.log("==================================================");
    console.log(`TEST SUITE FINISHED: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("==================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log("Cleaning up test data...");
    await prisma.movementHistory.deleteMany({
      where: { trackingNumber: { startsWith: testTrackPrefix } },
    });
    await prisma.documentMovement.deleteMany({
      where: { trackingNumber: { startsWith: testTrackPrefix } },
    });
    await prisma.advancePaymentApproval.deleteMany({
      where: { trackingNumber: { startsWith: testTrackPrefix } },
    });
    await prisma.registrationFile.deleteMany({
      where: { registration: { trackingNumber: { startsWith: testTrackPrefix } } },
    });
    await prisma.registration.deleteMany({
      where: { trackingNumber: { startsWith: testTrackPrefix } },
    });
    if (createdBatchId) {
      await prisma.registrationBatch.deleteMany({ where: { id: createdBatchId } });
    }
    if (createdLeadId) {
      await prisma.leadFollowupHistory.deleteMany({ where: { leadId: createdLeadId } });
      await prisma.lead.deleteMany({ where: { id: createdLeadId } });
    }
    console.log("Clean up completed.");
    await prisma.$disconnect();
  }
}

runTests();
