import { prisma } from "../src/lib/prisma";
import { verifyMainProcessCompleted } from "../src/features/process/server/core-subprocess-validation";

async function reconcileStuckDocuments() {
  console.log("=== SCANNING FOR INCORRECTLY ROUTED DOCUMENTS ===");

  // Find all active registrations
  const registrations = await prisma.registration.findMany({
    where: {
      AND: [
        {
          OR: [
            { trackingStatus: "Document In Hand" },
            { bmStatus: "Received" },
          ],
        },
        { trackingStatus: { not: "Delivered" } },
        {
          OR: [
            { deliveryStatus: null },
            { deliveryStatus: { not: "Delivered" } },
          ],
        },
      ],
    },
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          toOffice: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  console.log(`Found ${registrations.length} candidate registrations in Document In Hand / Received state.`);

  const offices = await prisma.officeLocation.findMany({
    select: { id: true, officeName: true },
  });
  const officeById = new Map(offices.map((o) => [o.id, o]));
  const officeByName = new Map(offices.map((o) => [o.officeName.trim().toLowerCase(), o]));

  const assignedOffices = await prisma.assignedOffice.findMany({
    select: { id: true, username: true },
  });
  const assignedById = new Map(assignedOffices.map((a) => [a.id, a]));
  const assignedByName = new Map(assignedOffices.map((a) => [a.username.trim().toLowerCase(), a]));

  const correctedList: Array<{ trackingNumber: string; deliveryLocation: string; currentOffice: string }> = [];

  for (const reg of registrations) {
    const dm = reg.documentMovements[0];
    if (!dm) continue;

    // Check that document is actually in DOCUMENT_IN_HAND
    if (
      dm.currentStatus !== "Document In Hand" &&
      dm.status !== "Received" &&
      reg.trackingStatus !== "Document In Hand"
    ) {
      continue;
    }

    const currentOfficeId = dm.currentOfficeId || dm.toOfficeId;
    const currentOffice = currentOfficeId ? officeById.get(currentOfficeId) : null;
    const currentOfficeName = currentOffice?.officeName || dm.currentOffice?.officeName || dm.toOffice?.officeName || "";
    const deliveryLocation = reg.deliveryLocation?.trim() || "";

    if (!deliveryLocation || (!currentOfficeId && !currentOfficeName)) {
      continue;
    }

    // Resolve delivery location to office ID or name
    let deliveryOffice =
      officeById.get(deliveryLocation) ||
      officeByName.get(deliveryLocation.toLowerCase()) ||
      null;

    if (!deliveryOffice) {
      const ao =
        assignedById.get(deliveryLocation) ||
        assignedByName.get(deliveryLocation.toLowerCase()) ||
        null;
      if (ao) {
        deliveryOffice = { id: ao.id, officeName: ao.username };
      }
    }

    // Generic office comparison
    const isOfficeMatch = Boolean(
      (deliveryOffice?.id && (deliveryOffice.id === currentOfficeId)) ||
      (deliveryOffice?.officeName && currentOfficeName && deliveryOffice.officeName.trim().toLowerCase() === currentOfficeName.trim().toLowerCase()) ||
      (currentOfficeName && currentOfficeName.trim().toLowerCase() === deliveryLocation.trim().toLowerCase()) ||
      (currentOfficeId && currentOfficeId.trim().toLowerCase() === deliveryLocation.trim().toLowerCase())
    );

    if (!isOfficeMatch) {
      continue;
    }

    // Verify Main Process Completed
    const check = await verifyMainProcessCompleted(reg.trackingNumber, reg.ownerAdminId);
    if (!check.isCompleted) {
      continue;
    }

    // Eligible for Ready For Delivery!
    console.log(`\nReconciling Document: ${reg.trackingNumber}`);
    console.log(`  ProcessType: ${reg.processType}`);
    console.log(`  DeliveryLocation: ${deliveryLocation}`);
    console.log(`  CurrentOffice: ${currentOfficeName} (${currentOfficeId})`);

    await prisma.$transaction(async (tx) => {
      await tx.documentMovement.updateMany({
        where: { trackingNumber: reg.trackingNumber },
        data: {
          status: "Ready for Delivery",
          currentModule: "READY_FOR_DELIVERY",
          currentStatus: "READY_FOR_DELIVERY",
          updatedAt: new Date(),
        },
      });

      await tx.registration.update({
        where: { trackingNumber: reg.trackingNumber },
        data: {
          trackingStatus: "Ready for Delivery",
          bmStatus: "Ready for Delivery",
        },
      });

      await tx.movementHistory.create({
        data: {
          trackingNumber: reg.trackingNumber,
          action: "Automatic Ready For Delivery Route",
          oldStatus: dm.currentStatus || "Document In Hand",
          newStatus: "Ready for Delivery",
          oldOffice: currentOfficeName || null,
          newOffice: currentOfficeName || null,
          performedBy: "SYSTEM_ROUTING_RECONCILIATION",
          remarks: "Reconciled to Ready For Delivery: Authoritative Main Process completed and delivery location matches receiving/current office.",
        },
      });

      if ((tx as any).documentWorkflowHistory) {
        await (tx as any).documentWorkflowHistory.create({
          data: {
            documentId: reg.id,
            trackingNumber: reg.trackingNumber,
            workflowStep: "Automatic Ready For Delivery Routing",
            status: "Ready for Delivery",
            performedBy: "SYSTEM_ROUTING_RECONCILIATION",
            remarks: "Routed to Ready For Delivery (Authoritative Main Process completed)",
            ownerAdminId: reg.ownerAdminId,
          },
        });
      }

      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "AUTO_ROUTED_TO_READY_FOR_DELIVERY",
          performedBy: "SYSTEM_ROUTING_RECONCILIATION",
          description: "Authoritative Main Process completed and delivery location matches current office. Routed to Ready For Delivery.",
        },
      });
    });

    correctedList.push({
      trackingNumber: reg.trackingNumber,
      deliveryLocation,
      currentOffice: currentOfficeName,
    });
  }

  console.log("\n==================================================");
  console.log(`RECONCILIATION COMPLETED: ${correctedList.length} documents moved to Ready For Delivery.`);
  console.log("Corrected documents:", correctedList);
  console.log("==================================================");
}

reconcileStuckDocuments()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
