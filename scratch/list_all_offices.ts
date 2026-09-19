import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const offices = await prisma.officeLocation.findMany({
    where: { isProcessOffice: false }
  });
  console.log("=== NON-PROCESS OFFICE LOCATIONS ===");
  for (const o of offices) {
    console.log(`ID: "${o.id}" | Name: "${o.officeName}" | Location: "${o.location}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
