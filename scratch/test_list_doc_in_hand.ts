import { prisma } from "../src/lib/prisma";
import { listDocumentInHand } from "../src/features/home/server/bundle-workflow.service";

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

  console.log("=== TESTING listDocumentInHand for ALL OFFICES ===");
  const allDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: undefined,
    isSuperAdmin: true,
  });
  console.log(`All Offices count: ${allDocs.length}`);

  console.log("\n=== TESTING listDocumentInHand for GENIUS DUBAI ===");
  const dubaiDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: dubaiOffice?.id,
    isSuperAdmin: true,
  });
  console.log(`Dubai count: ${dubaiDocs.length}`);
  console.log("Dubai tracking numbers:", dubaiDocs.map(d => d.trackingNumber));

  console.log("\n=== TESTING listDocumentInHand for GENIUS QATAR ===");
  const qatarDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: qatarOffice?.id,
    isSuperAdmin: true,
  });
  console.log(`Qatar count: ${qatarDocs.length}`);
  console.log("Qatar tracking numbers:", qatarDocs.map(d => d.trackingNumber));

  console.log("\n=== TESTING listDocumentInHand for GENIUS JEEVAN BHIMA NAGAR ===");
  const jeevanDocs = await listDocumentInHand({
    ownerAdminId,
    officeId: jeevanOffice?.id,
    isSuperAdmin: true,
  });
  console.log(`Jeevan count: ${jeevanDocs.length}`);
  console.log("Jeevan tracking numbers:", jeevanDocs.map(d => d.trackingNumber));
}

main().catch(console.error).finally(() => prisma.$disconnect());
