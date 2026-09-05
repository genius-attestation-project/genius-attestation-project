import { prisma } from "../src/lib/prisma";

async function correctUnapprovedInHandDocs() {
  console.log("=================================================");
  console.log("INSPECTING & CORRECTING UNAPPROVED IN-HAND DOCUMENTS");
  console.log("=================================================\n");

  // Find all document movements in HOME / Document In Hand / Received / IN_HAND
  const movements = await prisma.documentMovement.findMany({
    where: {
      status: { in: ["HOME", "Document In Hand", "IN_HAND", "Received"] },
      currentStatus: { in: ["Document In Hand", "Pending Receive", "HOME", "IN_HAND"] },
    },
    include: {
      registration: {
        include: {
          movementApprovals: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          advancePaymentApprovals: {
            orderBy: { requestedAt: "desc" },
            take: 1,
          },
        },
      },
      fromOffice: true,
      currentOffice: true,
    },
  });

  console.log(`Found ${movements.length} total in-hand movements to evaluate.`);

  let correctedCount = 0;
  let validCount = 0;

  for (const mov of movements) {
    const reg = mov.registration;
    if (!reg) continue;

    // Check if this is a transferred / received document from another office or inbound bundle
    const isReceivedFromInbound = Boolean(
      mov.bundleId ||
      (mov.fromOfficeId && mov.currentOfficeId && mov.fromOfficeId !== mov.currentOfficeId) ||
      mov.receivedAt ||
      (mov.movementType && mov.movementType !== "INITIAL")
    );

    if (isReceivedFromInbound) {
      // Transferred documents are valid
      validCount++;
      continue;
    }

    // For initial registration at origin office:
    const advancePaid = Number(reg.advancePaid ?? 0);
    const hasApprovedAdvance = !isNaN(advancePaid) && advancePaid > 0 && reg.advancePaymentStatus === "Approved";
    const latestMovApproval = reg.movementApprovals?.[0];
    const hasApprovedMovement = Boolean(reg.movementApproved || latestMovApproval?.status === "Approved");

    const isValidInHand = hasApprovedAdvance || (advancePaid <= 0 && hasApprovedMovement);

    if (isValidInHand) {
      validCount++;
      continue;
    }

    // This document is in initial registration stage without required approval!
    console.log(`\nCorrecting unapproved initial registration:`);
    console.log(`  Tracking #: ${reg.trackingNumber} | Reg ID: ${reg.id}`);
    console.log(`  Advance Paid: ${reg.advancePaid} | Advance Payment Status: ${reg.advancePaymentStatus}`);
    console.log(`  Movement Approved: ${reg.movementApproved} | Latest Movement App Status: ${latestMovApproval?.status ?? "None"}`);
    console.log(`  Current Mov Status: ${mov.status} | Tracking Status: ${reg.trackingStatus}`);

    const hasPendingMovReq = latestMovApproval?.status === "Pending";
    const hasPendingAdvReq = reg.advancePaymentStatus === "Pending Approval";

    const targetTrackingStatus = hasPendingMovReq
      ? "Movement Approval Pending"
      : hasPendingAdvReq
      ? "Advance Payment Approval Pending"
      : "Registered";

    const targetMovStatus = "REGISTRATION";
    const targetMovCurrentStatus = targetTrackingStatus;

    await prisma.$transaction(async (tx) => {
      await tx.documentMovement.update({
        where: { id: mov.id },
        data: {
          status: targetMovStatus,
          currentModule: "REGISTRATION",
          currentStatus: targetMovCurrentStatus,
        },
      });

      await tx.registration.update({
        where: { id: reg.id },
        data: {
          trackingStatus: targetTrackingStatus,
          movementApproved: false,
          bmStatus: "Pending",
        },
      });

      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "Status Correction",
          performedBy: "System Maintenance",
          description: `Document movement status corrected to REGISTRATION (${targetTrackingStatus}) as required approval was not yet approved.`,
        },
      });
    });

    correctedCount++;
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${validCount} valid documents preserved, ${correctedCount} unapproved documents safely corrected.`);
  console.log("=================================================");
}

correctUnapprovedInHandDocs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
