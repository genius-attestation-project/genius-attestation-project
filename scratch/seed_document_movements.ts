import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  const registrations = await prisma.registration.findMany();
  for (const reg of registrations) {
    const existing = await prisma.documentMovement.findUnique({
      where: { trackingNumber: reg.trackingNumber },
    });

    if (!existing) {
      const office = await prisma.officeLocation.findFirst({
        where: { officeName: reg.regionOfRegistration || "", ownerAdminId: reg.ownerAdminId || "" },
      });

      await prisma.documentMovement.create({
        data: {
          trackingNumber: reg.trackingNumber,
          registrationId: reg.id,
          currentOfficeId: office?.id || null,
          currentModule: "REGISTRATION",
          status: reg.bmStatus === "Accepted" ? "HOME" : "HOME", // Assuming all existing are at least in HOME
          movementType: "INITIAL",
          createdBy: reg.createdBy,
        },
      });

      await prisma.movementHistory.create({
        data: {
          trackingNumber: reg.trackingNumber,
          action: "Created",
          newStatus: "HOME",
          newOffice: reg.regionOfRegistration,
          performedBy: reg.createdBy,
        }
      });
    }
  }
  console.log("Seeded DocumentMovement for existing registrations.");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
