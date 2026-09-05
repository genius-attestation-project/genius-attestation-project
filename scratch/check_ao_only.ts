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
    console.log(JSON.stringify({
      id: ao.id,
      username: ao.username,
      email: ao.email,
      ownerAdminId: ao.ownerAdminId,
      subPackagesCount: ao.subPackages?.length,
      subPackages: ao.subPackages,
    }, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
