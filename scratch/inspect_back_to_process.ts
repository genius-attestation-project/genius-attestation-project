import { prisma } from "../src/lib/prisma";

async function inspect() {
  console.log("=== INSPECTING DOCUMENTS 6565 AND 444 ===");
  const docs = await prisma.registration.findMany({
    where: { trackingNumber: { in: ["6565", "444", "4444", "1111", "2222"] } },
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
              items: true,
            },
          },
        },
      },
      auditTrail: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  console.log("Documents count:", docs.length);
  for (const doc of docs) {
    console.log(`\n--- DOCUMENT ${doc.trackingNumber} (${doc.id}) ---`);
    console.log("Customer:", doc.customerName);
    console.log("Tracking Status:", doc.trackingStatus);
    console.log("BM Status:", doc.bmStatus);
    console.log("Region of Registration:", doc.regionOfRegistration);
    console.log("Delivery Location:", doc.deliveryLocation);
    console.log("Movements count:", doc.documentMovements.length);
    for (const m of doc.documentMovements) {
      console.log("Movement:", {
        id: m.id,
        status: m.status,
        currentStatus: m.currentStatus,
        fromModule: m.fromModule,
        toModule: m.toModule,
        currentModule: m.currentModule,
        fromOffice: m.fromOffice?.officeName,
        toOffice: m.toOffice?.officeName,
        currentOffice: m.currentOffice?.officeName,
        bundleId: m.bundleId,
        bundleNumber: m.bundle?.bundleNumber,
        bundleStatus: m.bundle?.status,
        bundleFrom: m.bundle?.fromOffice?.officeName,
        bundleTo: m.bundle?.toOffice?.officeName,
        movementType: m.movementType,
        sentAt: m.sentAt,
        receivedAt: m.receivedAt,
        acceptedBy: m.acceptedBy,
        remarks: m.remarks,
      });

      // Corrective update if toOffice is AmGenius
      if (m.toOffice?.officeName === "AmGenius" && m.movementType === "BACK_TO_PROCESS") {
        const destOfficeId = "cmsjy9vik00qyo31tr9llc801"; // Process Delhi
        const destOfficeName = "Process Delhi";
        console.log("Correcting active state for:", m.trackingNumber);
        await prisma.documentMovement.update({
          where: { id: m.id },
          data: {
            toOfficeId: destOfficeId,
            acceptedBy: "cmt9z3ose00jiqi0khw2o830e",
            remarks: `Corrected destination to Process Module (${destOfficeName}) for authorized user: Nifras`,
          },
        });
        if (m.bundleId) {
          await prisma.bundle.update({
            where: { id: m.bundleId },
            data: { toOfficeId: destOfficeId },
          });
        }
        await prisma.auditTrail.create({
          data: {
            registrationId: doc.id,
            action: "Corrected Back To Process Destination",
            performedBy: "System / Architect",
            description: `Corrected active destination from Assigned Office Inbound to Process Module Inbound (${destOfficeName}) for authorized recipient Nifras.`,
          },
        });
        await prisma.movementHistory.create({
          data: {
            trackingNumber: m.trackingNumber,
            action: "Destination Mapping Corrected",
            oldStatus: m.status,
            newStatus: m.status,
            oldOffice: "AmGenius",
            newOffice: destOfficeName,
            performedBy: "System / Architect",
            remarks: `Corrected destination mapping to Process Module (${destOfficeName}) for authorized user Nifras.`,
          },
        });
        console.log("Successfully corrected active state for:", m.trackingNumber);
      }
    }
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

