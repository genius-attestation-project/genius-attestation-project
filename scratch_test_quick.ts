import { listReadyForDelivery } from "./src/features/ready-for-delivery/server/ready-for-delivery.service";

async function quickTest() {
  console.log("=== RUNNING DIRECT ACCESS CONTROL TESTS ===");

  const dummyOwnerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";

  // Test Case 1: Super Admin scope (allowedOfficeNames: null, isSuperAdmin: true)
  const superAdminScope = {
    isSuperAdmin: true,
    allowedOfficeIds: null,
    allowedOfficeNames: null,
  };

  const superAdminResult = await listReadyForDelivery(
    dummyOwnerAdminId,
    null,
    {},
    superAdminScope
  );

  console.log("TEST 1 - Super Admin Scope:");
  console.log("  isSuperAdmin:", superAdminResult.isSuperAdmin);
  console.log("  allowedOffices:", superAdminResult.allowedOffices);
  console.log("  defaultOffice:", superAdminResult.defaultOffice);
  console.log("  filters.officeLocations:", superAdminResult.filters.officeLocations);

  // Test Case 2: Non-Super Admin Scope (Thrissur only)
  const nonSuperAdminScopeSingle = {
    isSuperAdmin: false,
    allowedOfficeIds: ["office_thrissur_id"],
    allowedOfficeNames: ["Thrissur"],
  };

  const singleOfficeResult = await listReadyForDelivery(
    dummyOwnerAdminId,
    null,
    {},
    nonSuperAdminScopeSingle
  );

  console.log("\nTEST 2 - Non-Super Admin Scope (Single Office 'Thrissur'):");
  console.log("  isSuperAdmin:", singleOfficeResult.isSuperAdmin);
  console.log("  defaultOffice:", singleOfficeResult.defaultOffice);
  console.log("  allowedOffices:", singleOfficeResult.allowedOffices);
  console.log("  filters.officeLocations:", singleOfficeResult.filters.officeLocations);
  if (
    singleOfficeResult.filters.officeLocations.length === 1 &&
    singleOfficeResult.filters.officeLocations[0] === "Thrissur"
  ) {
    console.log("  PASSED: Filter officeLocations strictly limited to 'Thrissur'.");
  } else {
    console.log("  FAILED: Filter officeLocations leaked unauthorized offices!", singleOfficeResult.filters.officeLocations);
  }

  // Test Case 3: Non-Super Admin Scope (Multiple Authorized Offices: Thrissur + Kochi HQ)
  const nonSuperAdminScopeMulti = {
    isSuperAdmin: false,
    allowedOfficeIds: ["office_thrissur_id", "office_kochi_id"],
    allowedOfficeNames: ["Thrissur", "Kochi HQ"],
  };

  const multiOfficeResult = await listReadyForDelivery(
    dummyOwnerAdminId,
    null,
    {},
    nonSuperAdminScopeMulti
  );

  console.log("\nTEST 3 - Non-Super Admin Scope (Multi Offices 'Thrissur' + 'Kochi HQ'):");
  console.log("  allowedOffices:", multiOfficeResult.allowedOffices);
  console.log("  filters.officeLocations:", multiOfficeResult.filters.officeLocations);

  // Test Case 4: Unauthorized Office Request
  const unauthorizedResult = await listReadyForDelivery(
    dummyOwnerAdminId,
    "Process Delhi",
    {},
    nonSuperAdminScopeSingle
  );

  console.log("\nTEST 4 - Unauthorized Office Query ('Process Delhi' requested by 'Thrissur' user):");
  console.log("  Items count returned:", unauthorizedResult.items.length);
  if (unauthorizedResult.items.length === 0) {
    console.log("  PASSED: Returned 0 records for unauthorized office query.");
  } else {
    console.log("  FAILED: Leaked records for unauthorized office!");
  }

  console.log("\n=== ALL DIRECT TESTS COMPLETED ===");
  process.exit(0);
}

quickTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
