import { prisma } from "../src/lib/prisma";

async function main() {
  const pts = await prisma.masterData.findMany({
    where: {
      type: "PROCESS_TYPES",
      name: { in: ["QR Apostille", "Qatar Attestation", "UAE Embassy With MOFA (Edu)"] },
    },
    include: {
      subPackages: true,
    },
  });

  for (const pt of pts) {
    console.log("Process Type:", pt.name, "ID:", pt.id);
    console.log("SubPackages:", pt.subPackages.map(s => ({ id: s.id, name: s.name, isActive: s.isActive })));
  }

  // Also check subPackageMovements for 62192
  const subMovs62192 = await prisma.subPackageMovement.findMany({
    where: { trackingNumber: "62192" },
  });
  console.log("SubMovements for 62192:", subMovs62192.map(s => ({ id: s.id, subPackageId: s.subPackageId, status: s.status })));
}

main().finally(() => prisma.$disconnect());
