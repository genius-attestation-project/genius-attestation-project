import { prisma } from "../src/lib/prisma";
import { listProcessAssignments, getProcessStats } from "../src/features/process/server/process.service";

async function main() {
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";
  const officeName = "Malappuram";

  console.log("=== CHECKING PROCESS STATS FOR MALAPPURAM ===");
  const stats = await getProcessStats(ownerAdminId, officeName);
  console.log("Stats:", JSON.stringify(stats, null, 2));

  console.log("=== CHECKING INBOUND TAB FOR MALAPPURAM ===");
  const inboundList = await listProcessAssignments(ownerAdminId, officeName, undefined, "inbound");
  console.log(`Found ${inboundList.length} items in Inbound:`);
  for (const item of inboundList) {
    console.log(`- Tracking: ${item.trackingNumber}, Customer: ${item.customerName}, Status: ${item.status}, CurrentOffice: ${item.currentOffice}`);
  }

  const trackingNumbersInbound = inboundList.map((i) => i.trackingNumber);
  console.log("Are 6565 and 4444 in Inbound?", trackingNumbersInbound.includes("6565") && trackingNumbersInbound.includes("4444"));
}

main().catch(console.error).finally(() => prisma.$disconnect());
