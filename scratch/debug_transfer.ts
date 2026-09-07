import { prisma } from "../src/lib/prisma";
import { transferBackToProcess, getAuthorizedProcessRecipientsForAssignedOffice } from "../src/features/assigned-office/server/assigned-office.service";

async function main() {
  console.log("Debug starting...");
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  
  console.log("Step 1: Finding CM Genius AO...");
  const cmGeniusAO = await (prisma as any).assignedOffice.findFirst({
    where: { username: "Test CM Genius", ownerAdminId },
  });
  console.log("Found CM Genius AO:", cmGeniusAO?.id);

  console.log("Step 2: Finding CM Genius Loc...");
  const cmGeniusLoc = await prisma.officeLocation.findFirst({
    where: { officeName: "Test CM Genius", ownerAdminId },
  });
  console.log("Found CM Genius Loc:", cmGeniusLoc?.id);

  console.log("Step 3: Checking authorized recipients...");
  const recipients = await getAuthorizedProcessRecipientsForAssignedOffice({
    assignedOfficeLocIds: [cmGeniusLoc!.id],
    ownerAdminId,
  });
  console.log("Found recipients:", recipients);

  console.log("Step 4: Finding test doc...");
  const doc = await prisma.registration.findFirst({
    where: { trackingNumber: { startsWith: "TEST-B2P-" } },
  });
  console.log("Found doc:", doc?.trackingNumber);

  if (doc && cmGeniusAO) {
    console.log("Step 5: Running transferBackToProcess...");
    const res = await transferBackToProcess({
      trackingNumbers: [doc.trackingNumber],
      officeId: cmGeniusAO.id,
      userId: recipients[0]?.id || "admin",
      userName: "Amal",
      ownerAdminId,
    });
    console.log("Result:", res);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error("Error in debug:", err);
  process.exit(1);
});
