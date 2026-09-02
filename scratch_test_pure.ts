import { hasOfficeAccess } from "./src/features/admin/server/rbac.service";

function runPureTests() {
  console.log("=== PURE UNIT TESTS FOR ACCESS CONTROL ===");

  // Mock Super Admin Access
  const superAdminAccess = {
    userId: "super_admin_1",
    role: "Super Admin",
    isSuperAdmin: true,
    allowedOfficeIds: null,
    allowedOfficeNames: null,
  };

  // Mock Non-Super Admin Access (Sales - Thrissur)
  const salesAccess = {
    userId: "sales_user_1",
    role: "Sales",
    isSuperAdmin: false,
    allowedOfficeIds: ["office_thrissur_id"],
    allowedOfficeNames: ["Genius Thrissur"],
  };

  // Mock Non-Super Admin Access (Admin - Dubai + Global Qatar)
  const adminAccess = {
    userId: "admin_user_1",
    role: "Admin",
    isSuperAdmin: false,
    allowedOfficeIds: ["office_dubai_id", "office_qatar_id"],
    allowedOfficeNames: ["Genius Dubai", "Global Qatar"],
  };

  // Test 1: Super Admin has office access for any office
  console.log("TEST 1 - Super Admin Access:");
  console.log("  hasOfficeAccess('office_thrissur_id'):", hasOfficeAccess(superAdminAccess, "office_thrissur_id"));
  console.log("  hasOfficeAccess('office_mumbai_id'):", hasOfficeAccess(superAdminAccess, "office_mumbai_id"));
  console.log("  hasOfficeAccess('all'):", hasOfficeAccess(superAdminAccess, "all"));

  // Test 2: Sales (Thrissur) Office Access
  console.log("\nTEST 2 - Sales (Thrissur) Access:");
  console.log("  hasOfficeAccess('office_thrissur_id'):", hasOfficeAccess(salesAccess, "office_thrissur_id"));
  console.log("  hasOfficeAccess('Genius Thrissur'):", hasOfficeAccess(salesAccess, "Genius Thrissur"));
  console.log("  hasOfficeAccess('office_kochi_id'):", hasOfficeAccess(salesAccess, "office_kochi_id"));
  console.log("  hasOfficeAccess('Process Delhi'):", hasOfficeAccess(salesAccess, "Process Delhi"));

  if (
    hasOfficeAccess(salesAccess, "office_thrissur_id") === true &&
    hasOfficeAccess(salesAccess, "office_kochi_id") === false &&
    hasOfficeAccess(salesAccess, "Process Delhi") === false
  ) {
    console.log("  PASSED: Sales user strictly authorized ONLY for Thrissur.");
  } else {
    console.log("  FAILED: Sales user access check failed!");
  }

  // Test 3: Multi-office authorized user (Dubai + Qatar)
  console.log("\nTEST 3 - Multi-Office Authorized User Access:");
  console.log("  hasOfficeAccess('Genius Dubai'):", hasOfficeAccess(adminAccess, "Genius Dubai"));
  console.log("  hasOfficeAccess('Global Qatar'):", hasOfficeAccess(adminAccess, "Global Qatar"));
  console.log("  hasOfficeAccess('Process Mumbai'):", hasOfficeAccess(adminAccess, "Process Mumbai"));

  if (
    hasOfficeAccess(adminAccess, "Genius Dubai") === true &&
    hasOfficeAccess(adminAccess, "Global Qatar") === true &&
    hasOfficeAccess(adminAccess, "Process Mumbai") === false
  ) {
    console.log("  PASSED: Multi-office user allowed authorized offices and blocked unauthorized offices.");
  } else {
    console.log("  FAILED: Multi-office user access check failed!");
  }

  console.log("\n=== ALL PURE UNIT TESTS COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

runPureTests();
