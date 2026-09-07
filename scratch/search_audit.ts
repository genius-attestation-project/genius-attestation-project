import { prisma } from "../src/lib/prisma";

async function main() {
  const audit = await prisma.auditTrail.findMany({
    where: {
      OR: [
        { description: { contains: "6565" } },
        { description: { contains: "444" } },
        { action: { contains: "6565" } },
        { action: { contains: "444" } },
      ],
    },
    take: 20,
  });
  console.log("Audit records:", audit);

  const wf = await (prisma as any).documentWorkflowHistory?.findMany({
    where: {
      OR: [
        { trackingNumber: { in: ["6565", "444", "4444"] } },
        { remarks: { contains: "6565" } },
      ],
    },
    take: 20,
  });
  console.log("Workflow history:", wf);
}

main().catch(console.error).finally(() => prisma.$disconnect());
