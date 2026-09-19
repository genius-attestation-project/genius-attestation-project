import { prisma } from "../src/lib/prisma";

async function main() {
  const t = "62192";
  const history = await prisma.movementHistory.findMany({
    where: { trackingNumber: t },
    orderBy: { performedAt: "desc" },
  });
  console.log("62192 MovementHistory:", history);
}

main().finally(() => prisma.$disconnect());
