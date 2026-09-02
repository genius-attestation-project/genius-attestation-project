import { prisma } from "./src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      role: { select: { name: true } },
      ownerAdminId: true,
      officeLocationId: true,
      officeLocationName: true,
      officeVisibilities: { select: { officeLocationId: true, officeLocation: { select: { officeName: true } } } },
    },
  });

  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}

main().catch(console.error);
