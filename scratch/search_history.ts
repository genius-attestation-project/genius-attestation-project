import { prisma } from "../src/lib/prisma";

async function main() {
  const movHist = await prisma.movementHistory.findMany({
    where: {
      OR: [
        { trackingNumber: { in: ["6565", "444"] } },
        { trackingNumber: { contains: "6565" } },
        { trackingNumber: { contains: "444" } },
      ],
    },
  });
  console.log("MovementHistories found:", movHist);

  const bundleItems = await prisma.bundleItem.findMany({
    where: {
      OR: [
        { trackingNumber: { in: ["6565", "444"] } },
        { trackingNumber: { contains: "6565" } },
      ],
    },
  });
  console.log("BundleItems found:", bundleItems);

  // Let's see the latest 20 registrations in the entire system
  const latestRegs = await prisma.registration.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      trackingNumber: true,
      customerName: true,
      trackingStatus: true,
      regionOfRegistration: true,
      createdAt: true,
    },
  });
  console.log("Latest registrations:", latestRegs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
