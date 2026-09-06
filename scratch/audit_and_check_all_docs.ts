import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== COMPREHENSIVE AUDIT OF ALL HISTORICAL BACK TO PROCESS MOVEMENTS ===");

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

  const anomalies: any[] = [];
  const validCompletedOrProgressed: any[] = [];
  const currentlyInbound: any[] = [];

  for (const tNum of trackingNumbers) {
    const docMov = await prisma.documentMovement.findFirst({
      where: { trackingNumber: tNum },
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

    if (!docMov) {
      anomalies.push({ trackingNumber: tNum, issue: "No DocumentMovement record found" });
      continue;
    }

    // Check latest history
    const latestHistory = await prisma.movementHistory.findFirst({
      where: { trackingNumber: tNum },
      orderBy: { performedAt: "desc" }
    });

    // Check if the document was subsequently received/processed or is still in INBOUND
    if (docMov.status === "INBOUND" || docMov.currentStatus === "Pending Receive") {
      // It is currently awaiting receive in Process Module
      currentlyInbound.push({
        trackingNumber: tNum,
        docMovId: docMov.id,
        currentModule: docMov.currentModule,
        status: docMov.status,
        currentStatus: docMov.currentStatus,
        fromOffice: docMov.fromOffice?.officeName,
        toOffice: docMov.toOffice?.officeName,
        bundleNumber: docMov.bundle?.bundleNumber,
        bundleStatus: docMov.bundle?.status,
        latestHistoryAction: latestHistory?.action,
        ownerAdminId: docMov.registration?.ownerAdminId
      });
    } else {
      validCompletedOrProgressed.push({
        trackingNumber: tNum,
        currentModule: docMov.currentModule,
        status: docMov.status,
        currentOffice: docMov.currentOffice?.officeName,
        latestHistoryAction: latestHistory?.action
      });
    }
  }

  console.log(`\nCurrently Inbound Documents: ${currentlyInbound.length}`);
  console.log(JSON.stringify(currentlyInbound, null, 2));

  console.log(`\nProgressed/Completed Documents: ${validCompletedOrProgressed.length}`);

  console.log(`\nAnomalies: ${anomalies.length}`);
  if (anomalies.length > 0) {
    console.log(JSON.stringify(anomalies, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
