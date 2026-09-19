import { prisma } from "../src/lib/prisma";
import { listReadyForDelivery } from "../src/features/ready-for-delivery/server/ready-for-delivery.service";

async function main() {
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  
  console.log("Querying Ready For Delivery list for Genius Qatar...");
  const result = await listReadyForDelivery(ownerAdminId, "Genius Qatar", {}, {
    isSuperAdmin: true,
    allowedOfficeNames: ["Genius Qatar"],
  });

  console.log(`Total sections: ${result.sections.length}`);
  for (const s of result.sections) {
    console.log(`Section: ${s.title}, Count: ${s.items.length}`);
    const found62192 = s.items.find(i => i.registrationNumber === "62192" || i.compactTrackingNumber === "62192");
    if (found62192) {
      console.log("Found 62192 in section:", s.title, found62192);
    }
  }

  console.log("Ready For Delivery Stats:", result.stats);
}

main().finally(() => prisma.$disconnect());
