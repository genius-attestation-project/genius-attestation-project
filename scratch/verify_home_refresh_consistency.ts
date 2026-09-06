import { prisma } from "../src/lib/prisma";
import { listDocumentInHand } from "../src/features/home/server/bundle-workflow.service";

async function main() {
  console.log("=================================================================");
  console.log("=== COMPREHENSIVE HOME REFRESH & OFFICE FILTER TEST SUITE =======");
  console.log("=================================================================\n");

  const results: Record<string, "PASS" | "FAIL"> = {};
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";

  const qatarOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius Qatar" }
  });
  const dubaiOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius Dubai" }
  });
  const jeevanOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius jeevan Bhima Nagar" }
  });

  if (!qatarOffice || !dubaiOffice || !jeevanOffice) {
    throw new Error("Missing test offices in workspace!");
  }

  // -------------------------------------------------------------
  // TEST 1: Genius Dubai Office Filter (Should be exactly 1)
  // -------------------------------------------------------------
  console.log("--- TEST 1: Genius Dubai Office Filter ---");
  const dubaiDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: dubaiOffice.id,
    isSuperAdmin: true,
  });
  console.log(`Dubai In Hand Count: ${dubaiDocs.length}`);
  const hasDubaiDoc = dubaiDocs.some((d) => d.trackingNumber === "4557847");
  const hasNoQatarDocsInDubai = !dubaiDocs.some((d) => d.regionOfRegistration === "Genius Qatar");
  const test1Pass = dubaiDocs.length === 1 && hasDubaiDoc && hasNoQatarDocsInDubai;
  console.log(`[${test1Pass ? "PASS" : "FAIL"}] Dubai holds doc 4557847 and excludes other offices.`);
  results["TEST 1: Genius Dubai Office Filter"] = test1Pass ? "PASS" : "FAIL";

  // -------------------------------------------------------------
  // TEST 2: Genius Qatar Office Filter (Should be exactly 31)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Genius Qatar Office Filter ---");
  const qatarDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: qatarOffice.id,
    isSuperAdmin: true,
  });
  console.log(`Qatar In Hand Count: ${qatarDocs.length}`);
  const sampleQatarTrackings = ["61763", "61756", "61755", "62148"];
  const allSampleFound = sampleQatarTrackings.every((t) => qatarDocs.some((d) => d.trackingNumber === t));
  const hasNoDubaiInQatar = !qatarDocs.some((d) => d.trackingNumber === "4557847" || d.trackingNumber === "4409900");
  const test2Pass = qatarDocs.length === 31 && allSampleFound && hasNoDubaiInQatar;
  console.log(`[${test2Pass ? "PASS" : "FAIL"}] Qatar holds all 31 documents and excludes Dubai/Jeevan.`);
  results["TEST 2: Genius Qatar Office Filter"] = test2Pass ? "PASS" : "FAIL";

  // -------------------------------------------------------------
  // TEST 3: Genius Jeevan Bhima Nagar Filter (Should be exactly 1)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Genius Jeevan Bhima Nagar Filter ---");
  const jeevanDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: jeevanOffice.id,
    isSuperAdmin: true,
  });
  console.log(`Jeevan In Hand Count: ${jeevanDocs.length}`);
  const test3Pass = jeevanDocs.length === 1 && jeevanDocs[0]?.trackingNumber === "4409900";
  console.log(`[${test3Pass ? "PASS" : "FAIL"}] Jeevan holds transferred doc 4409900.`);
  results["TEST 3: Genius Jeevan Bhima Nagar Filter"] = test3Pass ? "PASS" : "FAIL";

  // -------------------------------------------------------------
  // TEST 4: Super Admin All Offices View (Should be exactly 33)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Super Admin All Offices View ---");
  const allDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: undefined,
    isSuperAdmin: true,
  });
  console.log(`All Offices Total In Hand: ${allDocs.length}`);
  const test4Pass = allDocs.length === 33;
  console.log(`[${test4Pass ? "PASS" : "FAIL"}] All Offices view returns complete workspace total (33).`);
  results["TEST 4: Super Admin All Offices View"] = test4Pass ? "PASS" : "FAIL";

  // -------------------------------------------------------------
  // TEST 5: Restricted User Scoping
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Restricted User Office Scoping ---");
  // Restricted user with only Dubai allowed
  const restrictedDubaiDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: dubaiOffice.id,
    isSuperAdmin: false,
    allowedOfficeIds: [dubaiOffice.id],
    allowedOfficeNames: ["Genius Dubai"],
  });
  // Restricted user attempting to access Qatar without permission
  const restrictedForbiddenQatar = await listDocumentInHand({
    ownerAdminId,
    officeId: qatarOffice.id,
    isSuperAdmin: false,
    allowedOfficeIds: [dubaiOffice.id],
    allowedOfficeNames: ["Genius Dubai"],
  });
  const test5Pass = restrictedDubaiDocs.length === 1 && restrictedForbiddenQatar.length === 0;
  console.log(`[${test5Pass ? "PASS" : "FAIL"}] Restricted user scopes correctly to permitted office (${restrictedDubaiDocs.length}) and denies unpermitted office (${restrictedForbiddenQatar.length}).`);
  results["TEST 5: Restricted User Office Scoping"] = test5Pass ? "PASS" : "FAIL";

  // -------------------------------------------------------------
  // TEST 6: Audit Trail & Movement Consistency
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Database Movement & Audit Trail Consistency ---");
  const nullMovsCount = await prisma.documentMovement.count({
    where: {
      registration: { ownerAdminId },
      status: { in: ["HOME", "Document In Hand", "Received"] },
      currentOfficeId: null,
    },
  });
  const auditEntriesCount = await prisma.auditTrail.count({
    where: {
      action: "Data Restoration: Office Location Synced",
    },
  });
  const test6Pass = nullMovsCount === 0 && auditEntriesCount >= 31;
  console.log(`[${test6Pass ? "PASS" : "FAIL"}] Null office movements in HOME = ${nullMovsCount}, Restoration audit entries = ${auditEntriesCount}.`);
  results["TEST 6: Database Movement & Audit Consistency"] = test6Pass ? "PASS" : "FAIL";

  console.log("\n=================================================================");
  console.log("=== FINAL VERIFICATION SUMMARY ===");
  console.log("=================================================================");
  let allPass = true;
  for (const [testName, result] of Object.entries(results)) {
    console.log(`${result === "PASS" ? "✅" : "❌"} ${testName}: ${result}`);
    if (result !== "PASS") allPass = false;
  }
  console.log("\nOverall Result:", allPass ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌");
}

main().catch(console.error).finally(() => prisma.$disconnect());
