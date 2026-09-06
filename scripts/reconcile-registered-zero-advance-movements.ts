import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Starting Reconciliation of Registered Zero-Advance Documents ===");

  // 1. Fetch all registered documents with zero/null advance
  const registeredDocs = await prisma.registration.findMany({
    where: {
      trackingStatus: { in: ["Registered", "REGISTERED"] },
      advancePaid: { lte: 0 },
    },
    include: {
      movementApprovals: true,
      documentMovements: true,
    },
  });

  console.log(`Found ${registeredDocs.length} Registered documents with advancePaid <= 0.`);

  let reconciledCount = 0;
  let fakeApprovalsDeleted = 0;
  let alreadyCleanCount = 0;

  const chunkSize = 50;
  for (let i = 0; i < registeredDocs.length; i += chunkSize) {
    const chunk = registeredDocs.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (doc) => {
        // Find dummy/fake approved movement approvals that were auto-created
        const fakeApproved = doc.movementApprovals.filter(
          (m) => m.status === "Approved" && (m.remarks === "Movement approved" || !m.approvalRemarks)
        );

        const hasFakeApproved = fakeApproved.length > 0;
        const needsReset = doc.movementApproved || hasFakeApproved;

        if (!needsReset) {
          alreadyCleanCount++;
          return;
        }

        // 1. Delete fake movement approval records
        if (fakeApproved.length > 0) {
          const deleteResult = await prisma.movementApproval.deleteMany({
            where: {
              id: { in: fakeApproved.map((f) => f.id) },
            },
          });
          fakeApprovalsDeleted += deleteResult.count;
        }

        // 2. Reset registration movementApproved to false and ensure trackingStatus is "Registered"
        await prisma.registration.update({
          where: { id: doc.id },
          data: {
            movementApproved: false,
            trackingStatus: "Registered",
          },
        });

        // 3. Reset document movements to REGISTRATION module
        await prisma.documentMovement.updateMany({
          where: { registrationId: doc.id },
          data: {
            status: "REGISTRATION",
            currentModule: "REGISTRATION",
            currentStatus: "Registered",
          },
        });

        // 4. Create audit trail record
        await prisma.auditTrail.create({
          data: {
            registrationId: doc.id,
            action: "RECONCILED_MOVEMENT_APPROVAL_RESET",
            performedBy: "Data Reconciliation Script",
            description: "Reset movement approval to unapproved state for Registered zero-advance document to enable Movement Request workflow.",
          },
        });

        reconciledCount++;
      })
    );

    console.log(`Processed ${Math.min(i + chunkSize, registeredDocs.length)} / ${registeredDocs.length} records...`);
  }

  console.log("\n=== Reconciliation Summary ===");
  console.log(`- Total Registered zero-advance docs scanned: ${registeredDocs.length}`);
  console.log(`- Documents reconciled and reset: ${reconciledCount}`);
  console.log(`- Fake movement approval records deleted: ${fakeApprovalsDeleted}`);
  console.log(`- Already clean documents: ${alreadyCleanCount}`);

  // Verification checks:
  const remainingApprovedRegistered = await prisma.registration.count({
    where: {
      trackingStatus: { in: ["Registered", "REGISTERED"] },
      advancePaid: { lte: 0 },
      movementApproved: true,
    },
  });
  console.log(`- Remaining Registered zero-advance docs with movementApproved=true: ${remainingApprovedRegistered} (Expected: 0)`);

  const unapprovedZeroAdvanceInHome = await prisma.registration.count({
    where: {
      advancePaid: { lte: 0 },
      movementApproved: false,
      trackingStatus: "Registered",
      documentMovements: {
        some: {
          currentModule: "HOME",
        },
      },
    },
  });
  console.log(`- Unapproved zero-advance docs in Home module: ${unapprovedZeroAdvanceInHome} (Expected: 0)`);
}

main()
  .catch((e) => {
    console.error("Reconciliation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
