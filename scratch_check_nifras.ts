import { prisma } from "./src/lib/prisma";
import { getSessionAccess } from "./src/features/admin/server/rbac.service";
import { getOfficeVisibilityOptions } from "./src/features/admin/server/user-access.service";

async function main() {
  const nifras = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: "Nifras" } },
        { email: { contains: "nifras" } },
      ],
    },
    include: {
      role: true,
      officeLocationRef: true,
      officeVisibilities: { include: { officeLocation: true } },
    },
  });

  console.log("=== NIFRAS USER RECORD ===");
  console.log({
    id: nifras?.id,
    name: nifras?.name,
    email: nifras?.email,
    ownerAdminId: nifras?.ownerAdminId,
    roleId: nifras?.roleId,
    roleName: nifras?.role?.name,
    officeLocationId: nifras?.officeLocationId,
    officeLocationName: nifras?.officeLocationName,
    officeLocationRef: nifras?.officeLocationRef,
    officeVisibilities: nifras?.officeVisibilities.map((v) => v.officeLocation.officeName),
  });

  if (nifras) {
    const access = await getSessionAccess(nifras.id);
    const vis = await getOfficeVisibilityOptions(nifras.id, nifras.ownerAdminId ?? "");

    console.log("\n=== SESSION ACCESS FOR NIFRAS ===");
    console.log({
      isSuperAdmin: access.isSuperAdmin,
      role: access.role,
      allowedOfficeIds: access.allowedOfficeIds,
      allowedOfficeNames: access.allowedOfficeNames,
    });

    console.log("\n=== GET OFFICE VISIBILITY OPTIONS FOR NIFRAS ===");
    console.log({
      officesCount: vis.offices.length,
      assignedOfficesCount: vis.assignedOffices.length,
      globalOfficesCount: vis.globalOffices.length,
      officesList: vis.offices.map((o) => o.officeName),
    });
  }

  process.exit(0);
}

main().catch(console.error);
