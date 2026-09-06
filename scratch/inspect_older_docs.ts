import { prisma } from "../src/lib/prisma";

async function main() {
  const trackingNumbers = ["62238", "62211", "61849", "61811", "61750", "61802", "61733", "61724", "61793"];

  for (const tNum of trackingNumbers) {
    console.log(`\n=== TRACKING ${tNum} ===`);
    const docMov = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNum },
      include: {
        fromOffice: true,
        toOffice: true,
        currentOffice: true,
        bundle: true,
      }
    });
    console.log("DocumentMovement:", JSON.stringify(docMov, null, 2));

    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: tNum },
      orderBy: { performedAt: "desc" },
      take: 5
    });
    console.log("Latest 5 MovementHistory:", JSON.stringify(history, null, 2));

    const bundleItems = await prisma.bundleItem.findMany({
      where: { trackingNumber: tNum },
      include: { bundle: true },
      orderBy: { createdAt: "desc" }
    });
    console.log("BundleItems:", JSON.stringify(bundleItems, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
