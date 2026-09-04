import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Starting Movement Approval Data Migration ===");

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
        include: { currentOffice: true },
      },
    },
  });

  console.log(`Found ${zeroAdvanceRegs.length} zero/empty-advance registrations.`);

  let approvedCount = 0;
  let pendingCreatedCount = 0;
  let alreadyPendingCount = 0;

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

        if (isTransferredOrAdvanced) {
          if (!reg.movementApproved) {
            await prisma.registration.update({
              where: { id: reg.id },
              data: { movementApproved: true },
            });
            approvedCount++;
          }
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
            approvedCount++;
          }
          return;
        }

        if (latestApproval?.status === "Pending") {
          alreadyPendingCount++;
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

        const officeName =
          reg.documentMovements[0]?.currentOffice?.officeName || reg.regionOfRegistration || null;

        await prisma.movementApproval.create({
          data: {
            registrationId: reg.id,
            trackingNumber: reg.trackingNumber,
            customerName: reg.customerName || null,
            documentName: reg.documentName,
            registrationOffice: reg.regionOfRegistration,
            currentOffice: officeName,
            advanceAmount: reg.advancePaid ?? 0,
            status: "Pending",
            remarks: "Auto-migrated: Pending movement approval for zero-advance registration",
            requestedByName: "Migration Script",
            requestedDate: reg.createdAt,
            ownerAdminId: reg.ownerAdminId || "SYSTEM",
          },
        });

        await prisma.registration.update({
          where: { id: reg.id },
          data: {
            movementApproved: false,
            trackingStatus: "Movement Approval Pending",
          },
        });

        await prisma.documentMovement.updateMany({
          where: { registrationId: reg.id },
          data: {
            status: "REGISTRATION",
            currentStatus: "Movement Approval Pending",
          },
        });

        pendingCreatedCount++;
      })
    );

    console.log(`Processed ${Math.min(i + chunkSize, zeroAdvanceRegs.length)} / ${zeroAdvanceRegs.length} records...`);
  }

  console.log("=== Movement Approval Migration Completed ===");
  console.log(`- Legacy advanced/transferred registrations marked approved: ${approvedCount}`);
  console.log(`- Already pending registrations synced: ${alreadyPendingCount}`);
  console.log(`- New pending movement approval requests created: ${pendingCreatedCount}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
