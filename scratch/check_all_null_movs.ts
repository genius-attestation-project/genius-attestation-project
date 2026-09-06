import { prisma } from "../src/lib/prisma";

async function main() {
  const allNullMovs = await prisma.documentMovement.findMany({
    where: {
      currentOfficeId: null,
    },
    include: {
      registration: true,
      fromOffice: true,
      toOffice: true,
    }
  });

  console.log(`Total documentMovements across ALL tenants with currentOfficeId == null: ${allNullMovs.length}`);

  for (const m of allNullMovs) {
    console.log(`- Tracking: ${m.trackingNumber}, RegOffice: ${m.registration?.regionOfRegistration}, originOfficeId: ${m.originOfficeId}, fromOfficeId: ${m.fromOfficeId}, toOfficeId: ${m.toOfficeId}, status: ${m.status}, currentStatus: ${m.currentStatus}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
