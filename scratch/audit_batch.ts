import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== BATCH AUDIT OF ALL HISTORICAL BACK TO PROCESS MOVEMENTS ===");

  const backHistories = await prisma.movementHistory.findMany({
    where: {
      OR: [
        { action: { contains: "Back To Process" } },
        { action: { contains: "Back to Process" } },
        { remarks: { contains: "Transferred back to" } },
      ]
    },
    orderBy: { performedAt: "asc" }
  });

  const trackingNumbers = Array.from(new Set(backHistories.map(h => h.trackingNumber)));
  console.log(`Total unique documents with Back To Process history: ${trackingNumbers.length}`);

  const docMovements = await prisma.documentMovement.findMany({
    where: { trackingNumber: { in: trackingNumbers } },
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

  const docMovMap = new Map(docMovements.map(m => [m.trackingNumber, m]));
  const anomalies: any[] = [];
  const currentlyInbound: any[] = [];
  const progressed: any[] = [];

  for (const tNum of trackingNumbers) {
    const docMov = docMovMap.get(tNum);
    if (!docMov) {
      anomalies.push({ trackingNumber: tNum, issue: "No DocumentMovement record found" });
      continue;
    }

    if (docMov.status === "INBOUND" || docMov.currentStatus === "Pending Receive") {
      currentlyInbound.push({
        trackingNumber: tNum,
        currentModule: docMov.currentModule,
        status: docMov.status,
        currentStatus: docMov.currentStatus,
        fromOffice: docMov.fromOffice?.officeName,
        toOffice: docMov.toOffice?.officeName,
        bundleNumber: docMov.bundle?.bundleNumber,
        bundleStatus: docMov.bundle?.status,
        ownerAdminId: docMov.registration?.ownerAdminId
      });
    } else {
      progressed.push({
        trackingNumber: tNum,
        currentModule: docMov.currentModule,
        status: docMov.status,
        currentOffice: docMov.currentOffice?.officeName,
      });
    }
  }

  console.log(`\nCurrently Inbound Documents: ${currentlyInbound.length}`);
  console.log(JSON.stringify(currentlyInbound, null, 2));

  console.log(`\nProgressed/Received Documents: ${progressed.length}`);

  console.log(`\nAnomalies: ${anomalies.length}`);
  if (anomalies.length > 0) {
    console.log(JSON.stringify(anomalies, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
