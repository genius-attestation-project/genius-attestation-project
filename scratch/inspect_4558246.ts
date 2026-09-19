import { prisma } from "../src/lib/prisma";

async function main() {
  const t = "4558246";
  const reg = await prisma.registration.findUnique({
    where: { trackingNumber: t },
    include: {
      documentMovements: true,
    },
  });
  console.log("Registration:", reg?.trackingNumber, reg?.processType, reg?.trackingStatus);
  console.log("DocumentMovements:", reg?.documentMovements);

  const history = await prisma.movementHistory.findMany({
    where: { trackingNumber: t },
    orderBy: { performedAt: "desc" },
  });
  console.log("MovementHistory:", history);

  const subMovs = await prisma.subPackageMovement.findMany({
    where: { trackingNumber: t },
  });
  console.log("SubPackageMovements:", subMovs);
}

main().finally(() => prisma.$disconnect());
