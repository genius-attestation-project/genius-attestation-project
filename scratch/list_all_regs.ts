import { prisma } from "../src/lib/prisma";

async function main() {
  const count = await prisma.registration.count();
  console.log("Total registrations count in DB:", count);
  const allRegs = await prisma.registration.findMany({
    select: {
      id: true,
      trackingNumber: true,
      customerName: true,
      regionOfRegistration: true,
      trackingStatus: true,
      bmStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  console.log("Latest registrations:", JSON.stringify(allRegs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
