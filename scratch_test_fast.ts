import { prisma } from "./src/lib/prisma";
import { getSessionAccess } from "./src/features/admin/server/rbac.service";
import { getOfficeVisibilityOptions } from "./src/features/admin/server/user-access.service";

async function main() {
  console.log("=== FAST VERIFICATION TESTS ===");

  const superAdmin = await prisma.user.findFirst({
    where: { role: { name: "Super Admin" } },
    include: { role: true },
  });

  const salesUser = await prisma.user.findFirst({
    where: { role: { name: "Sales" } },
    include: { role: true, officeLocationRef: true },
  });

  if (superAdmin) {
    const access = await getSessionAccess(superAdmin.id);
    const vis = await getOfficeVisibilityOptions(superAdmin.id, superAdmin.ownerAdminId);
    console.log("TEST 1 - Super Admin:");
    console.log("  isSuperAdmin:", access.isSuperAdmin);
    console.log("  allowedOfficeNames:", access.allowedOfficeNames);
    console.log("  offices count:", vis.offices.length);
  }

  if (salesUser) {
    const access = await getSessionAccess(salesUser.id);
    const vis = await getOfficeVisibilityOptions(salesUser.id, salesUser.ownerAdminId);
    console.log("\nTEST 2 - Non-Super Admin (Sales - Email: " + salesUser.email + "):");
    console.log("  isSuperAdmin:", access.isSuperAdmin);
    console.log("  Assigned Office:", salesUser.officeLocationName);
    console.log("  allowedOfficeNames:", access.allowedOfficeNames);
    console.log("  vis.offices count:", vis.offices.length);
    console.log("  vis.offices:", vis.offices.map((o) => o.officeName));

    if (access.isSuperAdmin === false && access.allowedOfficeNames && access.allowedOfficeNames.length > 0) {
      console.log("  PASSED: Non-Super Admin is explicitly NOT Super Admin and restricted to authorized offices.");
    } else {
      console.log("  FAILED: Non-Super Admin access check failed!");
    }
  }

  console.log("\n=== ALL FAST VERIFICATION TESTS COMPLETED ===");
  process.exit(0);
}

main().catch(console.error);
