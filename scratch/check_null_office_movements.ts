import { prisma } from "../src/lib/prisma";

async function main() {
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  
  const qatarOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius Qatar" }
  });
  const dubaiOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius Dubai" }
  });
  const jeevanOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: "Genius jeevan Bhima Nagar" }
  });

  console.log("Offices:", {
    qatar: qatarOffice?.id,
    dubai: dubaiOffice?.id,
    jeevan: jeevanOffice?.id,
  });

  // Check how many documentMovements have currentOfficeId == null for this ownerAdminId
  const nullMovs = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      currentOfficeId: null,
    },
    include: {
      registration: true,
    }
  });

  console.log(`Found ${nullMovs.length} documentMovements with currentOfficeId == null.`);
  for (const m of nullMovs.slice(0, 10)) {
    console.log(`- Tracking: ${m.trackingNumber}, RegOffice: ${m.registration.regionOfRegistration}, originOfficeId: ${m.originOfficeId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
