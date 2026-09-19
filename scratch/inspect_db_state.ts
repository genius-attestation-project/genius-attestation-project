import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING RECENT REGISTRATIONS ===");
  const regs = await prisma.registration.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          fromOffice: true,
          toOffice: true,
        },
      },
    },
  });

  for (const r of regs) {
    console.log(`\n--- Tracking: ${r.trackingNumber} | Customer: ${r.customerName} ---`);
    console.log(`  ProcessType: "${r.processType}" | SubPackage: "${r.subPackage}" | DeliveryLocation: "${r.deliveryLocation}"`);
    console.log(`  TrackingStatus: "${r.trackingStatus}" | BMStatus: "${r.bmStatus}"`);
    const dms = r.documentMovements;
    for (const dm of dms) {
      console.log(`  DM: status="${dm.status}", currentStatus="${dm.currentStatus}", currentModule="${dm.currentModule}", currentOffice="${dm.currentOffice?.officeName}" (id: ${dm.currentOfficeId}), toOffice="${dm.toOffice?.officeName}" (id: ${dm.toOfficeId})`);
    }

    const history = await prisma.movementHistory.findMany({
      where: { trackingNumber: r.trackingNumber },
      orderBy: { performedAt: "asc" },
    });
    console.log(`  History (${history.length} entries):`);
    for (const h of history) {
      console.log(`    [${h.performedAt.toISOString()}] action="${h.action}", oldStatus="${h.oldStatus}", newStatus="${h.newStatus}", oldOffice="${h.oldOffice}", newOffice="${h.newOffice}"`);
    }

    const subMovements = await (prisma as any).subPackageMovement.findMany({
      where: { trackingNumber: r.trackingNumber },
    });
    console.log(`  SubMovements (${subMovements.length}):`);
    for (const sm of subMovements) {
      console.log(`    subPackageId="${sm.subPackageId}", status="${sm.status}", assignedOfficeId="${sm.assignedOfficeId}"`);
    }
  }

  console.log("\n=== CHECKING MASTER DATA PROCESS TYPES ===");
  const masterProcessTypes = await prisma.masterData.findMany({
    where: { type: "PROCESS_TYPES" },
    include: { subPackages: true },
  });
  for (const mpt of masterProcessTypes) {
    console.log(`ProcessType: "${mpt.name}" (id: ${mpt.id})`);
    for (const sp of mpt.subPackages) {
      console.log(`  SubPackage: "${sp.name}" (id: ${sp.id}, isActive: ${sp.isActive})`);
    }
  }

  console.log("\n=== CHECKING BUNDLES ===");
  const bundles = await prisma.bundle.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      fromOffice: true,
      toOffice: true,
      items: true,
    },
  });
  for (const b of bundles) {
    console.log(`Bundle ${b.bundleNumber}: from="${b.fromOffice?.officeName}" (${b.fromOfficeId}) to="${b.toOffice?.officeName}" (${b.toOfficeId}), status="${b.status}", items=${b.items.map(i => `${i.trackingNumber}:${i.status}`).join(", ")}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
