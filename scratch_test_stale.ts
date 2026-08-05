import { prisma } from "./src/lib/prisma";
import { resolveOfficeLocationName, resolveOfficeLocationId } from "./src/lib/office-location";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "testuse.dev@gmail.com" },
  });

  if (!user) {
    console.log("Test Dev not found!");
    return;
  }

  // Simulate stale session (where session parameter has old office ID / name)
  const staleSessionOfficeId = "cmrbyb22r0000pa0kiir8v7a0"; // Malappuram ID
  const staleSessionOfficeName = "Malappuram";

  console.log("User in DB:", user.name, "| Real DB Office:", user.officeLocationName);

  const resolvedName = await resolveOfficeLocationName({
    ownerAdminId: user.ownerAdminId ?? "",
    officeLocationId: staleSessionOfficeId,
    officeLocationName: staleSessionOfficeName,
    userId: user.id,
  });

  const resolvedId = await resolveOfficeLocationId({
    ownerAdminId: user.ownerAdminId ?? "",
    officeLocationId: staleSessionOfficeId,
    officeLocationName: staleSessionOfficeName,
    userId: user.id,
  });

  console.log("Resolved Office Name (with stale session passed):", resolvedName);
  console.log("Resolved Office ID (with stale session passed):", resolvedId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
