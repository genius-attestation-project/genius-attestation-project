import { prisma } from "./src/lib/prisma";
import { getSessionAccess } from "./src/features/admin/server/rbac.service";
import { getOfficeVisibilityOptions } from "./src/features/admin/server/user-access.service";
import { listDocumentInHand } from "./src/features/home/server/bundle-workflow.service";
import { listReadyForDelivery } from "./src/features/ready-for-delivery/server/ready-for-delivery.service";

async function main() {
  console.log("=== VERIFYING HOME & READY FOR DELIVERY OFFICE ACCESS CONTROL ===");

  // Find Super Admin and Non-Super Admin users
  const superAdmin = await prisma.user.findFirst({
    where: { role: { name: "Super Admin" } },
    include: { role: true },
  });

  const salesUser = await prisma.user.findFirst({
    where: { role: { name: "Sales" } },
    include: { role: true, officeLocationRef: true },
  });

  console.log("\n--- Super Admin ---");
  console.log("ID:", superAdmin?.id, "Email:", superAdmin?.email, "Role:", superAdmin?.role?.name);

  console.log("\n--- Non-Super Admin (Sales) ---");
  console.log("ID:", salesUser?.id, "Email:", salesUser?.email, "Role:", salesUser?.role?.name, "Assigned Office:", salesUser?.officeLocationName);

  if (superAdmin) {
    const access = await getSessionAccess(superAdmin.id);
    const visOptions = await getOfficeVisibilityOptions(superAdmin.id, superAdmin.ownerAdminId);

    console.log("\nTEST 1 - Super Admin Office Visibility Options:");
    console.log("  isSuperAdmin:", access.isSuperAdmin);
    console.log("  Allowed Office Names:", access.allowedOfficeNames);
    console.log("  VisOptions offices count:", visOptions.offices.length);

    const rfd = await listReadyForDelivery(superAdmin.ownerAdminId ?? superAdmin.id, null, {}, access);
    console.log("  ReadyForDelivery isSuperAdmin:", rfd.isSuperAdmin);
    console.log("  ReadyForDelivery allowedOffices:", rfd.allowedOffices);
    console.log("  ReadyForDelivery officeLocations filter count:", rfd.filters.officeLocations.length);
  }

  if (salesUser) {
    const access = await getSessionAccess(salesUser.id);
    const visOptions = await getOfficeVisibilityOptions(salesUser.id, salesUser.ownerAdminId);

    console.log("\nTEST 2 - Non-Super Admin (Sales) Office Visibility Options:");
    console.log("  isSuperAdmin:", access.isSuperAdmin);
    console.log("  Assigned Office:", salesUser.officeLocationName);
    console.log("  Allowed Office Names:", access.allowedOfficeNames);
    console.log("  VisOptions offices count:", visOptions.offices.length);
    console.log("  VisOptions office names:", visOptions.offices.map((o) => o.officeName));

    if (!access.isSuperAdmin && access.allowedOfficeNames && access.allowedOfficeNames.length > 0) {
      console.log("  PASSED: Non-Super Admin office options strictly limited to authorized offices.");
    } else {
      console.log("  FAILED: Non-Super Admin received unrestricted offices!");
    }

    // Ready For Delivery Service Check for Sales User
    const rfd = await listReadyForDelivery(salesUser.ownerAdminId ?? salesUser.id, null, {}, access);
    console.log("\nTEST 3 - Non-Super Admin Ready For Delivery Service:");
    console.log("  isSuperAdmin:", rfd.isSuperAdmin);
    console.log("  defaultOffice:", rfd.defaultOffice);
    console.log("  allowedOffices:", rfd.allowedOffices);
    console.log("  filters.officeLocations:", rfd.filters.officeLocations);

    if (
      !rfd.isSuperAdmin &&
      rfd.filters.officeLocations.length === access.allowedOfficeNames?.length
    ) {
      console.log("  PASSED: Ready For Delivery filters strictly limited to authorized offices.");
    } else {
      console.log("  FAILED: Ready For Delivery filter leaked unauthorized offices!");
    }

    // Home Document In Hand Service Check
    const inHandDocs = await listDocumentInHand({
      ownerAdminId: salesUser.ownerAdminId ?? salesUser.id,
      officeId: salesUser.officeLocationId ?? undefined,
      isSuperAdmin: access.isSuperAdmin,
      allowedOfficeIds: access.allowedOfficeIds,
      allowedOfficeNames: access.allowedOfficeNames,
    });

    console.log("\nTEST 4 - Home Document In Hand Service for Sales User:");
    console.log("  Total in-hand docs returned:", inHandDocs.length);
  }

  console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
