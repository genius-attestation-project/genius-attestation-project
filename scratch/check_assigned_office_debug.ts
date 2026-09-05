import { prisma } from "../src/lib/prisma";

async function main() {
  const officeId = "cmtonzb7n00nfql0uachgncpt";

  console.log("=== CHECKING ASSIGNED OFFICE DEBUG ===");

  // 1. Check AssignedOffice by id or username
  const assignedOfficeById = await (prisma as any).assignedOffice?.findUnique({
    where: { id: officeId },
  });
  console.log("AssignedOffice by ID:", assignedOfficeById);

  const allAssignedOffices = await (prisma as any).assignedOffice?.findMany({});
  console.log("All AssignedOffices:", allAssignedOffices?.map((a: any) => ({ id: a.id, username: a.username, email: a.email, ownerAdminId: a.ownerAdminId })));

  // 2. Check OfficeLocation by id or officeName
  const officeLocationById = await prisma.officeLocation.findUnique({
    where: { id: officeId },
  });
  console.log("OfficeLocation by ID:", officeLocationById);

  const allOfficeLocations = await prisma.officeLocation.findMany({});
  console.log("All OfficeLocations:", allOfficeLocations.map((l) => ({ id: l.id, officeName: l.officeName, location: l.location, isProcessOffice: l.isProcessOffice, ownerAdminId: l.ownerAdminId })));

  // 3. Check AssignedOfficeSubPackage records
  const allOfficeSubPkgs = await (prisma as any).assignedOfficeSubPackage?.findMany({});
  console.log("All assignedOfficeSubPackage records:", allOfficeSubPkgs);

  // 4. Check SubPackage records
  const allSubPackages = await prisma.subPackage.findMany({});
  console.log("All SubPackages:", allSubPackages.map((s) => ({ id: s.id, name: s.name, processTypeId: s.processTypeId, isActive: s.isActive, ownerAdminId: s.ownerAdminId })));

  // 5. Check user Nifras
  const userNifras = await prisma.user.findFirst({
    where: { email: "mohamadnifras2004@gmail.com" },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true }
          }
        }
      },
      userPermissions: true
    }
  });
  console.log("User Nifras:", {
    id: userNifras?.id,
    name: userNifras?.name,
    email: userNifras?.email,
    role: userNifras?.role?.name,
    officeLocationId: userNifras?.officeLocationId,
    officeLocationName: userNifras?.officeLocationName,
    permissionsCount: userNifras?.userPermissions?.length,
    userPermissions: userNifras?.userPermissions?.map(p => p.permissionKey)
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
