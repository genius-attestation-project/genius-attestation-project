import { prisma } from "./src/lib/prisma";
import { resolveOfficeLocationName, resolveOfficeLocationId } from "./src/lib/office-location";

async function main() {
  const testDev = await prisma.user.findFirst({
    where: { email: "testuse.dev@gmail.com" },
    include: { officeLocationRef: true },
  });

  console.log("=== TEST DEV FROM DB ===");
  console.log(testDev);

  if (testDev) {
    const resolvedName = await resolveOfficeLocationName({
      ownerAdminId: testDev.ownerAdminId ?? "",
      officeLocationId: testDev.officeLocationId ?? undefined,
      officeLocationName: testDev.officeLocationName ?? undefined,
    });

    console.log("=== RESOLVED NAME FOR TEST DEV ===");
    console.log("Resolved Name:", resolvedName);

    const resolvedId = await resolveOfficeLocationId({
      ownerAdminId: testDev.ownerAdminId ?? "",
      officeLocationId: testDev.officeLocationId ?? undefined,
      officeLocationName: testDev.officeLocationName ?? undefined,
      userId: testDev.id,
    });

    console.log("=== RESOLVED ID FOR TEST DEV ===");
    console.log("Resolved ID:", resolvedId);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
