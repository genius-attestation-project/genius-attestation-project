import { prisma } from "../src/lib/prisma";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

async function main() {
  console.log("=== Testing verifyMainProcessCompleted ===");
  
  // Test 1: Tracking 62192 (Qatar Attestation, completed in Process Module)
  const reg62192 = await prisma.registration.findUnique({
    where: { trackingNumber: "62192" },
    select: { id: true, trackingNumber: true, processType: true, deliveryLocation: true, ownerAdminId: true },
  });

  if (reg62192) {
    const res = await verifyMainProcessCompleted(reg62192.trackingNumber, reg62192.ownerAdminId);
    console.log("Tracking 62192 result:", res);
  } else {
    console.log("Tracking 62192 not found");
  }

  // Check Dubai documents that had pending sub-packages to ensure they are NOT marked completed!
  const dubaiDoc = await prisma.registration.findFirst({
    where: {
      trackingNumber: "4558246",
    },
    select: { id: true, trackingNumber: true, processType: true, deliveryLocation: true, ownerAdminId: true },
  });

  if (dubaiDoc) {
    const res = await verifyMainProcessCompleted(dubaiDoc.trackingNumber, dubaiDoc.ownerAdminId);
    console.log("Tracking 4558246 (MEA incomplete) result:", res);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
