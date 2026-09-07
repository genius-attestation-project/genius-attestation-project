import { prisma } from "../src/lib/prisma";

async function main() {
  const byTracking = await prisma.registration.findMany({
    where: {
      OR: [
        { trackingNumber: { contains: "6565" } },
        { trackingNumber: { contains: "444" } },
      ],
    },
    select: {
      id: true,
      trackingNumber: true,
      customerName: true,
      trackingStatus: true,
      regionOfRegistration: true,
    },
  });
  console.log("Registrations matching 6565 or 444:", byTracking);

  const movements = await prisma.documentMovement.findMany({
    where: {
      OR: [
        { trackingNumber: { contains: "6565" } },
        { trackingNumber: { contains: "444" } },
      ],
    },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      currentStatus: true,
      currentModule: true,
    },
  });
  console.log("Movements matching 6565 or 444:", movements);
}

main().catch(console.error).finally(() => prisma.$disconnect());
