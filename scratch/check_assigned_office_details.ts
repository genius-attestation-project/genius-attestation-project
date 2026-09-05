import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== ALL ASSIGNED OFFICES ===");
  const assignedOffices = await (prisma as any).assignedOffice.findMany({
    include: {
      subPackages: true,
      processTypes: true,
    }
  });
  console.log("Assigned Offices Count:", assignedOffices.length);
  for (const ao of assignedOffices) {
    console.log({
      id: ao.id,
      username: ao.username,
      email: ao.email,
      ownerAdminId: ao.ownerAdminId,
      subPackagesCount: ao.subPackages?.length,
      subPackages: ao.subPackages,
    });
  }

  console.log("\n=== ALL OFFICE LOCATIONS ===");
  const locations = await prisma.officeLocation.findMany({});
  for (const l of locations) {
    console.log({
      id: l.id,
      officeName: l.officeName,
      location: l.location,
      isProcessOffice: l.isProcessOffice,
      ownerAdminId: l.ownerAdminId,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
