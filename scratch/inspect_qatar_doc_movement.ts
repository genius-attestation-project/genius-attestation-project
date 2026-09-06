import { prisma } from "../src/lib/prisma";

async function main() {
  const doc = await prisma.documentMovement.findFirst({
    where: { trackingNumber: "61763" },
    include: {
      registration: true,
      fromOffice: true,
      toOffice: true,
      currentOffice: true,
      bundle: true,
    }
  });
  console.log("Full movement for 61763:", doc);

  const qatarOffice = await prisma.officeLocation.findFirst({
    where: { officeName: "Genius Qatar" }
  });
  console.log("Genius Qatar Office Location:", qatarOffice);
}

main().catch(console.error).finally(() => prisma.$disconnect());
