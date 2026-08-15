import { prisma } from "../src/lib/prisma";
import { createTransferBundle, listOutboundBundles, receiveBundle } from "../src/features/home/server/bundle-workflow.service";
import { retrieveOutboundDocuments } from "../src/features/document-movement/server/document-retrieve.service";

async function runVisibilityTest() {
  console.log("=== STARTING RETRIEVE VISIBILITY TESTS ===");

  const ownerAdmin = await prisma.user.findFirst({
    where: { role: { name: "Super Admin" } },
  }) || await prisma.user.findFirst();

  if (!ownerAdmin) throw new Error("No admin user found.");
  const ownerAdminId = ownerAdmin.ownerAdminId || ownerAdmin.id;

  let kochiOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: { contains: "Kochi" } },
  });
  if (!kochiOffice) {
    kochiOffice = await prisma.officeLocation.create({
      data: { officeName: "Kochi HQ", location: "Kochi", timezone: "UTC", ownerAdminId },
    });
  }

  let malappuramOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId, officeName: { contains: "Malappuram" } },
  });
  if (!malappuramOffice) {
    malappuramOffice = await prisma.officeLocation.create({
      data: { officeName: "Malappuram", location: "Malappuram", timezone: "UTC", ownerAdminId },
    });
  }

  const tracking1 = `TEST-VIS-1-${Date.now()}`;
  const tracking2 = `TEST-VIS-2-${Date.now()}`;
  const tracking3 = `TEST-VIS-3-${Date.now()}`;

  try {
    // Setup Registrations & Movements
    for (const tNum of [tracking1, tracking2, tracking3]) {
      const reg = await prisma.registration.create({
        data: {
          trackingNumber: tNum,
          customerName: "Visibility Test Customer",
          mobile: "9990001112",
          documentType: "Diploma",
          processType: "UAE Attestation",
          regionOfRegistration: kochiOffice.officeName,
          trackingStatus: "Registered",
          bmStatus: "Pending",
          ownerAdminId,
        },
      });

      await prisma.documentMovement.create({
        data: {
          trackingNumber: tNum,
          registrationId: reg.id,
          fromOfficeId: kochiOffice.id,
          currentOfficeId: kochiOffice.id,
          toOfficeId: kochiOffice.id,
          currentModule: "REGISTRATION",
          status: "HOME",
          currentStatus: "Document In Hand",
          createdBy: ownerAdmin.id,
        },
      });
    }

    // CASE 1: Transfer active pending bundle
    console.log("\n--- Case 1: Active Pending Bundle ---");
    const bundlePending = await createTransferBundle({
      trackingNumbers: [tracking1],
      fromOfficeId: kochiOffice.id,
      toOfficeId: malappuramOffice.id,
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Admin",
      ownerAdminId,
    });

    let outboundList = await listOutboundBundles({ fromOfficeId: kochiOffice.id, ownerAdminId });
    let targetBundle = outboundList.find((b: any) => b.id === bundlePending.id);
    console.log(`Bundle ${bundlePending.bundleNumber} status: "${targetBundle?.status}", canRetrieve: ${targetBundle?.canRetrieve}`);
    if (targetBundle?.canRetrieve !== true) {
      throw new Error("Case 1 FAILED: canRetrieve should be TRUE for pending bundle!");
    }
    console.log("✔ Case 1 PASSED!");

    // CASE 2: Bundle Received by Destination
    console.log("\n--- Case 2: Received Bundle ---");
    const bundleReceived = await createTransferBundle({
      trackingNumbers: [tracking2],
      fromOfficeId: kochiOffice.id,
      toOfficeId: malappuramOffice.id,
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Admin",
      ownerAdminId,
    });

    await receiveBundle({
      bundleId: bundleReceived.id,
      receivedTrackingNumbers: [tracking2],
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Admin",
      ownerAdminId,
    });

    outboundList = await listOutboundBundles({ fromOfficeId: kochiOffice.id, ownerAdminId });
    targetBundle = outboundList.find((b: any) => b.id === bundleReceived.id);
    console.log(`Bundle ${bundleReceived.bundleNumber} status: "${targetBundle?.status}", canRetrieve: ${targetBundle?.canRetrieve}`);
    if (targetBundle?.canRetrieve !== false) {
      throw new Error("Case 2 FAILED: canRetrieve should be FALSE for received bundle!");
    }
    console.log("✔ Case 2 PASSED!");

    // CASE 3: Bundle Retrieved
    console.log("\n--- Case 3: Retrieved Bundle ---");
    const bundleRetrieved = await createTransferBundle({
      trackingNumbers: [tracking3],
      fromOfficeId: kochiOffice.id,
      toOfficeId: malappuramOffice.id,
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Admin",
      ownerAdminId,
    });

    await retrieveOutboundDocuments({
      ownerAdminId,
      userId: ownerAdmin.id,
      userName: ownerAdmin.name || "Admin",
      userOfficeId: kochiOffice.id,
      userOfficeName: kochiOffice.officeName,
      bundleId: bundleRetrieved.id,
      reason: "Test retrieve visibility",
    });

    outboundList = await listOutboundBundles({ fromOfficeId: kochiOffice.id, ownerAdminId });
    targetBundle = outboundList.find((b: any) => b.id === bundleRetrieved.id);
    console.log(`Bundle ${bundleRetrieved.bundleNumber} status: "${targetBundle?.status}", canRetrieve: ${targetBundle?.canRetrieve}`);
    if (targetBundle?.canRetrieve !== false) {
      throw new Error("Case 3 FAILED: canRetrieve should be FALSE for retrieved bundle!");
    }
    console.log("✔ Case 3 PASSED!");

    console.log("\n=== ALL VISIBILITY TEST CASES PASSED ===");
  } finally {
    console.log("\nCleaning up test records...");
    for (const tNum of [tracking1, tracking2, tracking3]) {
      await prisma.movementHistory.deleteMany({ where: { trackingNumber: tNum } }).catch(() => {});
      await prisma.documentWorkflowHistory.deleteMany({ where: { trackingNumber: tNum } }).catch(() => {});
      await prisma.bundleItem.deleteMany({ where: { trackingNumber: tNum } }).catch(() => {});
      await prisma.documentMovement.deleteMany({ where: { trackingNumber: tNum } }).catch(() => {});
      await prisma.registration.deleteMany({ where: { trackingNumber: tNum } }).catch(() => {});
    }
    await prisma.bundle.deleteMany({ where: { bundleNumber: { contains: "HOME-" } } }).catch(() => {});
    console.log("Cleanup complete.");
  }
}

runVisibilityTest().catch((err) => {
  console.error("VISIBILITY TEST SUITE FAILED:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
