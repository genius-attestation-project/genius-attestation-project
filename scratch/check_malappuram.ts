import { prisma } from "../src/lib/prisma";

async function checkMalappuram() {
  const offices = await prisma.officeLocation.findMany({
    where: {
      officeName: { contains: "Malappuram" },
    },
  });
  console.log("MALAPPURAM OFFICES:", JSON.stringify(offices, null, 2));

  const officesCase = await prisma.officeLocation.findMany({
    where: {
      officeName: { contains: "malappuram" },
    },
  });
  console.log("MALAPPURAM OFFICES LOWERCASE:", JSON.stringify(officesCase, null, 2));
}

checkMalappuram().catch(console.error).finally(() => prisma.$disconnect());
