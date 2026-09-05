import { prisma } from "../src/lib/prisma";

async function repair() {
  console.log("Starting data repair for documents 6565 and 4444...");

  const malappuramId = "cmt93clm60000i5zo7hc4vtdr";
  const malappuramOffice = await prisma.officeLocation.findUnique({
    where: { id: malappuramId },
  });

  if (!malappuramOffice) {
    throw new Error(`Office with ID ${malappuramId} not found`);
  }

  console.log("Target Office:", malappuramOffice.id, malappuramOffice.officeName);

  const bundleNumber = "BND-PROC-20260905-0013";
  const amGeniusLoc = await prisma.officeLocation.findFirst({
    where: { officeName: "AmGenius" },
  });
  const amGeniusId = amGeniusLoc?.id || "cmto88pvg00jlpa0uyedncep8";
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";

  await prisma.$transaction(
    async (tx) => {
      // 1. Upsert the bundle
      let bundle = await tx.bundle.findFirst({
        where: { bundleNumber },
      });

      if (!bundle) {
        bundle = await tx.bundle.create({
          data: {
            id: "cmto8wimf00q9pa0ujixqf0s2",
            bundleNumber,
            fromOfficeId: amGeniusId,
            toOfficeId: malappuramOffice.id,
            status: "Pending Receive",
            createdBy: "Nifras",
            ownerAdminId,
          },
        });
      } else {
        bundle = await tx.bundle.update({
          where: { id: bundle.id },
          data: {
            fromOfficeId: amGeniusId,
            toOfficeId: malappuramOffice.id,
            status: "Pending Receive",
            updatedAt: new Date(),
          },
        });
      }

      console.log("Bundle is ready:", bundle.id, bundle.bundleNumber, "toOfficeId:", bundle.toOfficeId);

      // 2. Ensure bundle items are Pending Receive
      for (const tNum of ["6565", "4444"]) {
        const existingItem = await tx.bundleItem.findFirst({
          where: { bundleId: bundle.id, trackingNumber: tNum },
        });

        if (!existingItem) {
          await tx.bundleItem.create({
            data: {
              bundleId: bundle.id,
              trackingNumber: tNum,
              status: "Pending Receive",
            },
          });
        } else {
          await tx.bundleItem.update({
            where: { id: existingItem.id },
            data: { status: "Pending Receive" },
          });
        }
      }

      // 3. Update document movements to point to Malappuram Process Module Inbound
      for (const tNum of ["6565", "4444"]) {
        const reg = await tx.registration.findUnique({
          where: { trackingNumber: tNum },
        });

        if (!reg) {
          console.warn(`Registration not found for ${tNum}`);
          continue;
        }

        await tx.documentMovement.updateMany({
          where: { trackingNumber: tNum },
          data: {
            fromOfficeId: amGeniusId,
            fromModule: "ASSIGNED_OFFICE",
            toModule: "PROCESS_MODULE",
            currentModule: "PROCESS_MODULE",
            toOfficeId: malappuramOffice.id,
            currentOfficeId: malappuramOffice.id,
            status: "INBOUND",
            currentStatus: "Pending Receive",
            bundleId: bundle.id,
            sentAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.registration.update({
          where: { trackingNumber: tNum },
          data: {
            trackingStatus: "In Transfer",
            bmStatus: "Transferred",
          },
        });

        // Record Audit Trail
        await tx.auditTrail.create({
          data: {
            registrationId: reg.id,
            action: "Process Inbound Routing Corrected",
            performedBy: "System Maintenance",
            description: `Document routing corrected to Malappuram Process Module Inbound via Bundle ${bundle.bundleNumber}.`,
          },
        });

        // Record Movement History
        await tx.movementHistory.create({
          data: {
            trackingNumber: tNum,
            action: "Process Route Corrected",
            oldStatus: "Pending Receive",
            newStatus: "Pending Receive",
            oldOffice: "Process Delhi",
            newOffice: "Malappuram",
            performedBy: "System Maintenance",
            remarks: `Routing corrected to Malappuram via Bundle ${bundle.bundleNumber}`,
          },
        });

        console.log(`Successfully repaired document ${tNum}`);
      }
    },
    { maxWait: 20000, timeout: 60000 }
  );

  console.log("Data repair completed successfully.");
}

repair()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
