import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== INSPECTING USER SHAMSEENA ===");
  const user = await prisma.user.findFirst({
    where: { email: "shamseena@geniusgroup.ae" },
    include: {
      role: true,
      officeLocationRef: true,
      officeVisibilities: {
        include: {
          officeLocation: true,
        },
      },
    },
  });

  console.log("User details:", {
    id: user?.id,
    name: user?.name,
    email: user?.email,
    ownerAdminId: user?.ownerAdminId,
    role: user?.role?.name,
    officeLocationId: user?.officeLocationId,
    officeLocationName: user?.officeLocationName,
    officeVisibilities: user?.officeVisibilities?.map((v: any) => ({
      module: v.module,
      officeId: v.officeLocationId,
      officeName: v.officeLocation?.officeName,
      allowAll: v.allowAll,
    })),
  });

  const ownerAdminId = user?.ownerAdminId;
  if (!ownerAdminId) {
    console.log("No ownerAdminId found!");
    return;
  }

  console.log("\n=== OFFICES IN WORKSPACE ===");
  const offices = await prisma.officeLocation.findMany({
    where: { ownerAdminId },
  });
  console.log(offices.map((o) => ({ id: o.id, name: o.officeName, location: o.location })));

  console.log("\n=== INSPECTING DOCUMENTS 4409900 & 4557847 ===");
  const docs = await prisma.registration.findMany({
    where: {
      trackingNumber: { in: ["4409900", "4557847", "61763", "61756", "61755", "62148"] },
    },
    include: {
      documentMovements: {
        include: {
          fromOffice: true,
          toOffice: true,
          currentOffice: true,
          bundle: true,
        },
        orderBy: { createdAt: "desc" },
      },
      movementApprovals: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  for (const d of docs) {
    console.log(`\nDoc [${d.trackingNumber}]:`, {
      customerName: d.customerName,
      regionOfRegistration: d.regionOfRegistration,
      deliveryLocation: d.deliveryLocation,
      trackingStatus: d.trackingStatus,
      bmStatus: d.bmStatus,
      advancePaid: d.advancePaid,
      advancePaymentStatus: d.advancePaymentStatus,
      advancePaymentSubmitted: d.advancePaymentSubmitted,
      movementApproved: d.movementApproved,
      movementsCount: d.documentMovements.length,
      latestMovement: d.documentMovements[0] ? {
        fromModule: d.documentMovements[0].fromModule,
        toModule: d.documentMovements[0].toModule,
        currentModule: d.documentMovements[0].currentModule,
        status: d.documentMovements[0].status,
        currentStatus: d.documentMovements[0].currentStatus,
        fromOffice: d.documentMovements[0].fromOffice?.officeName,
        toOffice: d.documentMovements[0].toOffice?.officeName,
        currentOffice: d.documentMovements[0].currentOffice?.officeName,
        currentOfficeId: d.documentMovements[0].currentOfficeId,
        bundleId: d.documentMovements[0].bundleId,
        bundleNumber: d.documentMovements[0].bundle?.bundleNumber,
      } : null,
      latestApproval: d.movementApprovals[0] ? {
        status: d.movementApprovals[0].status,
        reason: d.movementApprovals[0].reason,
      } : null,
    });
  }

  console.log("\n=== ALL REGISTRATIONS IN WORKSPACE WITH TRACKING STATUS ===");
  const allRegs = await prisma.registration.findMany({
    where: { ownerAdminId },
    select: {
      trackingNumber: true,
      regionOfRegistration: true,
      deliveryLocation: true,
      trackingStatus: true,
      advancePaid: true,
      advancePaymentStatus: true,
      movementApproved: true,
      documentMovements: {
        select: {
          status: true,
          currentStatus: true,
          currentModule: true,
          currentOfficeId: true,
          currentOffice: { select: { officeName: true } },
          bundleId: true,
          fromOfficeId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  console.log(`Total registrations in workspace: ${allRegs.length}`);
  const statusCounts: Record<string, number> = {};
  for (const r of allRegs) {
    statusCounts[r.trackingStatus] = (statusCounts[r.trackingStatus] || 0) + 1;
  }
  console.log("Tracking status distribution:", statusCounts);

  console.log("\nSample registrations:");
  for (const r of allRegs.slice(0, 15)) {
    console.log(`- ${r.trackingNumber}: region=${r.regionOfRegistration}, status=${r.trackingStatus}, adv=${r.advancePaid} (${r.advancePaymentStatus}), movApproved=${r.movementApproved}, currentOffice=${r.documentMovements[0]?.currentOffice?.officeName || "none"}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
