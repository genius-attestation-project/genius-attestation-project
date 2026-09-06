import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== SCANNING ALL INBOUND / PROCESS_MODULE MOVEMENTS ACROSS DB ===");

  const movements = await prisma.documentMovement.findMany({
    where: {
      OR: [
        { currentModule: "PROCESS_MODULE" },
        { toModule: "PROCESS_MODULE" },
        { status: "INBOUND" },
        { currentStatus: "Pending Receive" },
      ]
    },
    include: {
      registration: true,
      fromOffice: true,
      toOffice: true,
      currentOffice: true,
      bundle: {
        include: {
          items: true,
          fromOffice: true,
          toOffice: true,
        }
      }
    }
  });

  console.log(`Found ${movements.length} total movements in Process / Inbound scope.`);

  const missingBundle: any[] = [];
  const missingFromOffice: any[] = [];
  const missingToOffice: any[] = [];
  const validBundles: any[] = [];

  for (const m of movements) {
    if (m.status === "INBOUND" || m.currentStatus === "Pending Receive" || m.currentModule === "PROCESS_MODULE") {
      if (!m.bundleId || !m.bundle) {
        missingBundle.push({
          id: m.id,
          trackingNumber: m.trackingNumber,
          status: m.status,
          currentStatus: m.currentStatus,
          currentModule: m.currentModule,
          fromOfficeId: m.fromOfficeId,
          fromOfficeName: m.fromOffice?.officeName,
          toOfficeId: m.toOfficeId,
          toOfficeName: m.toOffice?.officeName,
          ownerAdminId: m.registration?.ownerAdminId,
        });
      } else if (!m.fromOfficeId) {
        missingFromOffice.push({
          id: m.id,
          trackingNumber: m.trackingNumber,
          bundleId: m.bundleId,
          bundleNumber: m.bundle?.bundleNumber,
          toOfficeName: m.toOffice?.officeName,
        });
      } else {
        validBundles.push({
          trackingNumber: m.trackingNumber,
          bundleNumber: m.bundle?.bundleNumber,
          fromOfficeName: m.fromOffice?.officeName,
          toOfficeName: m.toOffice?.officeName,
          status: m.status,
        });
      }
    }
  }

  console.log(`\nMovements missing bundleId/bundle: ${missingBundle.length}`);
  console.log(JSON.stringify(missingBundle, null, 2));

  console.log(`\nMovements missing fromOfficeId: ${missingFromOffice.length}`);
  console.log(JSON.stringify(missingFromOffice, null, 2));

  console.log(`\nValid Inbound Movements with Bundle: ${validBundles.length}`);
  console.log(JSON.stringify(validBundles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
