import { prisma } from "../src/lib/prisma";

async function main() {
  const docs = await prisma.registration.findMany({
    where: { trackingNumber: { in: ["6565", "444", "4444"] } },
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          toOffice: true,
          fromOffice: true,
          bundle: {
            include: {
              fromOffice: true,
              toOffice: true,
            },
          },
        },
      },
      auditTrail: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  for (const doc of docs) {
    console.log("==================================================");
    console.log(`DOCUMENT: ${doc.trackingNumber} | ID: ${doc.id}`);
    console.log("Customer:", doc.customerName);
    console.log("TrackingStatus:", doc.trackingStatus);
    console.log("BMStatus:", doc.bmStatus);
    console.log("RegionOfRegistration:", doc.regionOfRegistration);
    console.log("Movements:");
    for (const m of doc.documentMovements) {
      console.log({
        id: m.id,
        status: m.status,
        currentStatus: m.currentStatus,
        fromModule: m.fromModule,
        toModule: m.toModule,
        currentModule: m.currentModule,
        fromOffice: m.fromOffice?.officeName,
        toOffice: m.toOffice?.officeName,
        currentOffice: m.currentOffice?.officeName,
        bundleNumber: m.bundle?.bundleNumber,
        bundleStatus: m.bundle?.status,
        bundleFrom: m.bundle?.fromOffice?.officeName,
        bundleTo: m.bundle?.toOffice?.officeName,
        movementType: m.movementType,
        remarks: m.remarks,
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
