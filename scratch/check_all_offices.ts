import { prisma } from "../src/lib/prisma";

async function main() {
  const offices = await prisma.officeLocation.findMany();
  console.log("=== ALL OFFICE LOCATIONS ===");
  console.dir(offices, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
