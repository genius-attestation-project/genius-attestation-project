import { prisma } from "../src/lib/prisma";
import { listProcessAssignments } from "../src/features/process/server/process.service";

async function main() {
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";
  const officeName = "Malappuram";

  const inboundBundles = await listProcessAssignments(ownerAdminId, officeName, undefined, "inbound");
  console.log(`Inbound bundle count: ${inboundBundles.length}`);
  for (const bundle of inboundBundles) {
    console.log(`Bundle: ${bundle.bundleNumber}, From: ${bundle.fromOfficeName}, To: ${bundle.toOfficeName}, Count: ${bundle.documentCount}`);
    for (const doc of (bundle as any).items || []) {
      console.log(`  - Doc: ${doc.trackingNumber}, Customer: ${doc.customerName || doc.registration?.customerName}, Status: ${doc.status}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
