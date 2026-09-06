import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== EXECUTING RESTORATION OF HISTORICAL BACK-TO-PROCESS RECORDS ===");

  const trackingNumbers = [
    "62238",
    "62211",
    "61849",
    "61811",
    "61750",
    "61802",
    "61733",
    "61724",
    "61793",
  ];

  const tenantOwnerAdminId = "c8b26a64-a178-11f1-9fb2-76763ffa5298";
  const bundleNumber = "BND-PROC-20260905-0104";

  // Find destination office (Genius Qatar)
  const destOffice = await prisma.officeLocation.findFirst({
    where: {
      ownerAdminId: tenantOwnerAdminId,
      officeName: "Genius Qatar",
    },
  });

  if (!destOffice) {
    throw new Error("Destination office 'Genius Qatar' not found");
  }

  // Find source assigned office (cmgenius)
  let sourceOffice = await prisma.officeLocation.findFirst({
    where: {
      ownerAdminId: tenantOwnerAdminId,
      officeName: "cmgenius",
    },
  });

  if (!sourceOffice) {
    sourceOffice = await prisma.officeLocation.findFirst({
      where: {
        ownerAdminId: tenantOwnerAdminId,
        officeName: "CMGenius",
      },
    });
  }

  if (!sourceOffice) {
    sourceOffice = await prisma.officeLocation.create({
      data: {
        officeName: "cmgenius",
        location: "External Processing Office",
        timezone: "UTC",
        isProcessOffice: true,
        ownerAdminId: tenantOwnerAdminId,
      },
    });
  }

  console.log(`Source Office: ${sourceOffice.officeName} (${sourceOffice.id})`);
  console.log(`Destination Office: ${destOffice.officeName} (${destOffice.id})`);

  // Ensure Bundle exists
  let bundle = await prisma.bundle.findFirst({
    where: {
      bundleNumber,
      ownerAdminId: tenantOwnerAdminId,
    },
  });

  if (!bundle) {
    bundle = await prisma.bundle.create({
      data: {
        bundleNumber,
        fromOfficeId: sourceOffice.id,
        toOfficeId: destOffice.id,
        status: "Pending Receive",
        createdBy: "System Restoration Audit",
        ownerAdminId: tenantOwnerAdminId,
      },
    });
    console.log(`Created missing bundle ${bundle.bundleNumber} (ID: ${bundle.id})`);
  } else {
    await prisma.bundle.update({
      where: { id: bundle.id },
      data: {
        fromOfficeId: sourceOffice.id,
        toOfficeId: destOffice.id,
        status: "Pending Receive",
      },
    });
    console.log(`Updated existing bundle ${bundle.bundleNumber} (ID: ${bundle.id})`);
  }

  // Ensure BundleItems and update DocumentMovement
  for (const tNum of trackingNumbers) {
    console.log(`\nProcessing tracking number: ${tNum}`);

    const reg = await prisma.registration.findUnique({
      where: { trackingNumber: tNum },
    });

    if (!reg) {
      console.warn(`Registration not found for tracking: ${tNum}`);
      continue;
    }

    // Bundle item
    const existingItem = await prisma.bundleItem.findFirst({
      where: {
        bundleId: bundle.id,
        trackingNumber: tNum,
      },
    });

    if (!existingItem) {
      await prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          registrationId: reg.id,
          trackingNumber: tNum,
          status: "Pending Receive",
        },
      });
      console.log(`  -> Created BundleItem for ${tNum}`);
    } else {
      await prisma.bundleItem.update({
        where: { id: existingItem.id },
        data: {
          status: "Pending Receive",
          registrationId: reg.id,
        },
      });
      console.log(`  -> Updated BundleItem for ${tNum}`);
    }

    // Update documentMovement
    await prisma.documentMovement.updateMany({
      where: { trackingNumber: tNum },
      data: {
        fromModule: "ASSIGNED_OFFICE",
        toModule: "PROCESS_MODULE",
        currentModule: "PROCESS_MODULE",
        fromOfficeId: sourceOffice.id,
        toOfficeId: destOffice.id,
        currentOfficeId: destOffice.id,
        status: "INBOUND",
        currentStatus: "Pending Receive",
        bundleId: bundle.id,
        sentAt: new Date(),
      } as any,
    });
    console.log(`  -> Updated DocumentMovement to INBOUND under bundle ${bundle.bundleNumber}`);

    // Update registration status
    await prisma.registration.update({
      where: { trackingNumber: tNum },
      data: {
        trackingStatus: "In Transfer",
        bmStatus: "Transferred",
      },
    });

    // Create AuditTrail
    await prisma.auditTrail.create({
      data: {
        registrationId: reg.id,
        action: "Back To Process Restored",
        performedBy: "System Migration",
        description: `Document routing safely restored to ${destOffice.officeName} Process Module Inbound under Bundle ${bundle.bundleNumber}.`,
      },
    });

    // Create DocumentWorkflowHistory
    await prisma.documentWorkflowHistory.create({
      data: {
        documentId: reg.id,
        trackingNumber: tNum,
        workflowStep: "Back To Process Transfer (Restored)",
        status: "Pending Receive",
        performedBy: "System Migration",
        remarks: `Restored to Process Office (${destOffice.officeName}) via Bundle ${bundle.bundleNumber}`,
        ownerAdminId: tenantOwnerAdminId,
      },
    });
  }

  console.log("\n=== ALL 9 HISTORICAL RECORDS RESTORED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("Restoration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
