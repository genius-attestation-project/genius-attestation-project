import { prisma } from "../src/lib/prisma";
import { getProcessStats, listProcessAssignments, buildProcessWhereClause } from "../src/features/process/server/process.service";

async function main() {
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";

  console.log("=== CHECKING PROCESS MODULE FOR ALL OFFICES ===");

  const offices = await prisma.officeLocation.findMany({
    where: { ownerAdminId },
  });

  for (const off of offices) {
    console.log(`\n--- Office: ${off.officeName} (ID: ${off.id}, isProcessOffice: ${off.isProcessOffice}) ---`);
    const stats = await getProcessStats(ownerAdminId, off.officeName);
    console.log("Stats:", stats);

    const inboundWhere = buildProcessWhereClause(ownerAdminId, off.officeName, undefined, "inbound");
    console.log("Inbound whereClause:", JSON.stringify(inboundWhere, null, 2));

    const inboundMovements = await prisma.documentMovement.findMany({
      where: inboundWhere,
      include: {
        bundle: {
          include: { items: true, fromOffice: true, toOffice: true }
        }
      }
    });
    console.log(`Inbound movements count: ${inboundMovements.length}`);
    for (const m of inboundMovements) {
      console.log(`  - Movement ID: ${m.id}, trackingNumber: ${m.trackingNumber}, bundleNumber: ${m.bundle?.bundleNumber}, status: ${m.status}, currentModule: ${m.currentModule}, toOfficeId: ${m.toOfficeId}`);
    }

    const inboundList = await listProcessAssignments(ownerAdminId, off.officeName, undefined, "inbound");
    console.log(`Inbound listProcessAssignments count: ${inboundList.length}`);
    for (const item of inboundList) {
      console.log(`  - Item ID: ${item.id}, trackingNumber: ${item.trackingNumber}, bundleNumber: ${item.bundleNumber}, bundleCode: ${item.bundleCode}, items: ${item.items?.map((i: any) => i.trackingNumber).join(",")}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
