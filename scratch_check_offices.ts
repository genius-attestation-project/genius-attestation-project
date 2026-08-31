import { prisma } from "./src/lib/prisma";

async function main() {
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";
  const db = prisma as any;

  const [officeLocations, assignedOffices] = await Promise.all([
    prisma.officeLocation.findMany({
      where: { ownerAdminId },
      select: { id: true, officeName: true, isProcessOffice: true },
      orderBy: { officeName: "asc" },
    }),
    db.assignedOffice ? db.assignedOffice.findMany({
      where: { ownerAdminId, status: true },
      select: { id: true, username: true, email: true },
      orderBy: { username: "asc" },
    }) : Promise.resolve([]),
  ]);

  console.log("=== OFFICE LOCATIONS FOR TEST DEV ===");
  console.log(officeLocations);

  console.log("=== ASSIGNED OFFICES FOR TEST DEV ===");
  console.log(assignedOffices);
}

main().catch(console.error).finally(() => prisma.$disconnect());
