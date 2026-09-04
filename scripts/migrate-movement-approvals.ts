import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Starting Movement Approval Data Migration & Cleanup ===");

  // 1. Delete all fake / auto-generated pending movement approval records
  const deletedPending = await prisma.movementApproval.deleteMany({
    where: {
      status: "Pending",
      OR: [
        { requestedByName: "Migration Script" },
        { remarks: { contains: "Auto-migrated" } },
        { remarks: "Movement approval required for zero-advance registration" },
        { remarks: "Movement approval required before transfer" },
      ],
    },
  });

  console.log(`- Cleaned up ${deletedPending.count} auto-generated pending movement approval records.`);

  // 2. Fetch all zero-advance registrations
  const zeroAdvanceRegs = await prisma.registration.findMany({
    where: {
      advancePaid: { lte: 0 },
    },
    include: {
      movementApprovals: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      documentMovements: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  console.log(`Found ${zeroAdvanceRegs.length} zero/empty-advance registrations to reconcile.`);

  let approvedPreservedCount = 0;
  let validPendingPreservedCount = 0;
  let unrequestedResetCount = 0;

  const chunkSize = 50;
  for (let i = 0; i < zeroAdvanceRegs.length; i += chunkSize) {
    const chunk = zeroAdvanceRegs.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (reg) => {
        const latestApproval = reg.movementApprovals[0];
        const isTransferredOrAdvanced = [
          "In Transfer",
          "Transferred",
          "INBOUND_PENDING",
          "In Transit",
          "Ready for Delivery",
          "Delivered",
          "Completed",
        ].includes(reg.trackingStatus);

        // Case 3: Already transferred or approved records
        if (isTransferredOrAdvanced) {
          if (!reg.movementApproved) {
            await prisma.registration.update({
              where: { id: reg.id },
              data: { movementApproved: true },
            });
          }
          approvedPreservedCount++;
          return;
        }

        if (latestApproval?.status === "Approved") {
          if (!reg.movementApproved) {
            await prisma.registration.update({
              where: { id: reg.id },
              data: {
                movementApproved: true,
                trackingStatus: "Document In Hand",
              },
            });
          }
          approvedPreservedCount++;
          return;
        }

        // Case 2: Valid user-submitted pending request
        if (latestApproval?.status === "Pending") {
          validPendingPreservedCount++;
          if (reg.trackingStatus !== "Movement Approval Pending" || reg.movementApproved !== false) {
            await prisma.registration.update({
              where: { id: reg.id },
              data: {
                movementApproved: false,
                trackingStatus: "Movement Approval Pending",
              },
            });
          }
          return;
        }

        // Case 1: Unrequested zero-advance registrations (NOT_REQUESTED)
        // Reset tracking status to "Registered" and ensure movementApproved = false
        if (reg.trackingStatus === "Movement Approval Pending" || reg.movementApproved !== false) {
          await prisma.registration.update({
            where: { id: reg.id },
            data: {
              movementApproved: false,
              trackingStatus: "Registered",
            },
          });

          await prisma.documentMovement.updateMany({
            where: { registrationId: reg.id },
            data: {
              status: "REGISTRATION",
              currentStatus: "Registered",
            },
          });
        }
        unrequestedResetCount++;
      })
    );

    console.log(`Processed ${Math.min(i + chunkSize, zeroAdvanceRegs.length)} / ${zeroAdvanceRegs.length} records...`);
  }

  console.log("=== Movement Approval Migration & Cleanup Completed ===");
  console.log(`- Approved records preserved: ${approvedPreservedCount}`);
  console.log(`- Valid user-submitted pending requests preserved: ${validPendingPreservedCount}`);
  console.log(`- Unrequested zero-advance documents reset to Registered: ${unrequestedResetCount}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
