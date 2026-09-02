import { prisma } from "./src/lib/prisma";
import { getSessionAccess } from "./src/features/admin/server/rbac.service";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
      officeLocationRef: true,
      officeVisibilities: {
        include: { officeLocation: true },
      },
    },
  });

  console.log("=== USERS IN DATABASE ===");
  for (const u of users) {
    const access = await getSessionAccess(u.id);
    console.log({
      id: u.id,
      name: u.name,
      email: u.email,
      ownerAdminId: u.ownerAdminId,
      roleName: u.role?.name,
      officeLocationId: u.officeLocationId,
      officeLocationName: u.officeLocationName,
      officeLocationRefName: u.officeLocationRef?.officeName,
      officeVisibilitiesCount: u.officeVisibilities.length,
      sessionAccess: {
        isSuperAdmin: access?.isSuperAdmin,
        allowedOfficeIds: access?.allowedOfficeIds,
        allowedOfficeNames: access?.allowedOfficeNames,
      },
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
