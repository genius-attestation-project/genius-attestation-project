import { prisma } from "../src/lib/prisma";

async function main() {
  const officeId = "cmtonzb7n00nfql0uachgncpt";

  const ao = await (prisma as any).assignedOffice?.findUnique({
    where: { id: officeId },
    include: {
      subPackages: true,
    }
  });
  console.log("AssignedOffice by ID (cmtonzb7n00nfql0uachgncpt):", ao);

  const loc = await prisma.officeLocation.findUnique({
    where: { id: officeId },
  });
  console.log("OfficeLocation by ID (cmtonzb7n00nfql0uachgncpt):", loc);

  const subPkgsForThisOffice = await (prisma as any).assignedOfficeSubPackage?.findMany({
    where: { assignedOfficeId: officeId },
    include: { subPackage: true }
  });
  console.log("assignedOfficeSubPackage for this office:", subPkgsForThisOffice);

  // Also check if there are subpackages linked by username or other ID
  const allAoSub = await (prisma as any).assignedOfficeSubPackage?.findMany({
    include: { subPackage: true }
  });
  console.log("ALL assignedOfficeSubPackage records in DB:", allAoSub);

  // Check assigned offices list
  const allAo = await (prisma as any).assignedOffice?.findMany({});
  console.log("All AssignedOffice records in DB:", allAo);
}

main().catch(console.error).finally(() => prisma.$disconnect());
