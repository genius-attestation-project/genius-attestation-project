import { prisma } from "./src/lib/prisma";
import { getSessionAccess } from "./src/features/admin/server/rbac.service";
import { listReadyForDelivery } from "./src/features/ready-for-delivery/server/ready-for-delivery.service";

async function runTests() {
  console.log("=== STARTING ACCESS CONTROL VERIFICATION TESTS ===");

  // Find users for test cases
  const superAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { role: { name: "Super Admin" } },
        { ownerAdminId: null },
      ],
    },
    include: { role: true },
  });

  const nonSuperAdmin = await prisma.user.findFirst({
    where: {
      role: { name: { not: "Super Admin" } },
      ownerAdminId: { not: null },
    },
    include: { role: true, officeLocationRef: true },
  });

  console.log("\n--- Super Admin Found ---");
  console.log("ID:", superAdmin?.id, "Email:", superAdmin?.email, "Role:", superAdmin?.role?.name);

  console.log("\n--- Non-Super Admin Found ---");
  console.log("ID:", nonSuperAdmin?.id, "Email:", nonSuperAdmin?.email, "Role:", nonSuperAdmin?.role?.name, "Assigned Office:", nonSuperAdmin?.officeLocationName);

  if (superAdmin) {
    const access = await getSessionAccess(superAdmin.id);
    const result = await listReadyForDelivery(
      superAdmin.ownerAdminId ?? superAdmin.id,
      null,
      {},
      access
    );

    console.log("\nTEST 1 - Super Admin Access:");
    console.log("  isSuperAdmin:", result.isSuperAdmin);
    console.log("  allowedOffices:", result.allowedOffices);
    console.log("  filters.officeLocations:", result.filters.officeLocations);
    console.log("  Total items returned:", result.items.length);
  }

  if (nonSuperAdmin) {
    const access = await getSessionAccess(nonSuperAdmin.id);
    const result = await listReadyForDelivery(
      nonSuperAdmin.ownerAdminId ?? nonSuperAdmin.id,
      null,
      {},
      access
    );

    console.log("\nTEST 2 - Non-Super Admin Access (Default Office):");
    console.log("  isSuperAdmin:", result.isSuperAdmin);
    console.log("  defaultOffice:", result.defaultOffice);
    console.log("  allowedOffices:", result.allowedOffices);
    console.log("  filters.officeLocations:", result.filters.officeLocations);
    console.log("  Total items returned:", result.items.length);

    // TEST 3 - Unauthorized Office Filter
    const unauthorizedOffice = "NonExistentOrUnauthorizedOffice999";
    const unauthorizedResult = await listReadyForDelivery(
      nonSuperAdmin.ownerAdminId ?? nonSuperAdmin.id,
      unauthorizedOffice,
      {},
      access
    );

    console.log("\nTEST 3 - Unauthorized Office Filter (", unauthorizedOffice, "):");
    console.log("  Items returned:", unauthorizedResult.items.length);
    if (unauthorizedResult.items.length === 0) {
      console.log("  PASSED: Unauthorized office returned 0 records.");
    } else {
      console.log("  FAILED: Unauthorized office leaked records!");
    }
  }

  console.log("\n=== VERIFICATION TESTS COMPLETE ===");
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
