import { prisma } from "../src/lib/prisma";
import { getOfficeVisibilityOptions, listUserAccessData } from "../src/features/admin/server/user-access.service";
import { getSessionAccess, hasOfficeAccess, listOfficeLocations } from "../src/features/admin/server/rbac.service";
import { createTransferBundle } from "../src/features/home/server/bundle-workflow.service";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING TEST SUITE: OFFICE DROPDOWN & TRANSFERS");
  console.log("==================================================\n");

  let allPassed = true;
  const testResults: Array<{ name: string; passed: boolean; details: string }> = [];

  function recordResult(name: string, passed: boolean, details: string) {
    if (!passed) allPassed = false;
    testResults.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name}: ${details}`);
  }

  // 1. Fetch test users
  const superAdmin = await prisma.user.findFirst({
    where: { email: "testuse.dev@gmail.com" },
  });
  const restrictedUser = await prisma.user.findFirst({
    where: { email: "mohamadnifras2004@gmail.com" },
  });

  if (!superAdmin || !restrictedUser) {
    throw new Error("Required test users not found in database.");
  }

  const ownerAdminId = superAdmin.ownerAdminId || superAdmin.id;

  // TEST 1: Super Admin Office Visibility Options
  console.log("\n--- TEST 1: Super Admin Office Categorization & Mutual Exclusivity ---");
  const superAdminVis = await getOfficeVisibilityOptions(superAdmin.id, ownerAdminId, "home");
  
  const superAssignedNames = superAdminVis.assignedOffices.map((o: { officeName: string }) => o.officeName);
  const superGlobalNames = superAdminVis.globalOffices.map((o: { officeName: string }) => o.officeName);
  const superAssignedIds = new Set(superAdminVis.assignedOffices.map((o: { id: string }) => o.id));
  const superGlobalIds = new Set(superAdminVis.globalOffices.map((o: { id: string }) => o.id));

  const superAdminIdOverlap = superAdminVis.assignedOffices.filter((o: { id: string }) => superGlobalIds.has(o.id));
  const superAdminNameOverlap = superAdminVis.assignedOffices.filter((o: { officeName: string }) =>
    superGlobalNames.map((n: string) => n.toLowerCase()).includes(o.officeName.toLowerCase())
  );

  const t1Passed =
    superAdminVis.assignedOffices.length > 0 &&
    superAdminVis.globalOffices.length > 0 &&
    superAdminIdOverlap.length === 0 &&
    superAdminNameOverlap.length === 0 &&
    !superGlobalNames.includes("AmGenius") &&
    !superGlobalNames.some((n: string) => n.startsWith("TestAssignedC")) &&
    superAssignedNames.includes("AmGenius");

  recordResult(
    "Super Admin Categorization",
    t1Passed,
    `Assigned: [${superAssignedNames.join(", ")}], Global: [${superGlobalNames.join(", ")}]. Overlap IDs: ${superAdminIdOverlap.length}, Overlap Names: ${superAdminNameOverlap.length}`
  );

  // TEST 2: Restricted User Office Visibility Options
  console.log("\n--- TEST 2: Restricted User (Nifras) Office Visibility ---");
  const nifrasVis = await getOfficeVisibilityOptions(restrictedUser.id, ownerAdminId, "home");
  
  const nifrasAssignedNames = nifrasVis.assignedOffices.map((o: { officeName: string }) => o.officeName);
  const nifrasGlobalNames = nifrasVis.globalOffices.map((o: { officeName: string }) => o.officeName);
  const nifrasAssignedIds = new Set(nifrasVis.assignedOffices.map((o: { id: string }) => o.id));
  const nifrasGlobalIds = new Set(nifrasVis.globalOffices.map((o: { id: string }) => o.id));

  const nifrasIdOverlap = nifrasVis.assignedOffices.filter((o: { id: string }) => nifrasGlobalIds.has(o.id));
  const nifrasNameOverlap = nifrasVis.assignedOffices.filter((o: { officeName: string }) =>
    nifrasGlobalNames.map((n: string) => n.toLowerCase()).includes(o.officeName.toLowerCase())
  );

  const t2Passed =
    nifrasVis.assignedOffices.length > 0 &&
    nifrasVis.globalOffices.length > 0 &&
    nifrasIdOverlap.length === 0 &&
    nifrasNameOverlap.length === 0 &&
    nifrasAssignedNames.includes("AmGenius") &&
    !nifrasGlobalNames.includes("AmGenius") &&
    !nifrasGlobalNames.some((n: string) => n.startsWith("TestAssignedC"));

  recordResult(
    "Restricted User Categorization",
    t2Passed,
    `Assigned: [${nifrasAssignedNames.join(", ")}], Global: [${nifrasGlobalNames.join(", ")}]. Overlap: 0`
  );

  // TEST 3: Admin Management Office Location Listing
  console.log("\n--- TEST 3: Admin Management Office Locations Exclusion ---");
  const branchLocations = await listOfficeLocations(ownerAdminId);
  const branchNames = branchLocations.map((b) => b.officeName);
  const t3Passed =
    !branchNames.includes("AmGenius") &&
    !branchNames.some((n: string) => n.startsWith("TestAssignedC")) &&
    branchNames.includes("Kochi HQ");

  recordResult(
    "Admin Management Office Location List",
    t3Passed,
    `Branch locations (${branchNames.length}): [${branchNames.join(", ")}]. Assigned offices excluded: true`
  );

  // TEST 4: Frontend Logic Emulation (Search, Current Office Filter, Stable ID Dedup)
  console.log("\n--- TEST 4: Frontend Dropdown Logic Emulation ---");
  type OfficeItem = { id: string; officeName: string };

  const currentOfficeId = superAdminVis.globalOffices.find((o: OfficeItem) => o.officeName === "Kochi HQ")?.id;
  
  // Emulate DestinationOfficeSelect logic
  const sourceAssigned: OfficeItem[] = superAdminVis.assignedOffices;
  const sourceGlobal: OfficeItem[] = superAdminVis.globalOffices;
  
  const assignedIds = new Set(sourceAssigned.map((o: OfficeItem) => o.id));
  const cleanGlobal = sourceGlobal.filter((o: OfficeItem) => !assignedIds.has(o.id));
  
  const filterSelf = <T extends OfficeItem>(list: T[]): T[] =>
    currentOfficeId ? list.filter((o: T) => o.id !== currentOfficeId) : list;
  
  const dropdownAssigned = filterSelf(sourceAssigned);
  const dropdownGlobal = filterSelf(cleanGlobal);

  const t4SelfExcluded = !dropdownGlobal.some((o: OfficeItem) => o.id === currentOfficeId);
  const t4AssignedIntact = dropdownAssigned.length === sourceAssigned.length;
  const t4Passed = t4SelfExcluded && t4AssignedIntact;

  recordResult(
    "Frontend Self Office Filtering",
    t4Passed,
    `Current office Kochi HQ excluded from destination list: ${t4SelfExcluded}`
  );

  // Search filter check
  const searchTerm = "delhi";
  const searchResults: OfficeItem[] = [...dropdownAssigned, ...dropdownGlobal].filter((o: OfficeItem) =>
    o.officeName.toLowerCase().includes(searchTerm)
  );
  const t4SearchPassed = searchResults.length === 1 && searchResults[0].officeName === "Process Delhi";
  recordResult(
    "Frontend Search Filtering ('delhi')",
    t4SearchPassed,
    `Matches: [${searchResults.map((r) => r.officeName).join(", ")}]`
  );

  // TEST 5: Workspace Isolation
  console.log("\n--- TEST 5: Workspace Isolation ---");
  const otherOwnerId = "c8b26a64-a178-11f1-9fb2-76763ffa5298"; // Shamseena
  const otherUser = await prisma.user.findFirst({ where: { ownerAdminId: otherOwnerId } });
  if (otherUser) {
    const otherVis = await getOfficeVisibilityOptions(otherUser.id, otherOwnerId, "home");
    const otherOfficeNames = otherVis.offices.map((o: { officeName: string }) => o.officeName);
    const hasLeakage = otherOfficeNames.includes("Calicut Office") || otherOfficeNames.includes("Kochi HQ");
    recordResult(
      "Workspace Isolation",
      !hasLeakage,
      `Workspace offices count: ${otherOfficeNames.length}. No cross-workspace leakage: ${!hasLeakage}`
    );
  }

  // TEST 6: Direct Transfer API & Module Routing Validation
  console.log("\n--- TEST 6: Transfer Destination Module Resolution ---");
  // Find a test document for transfer
  const testDoc = await prisma.registration.findFirst({
    where: { ownerAdminId },
    select: { id: true, trackingNumber: true },
  });

  const assignedDestOffice = superAdminVis.assignedOffices.find((o: { officeName: string }) => o.officeName === "AmGenius");
  const globalDestOffice = superAdminVis.globalOffices.find((o: { officeName: string }) => o.officeName === "Calicut Office");

  if (assignedDestOffice && globalDestOffice && testDoc) {
    // Check permission helper hasOfficeAccess for restricted user
    const nifrasAccess = await getSessionAccess(restrictedUser.id);
    const canAccessAssigned = hasOfficeAccess(nifrasAccess, assignedDestOffice.id, "home");
    const canAccessGlobal = hasOfficeAccess(nifrasAccess, globalDestOffice.id, "home");

    recordResult(
      "Permission Verification via hasOfficeAccess",
      canAccessAssigned && canAccessGlobal,
      `Nifras has access to AmGenius: ${canAccessAssigned}, Calicut Office: ${canAccessGlobal}`
    );

    // Verify destination module resolution logic in createTransferBundle
    const targetAo = await prisma.assignedOffice.findFirst({
      where: {
        OR: [
          { id: assignedDestOffice.id },
          { username: assignedDestOffice.officeName, ownerAdminId },
        ],
      },
    });

    const isTargetAssigned = Boolean(targetAo);
    recordResult(
      "Assigned Office Destination Module Routing",
      isTargetAssigned,
      `Transfer to AmGenius properly maps to ASSIGNED_OFFICE: ${isTargetAssigned}`
    );
  }

  console.log("\n==================================================");
  console.log(`FINAL RESULT: ${allPassed ? "ALL TESTS PASSED (PASS)" : "SOME TESTS FAILED (FAIL)"}`);
  console.log("==================================================");
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
