import { prisma } from "@/lib/prisma";

async function fixPendingAdvances() {
  console.log("Running fix for existing pending advance registrations...");
  
  // Find all registrations with advancePaymentStatus = 'Pending Approval'
  const pendingRegs = await prisma.registration.findMany({
    where: {
      advancePaymentStatus: "Pending Approval",
    },
    select: {
      id: true,
      trackingNumber: true,
      totalCharges: true,
      advancePaid: true,
      requestedAdvanceAmount: true,
      balanceAmount: true,
    },
  });

  console.log(`Found ${pendingRegs.length} registrations with advancePaymentStatus = 'Pending Approval'.`);

  for (const reg of pendingRegs) {
    const requested = Number(reg.requestedAdvanceAmount ?? 0) > 0 ? Number(reg.requestedAdvanceAmount) : Number(reg.advancePaid ?? 0);
    const total = Number(reg.totalCharges ?? 0);

    console.log(`Fixing Reg ${reg.trackingNumber}: Total ₹${total}, Requested Advance ₹${requested}, resetting Approved Advance to ₹0 and Balance to ₹${total}`);

    await prisma.registration.update({
      where: { id: reg.id },
      data: {
        requestedAdvanceAmount: requested,
        advancePaid: 0,
        balanceAmount: total,
      },
    });
  }

  console.log("Data fix complete!");
}

fixPendingAdvances()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
