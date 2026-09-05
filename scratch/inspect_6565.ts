import { prisma } from "../src/lib/prisma";

async function main() {
  const doc6565 = await prisma.registration.findUnique({
    where: { trackingNumber: "6565" },
    include: {
      documentMovements: {
        include: {
          toOffice: true,
          fromOffice: true,
          currentOffice: true,
        },
      },
    },
  });
  console.log("DOC 6565:", JSON.stringify(doc6565, null, 2));

  const doc4444 = await prisma.registration.findUnique({
    where: { trackingNumber: "4444" },
    include: {
      documentMovements: {
        include: {
          toOffice: true,
          fromOffice: true,
          currentOffice: true,
        },
      },
    },
  });
  console.log("DOC 4444:", JSON.stringify(doc4444, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
