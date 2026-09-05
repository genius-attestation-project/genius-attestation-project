import { prisma } from "../src/lib/prisma";
import {
  resolveOfficeIdentifiers,
  listSubPackageItemsForOffice,
  getSubPackagesForProcessType,
  getAssignedOfficeWorkspaceStats,
  listWorkspaceDocuments,
} from "../src/features/assigned-office/server/assigned-office.service";

async function runTests() {
  console.log("===============================================================");
  console.log("RUNNING VERIFICATION FOR ASSIGNED OFFICE SUB PROCESS DROPDOWN");
  console.log("===============================================================\n");

  const officeLocationId = "cmtonzb7n00nfql0uachgncpt"; // AmGenius in office_locations
  const assignedOfficeId = "cmtd6lftq0000yl2ps48dbc0o"; // AmGenius in assigned_offices
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";

  // Test 1: listSubPackageItemsForOffice with OfficeLocation ID
  console.log("TEST 1: listSubPackageItemsForOffice with OfficeLocation ID (as passed in URL/Process Module)");
  const res1 = await listSubPackageItemsForOffice({
    officeId: officeLocationId,
    ownerAdminId,
  });
  console.log(`SubPackages count: ${res1.assignedSubPackages.length}`);
  console.log(`SubPackages:`, res1.assignedSubPackages.map((sp) => ({ id: sp.id, name: sp.name, isCore: sp.isCorePackage })));
  if (res1.assignedSubPackages.length > 0) {
    console.log("--> PASS: Sub-processes successfully returned for OfficeLocation ID!\n");
  } else {
    console.log("--> FAIL: Sub-processes list is empty!\n");
  }

  // Test 2: listSubPackageItemsForOffice with AssignedOffice ID
  console.log("TEST 2: listSubPackageItemsForOffice with AssignedOffice ID");
  const res2 = await listSubPackageItemsForOffice({
    officeId: assignedOfficeId,
    ownerAdminId,
  });
  console.log(`SubPackages count: ${res2.assignedSubPackages.length}`);
  console.log(`SubPackages:`, res2.assignedSubPackages.map((sp) => ({ id: sp.id, name: sp.name, isCore: sp.isCorePackage })));
  if (res2.assignedSubPackages.length > 0) {
    console.log("--> PASS: Sub-processes successfully returned for AssignedOffice ID!\n");
  } else {
    console.log("--> FAIL: Sub-processes list is empty!\n");
  }

  // Test 3: getSubPackagesForProcessType with officeId
  console.log("TEST 3: getSubPackagesForProcessType with OfficeLocation ID");
  const res3 = await getSubPackagesForProcessType(undefined, ownerAdminId, officeLocationId);
  console.log(`Result count: ${res3.length}`);
  console.log(`Result:`, res3.map((sp) => ({ id: sp.id, name: sp.name, isCore: sp.isCorePackage })));
  if (res3.length === res1.assignedSubPackages.length) {
    console.log("--> PASS: getSubPackagesForProcessType matches configured sub packages!\n");
  } else {
    console.log("--> FAIL: mismatch in getSubPackagesForProcessType!\n");
  }

  // Test 4: Workspace Stats consistency across both IDs
  console.log("TEST 4: Workspace stats consistency across both IDs");
  const statsLocation = await getAssignedOfficeWorkspaceStats(officeLocationId, ownerAdminId);
  const statsAssigned = await getAssignedOfficeWorkspaceStats(assignedOfficeId, ownerAdminId);
  console.log("Stats with OfficeLocation ID:", statsLocation);
  console.log("Stats with AssignedOffice ID:", statsAssigned);
  if (JSON.stringify(statsLocation) === JSON.stringify(statsAssigned)) {
    console.log("--> PASS: Stats are 100% consistent across both office ID references!\n");
  } else {
    console.log("--> FAIL: Stats mismatch across office ID references!\n");
  }

  // Test 5: In Hand Documents consistency across both IDs
  console.log("TEST 5: Workspace documents consistency across both IDs");
  const docsLocation = await listWorkspaceDocuments({
    officeId: officeLocationId,
    tab: "in_hand",
    ownerAdminId,
  });
  const docsAssigned = await listWorkspaceDocuments({
    officeId: assignedOfficeId,
    tab: "in_hand",
    ownerAdminId,
  });
  console.log(`In Hand Docs count (OfficeLocation ID): ${docsLocation.length}`);
  console.log(`In Hand Docs count (AssignedOffice ID): ${docsAssigned.length}`);
  if (docsLocation.length === docsAssigned.length) {
    console.log("--> PASS: In Hand documents match across both office ID references!\n");
  } else {
    console.log("--> FAIL: In Hand documents mismatch!\n");
  }

  // Test 6: Non-existent / unauthorized office isolation
  console.log("TEST 6: Workspace isolation / Non-existent office test");
  const nonExistent = await listSubPackageItemsForOffice({
    officeId: "non-existent-office-id-999",
    ownerAdminId,
  });
  console.log(`Non-existent office subpackages count: ${nonExistent.assignedSubPackages.length}`);
  if (nonExistent.assignedSubPackages.length === 0) {
    console.log("--> PASS: Non-existent office safely returns empty array without leakage!\n");
  } else {
    console.log("--> FAIL: Leakage for non-existent office!\n");
  }
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
