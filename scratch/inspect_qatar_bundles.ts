import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bundles = await prisma.bundle.findMany({
    where: {
      OR: [
        { toOffice: { officeName: { contains: "Qatar" } } },
        { fromOffice: { officeName: { contains: "Qatar" } } },
      ],
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    },
  });

  console.log(`Found ${bundles.length} bundles related to Qatar:`);
  for (const b of bundles) {
    console.log(`Bundle ${b.bundleNumber}: from="${b.fromOffice?.officeName}" (${b.fromOfficeId}) -> to="${b.toOffice?.officeName}" (${b.toOfficeId}), status="${b.status}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
