import { prisma } from "./src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: "test" } },
    include: {
      officeLocationRef: true,
    },
  });

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      officeLocationId: true,
      officeLocationName: true,
      ownerAdminId: true,
      officeLocationRef: true,
    },
  });

  const allOffices = await prisma.officeLocation.findMany({});

  console.log("=== ALL USERS ===");
  console.log(JSON.stringify(allUsers, null, 2));

  console.log("=== ALL OFFICES ===");
  console.log(JSON.stringify(allOffices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
