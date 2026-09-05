import { prisma } from "../src/lib/prisma";

async function resolveOfficeEntities(officeId: string, ownerAdminId?: string) {
  let assignedOffice = await (prisma as any).assignedOffice.findUnique({
    where: { id: officeId },
  });

  let officeLocation = await prisma.officeLocation.findUnique({
    where: { id: officeId },
  });

  if (officeLocation && !assignedOffice) {
    assignedOffice = await (prisma as any).assignedOffice.findFirst({
      where: {
        username: officeLocation.officeName,
        ...(ownerAdminId ? { ownerAdminId } : {}),
      },
    });
  }

  if (assignedOffice && !officeLocation) {
    officeLocation = await prisma.officeLocation.findFirst({
      where: {
        officeName: assignedOffice.username,
        ...(ownerAdminId ? { ownerAdminId } : {}),
      },
    });
  }

  if (!assignedOffice && !officeLocation) {
    assignedOffice = await (prisma as any).assignedOffice.findFirst({
      where: {
        OR: [{ username: officeId }, { email: officeId }],
        ...(ownerAdminId ? { ownerAdminId } : {}),
      },
    });
    officeLocation = await prisma.officeLocation.findFirst({
      where: {
        officeName: officeId,
        ...(ownerAdminId ? { ownerAdminId } : {}),
      },
    });
  }

  const allAssignedOfficeIds = Array.from(
    new Set([assignedOffice?.id, officeLocation?.id, officeId].filter(Boolean))
  ) as string[];

  return {
    assignedOffice,
    officeLocation,
    assignedOfficeId: assignedOffice?.id || officeLocation?.id || officeId,
    officeLocationId: officeLocation?.id || assignedOffice?.id || officeId,
    allOfficeIds: allAssignedOfficeIds,
    officeName: officeLocation?.officeName || assignedOffice?.username || officeId,
  };
}

async function main() {
  const officeId = "cmtonzb7n00nfql0uachgncpt";
  const resolved = await resolveOfficeEntities(officeId);
  console.log("Resolved Entities:", resolved);

  // Now query assignedOfficeSubPackage with allOfficeIds or assignedOfficeId
  const subPkgs = await (prisma as any).assignedOfficeSubPackage.findMany({
    where: {
      assignedOfficeId: { in: resolved.allOfficeIds },
    },
  });
  console.log("Found SubPackages mappings:", subPkgs);

  const subPackageIds = subPkgs.map((sp: any) => sp.subPackageId);
  const actualSubPackages = await prisma.subPackage.findMany({
    where: { id: { in: subPackageIds }, isActive: true },
  });
  console.log("Actual Active SubPackages:", actualSubPackages);
}

main().catch(console.error).finally(() => prisma.$disconnect());
