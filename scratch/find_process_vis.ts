import { prisma } from "../src/lib/prisma";

async function main() {
  const vis = await prisma.userOfficeVisibility.findMany({
    where: { moduleKey: "process" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
          ownerAdminId: true,
        },
      },
      officeLocation: true,
    },
  });
  console.log("All UserOfficeVisibility for process:", JSON.stringify(vis, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
