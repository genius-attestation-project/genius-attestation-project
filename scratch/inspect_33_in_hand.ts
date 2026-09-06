import { prisma } from "../src/lib/prisma";

async function main() {
  const ownerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  
  const inHandDocs = await prisma.registration.findMany({
    where: {
      ownerAdminId,
      trackingStatus: "Document In Hand",
    },
    include: {
      documentMovements: {
        include: {
          fromOffice: true,
          toOffice: true,
          currentOffice: true,
          bundle: true,
        },
        orderBy: { createdAt: "desc" },
      },
      movementApprovals: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${inHandDocs.length} documents with trackingStatus = 'Document In Hand':\n`);

  const officeGroups: Record<string, any[]> = {};

  for (const d of inHandDocs) {
    const mov = d.documentMovements[0];
    const officeName = mov?.currentOffice?.officeName || mov?.toOffice?.officeName || d.regionOfRegistration || "Unknown";
    
    if (!officeGroups[officeName]) {
      officeGroups[officeName] = [];
    }

    officeGroups[officeName].push({
      trackingNumber: d.trackingNumber,
      customerName: d.customerName,
      regionOfRegistration: d.regionOfRegistration,
      deliveryLocation: d.deliveryLocation,
      bmStatus: d.bmStatus,
      advancePaid: d.advancePaid,
      advancePaymentStatus: d.advancePaymentStatus,
      movementApproved: d.movementApproved,
      currentOfficeId: mov?.currentOfficeId,
      currentOfficeName: mov?.currentOffice?.officeName,
      movementStatus: mov?.status,
      currentStatus: mov?.currentStatus,
      currentModule: mov?.currentModule,
      fromModule: mov?.fromModule,
      toModule: mov?.toModule,
      bundleNumber: mov?.bundle?.bundleNumber,
    });
  }

  for (const [office, items] of Object.entries(officeGroups)) {
    console.log(`\n==================================================`);
    console.log(`OFFICE: ${office} (${items.length} documents)`);
    console.log(`==================================================`);
    for (const item of items) {
      console.log(`- Tracking: ${item.trackingNumber} | Customer: ${item.customerName} | RegOffice: ${item.regionOfRegistration} | Delivery: ${item.deliveryLocation} | MovCurrentOffice: ${item.currentOfficeName || "null"} | MovStatus: ${item.movementStatus}/${item.currentStatus} | Bundle: ${item.bundleNumber || "none"}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
