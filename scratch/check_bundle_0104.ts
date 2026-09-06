import { prisma } from "../src/lib/prisma";

async function main() {
  const bundles = await prisma.bundle.findMany({
    where: {
      OR: [
        { bundleNumber: { contains: "BND-PROC-20260905-0104" } },
        { bundleNumber: { contains: "0104" } }
      ]
    },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true
    }
  });
  console.log("Bundles found:", JSON.stringify(bundles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
