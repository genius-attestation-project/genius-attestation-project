import { prisma } from "../src/lib/prisma";
import { buildProcessWhereClause } from "../src/features/process/server/process.service";

async function main() {
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";
  const officeLocationName = "Malappuram";
  const tab = "inbound";

  const whereClause = buildProcessWhereClause(ownerAdminId, officeLocationName, undefined, tab);
  console.log("WHERE CLAUSE:", JSON.stringify(whereClause, null, 2));

  const results = await prisma.documentMovement.findMany({
    where: whereClause,
    include: {
      registration: true,
      fromOffice: true,
      toOffice: true,
    },
  });

  console.log(`Results count: ${results.length}`);
  for (const r of results) {
    console.log(`- ${r.trackingNumber}: status=${r.status}, currentModule=${r.currentModule}, toOffice=${r.toOffice?.officeName}, currentOfficeId=${r.currentOfficeId}`);
  }

  const mov6565 = await prisma.documentMovement.findFirst({
    where: { trackingNumber: "6565" },
    include: { registration: true, toOffice: true, currentOffice: true },
  });
  console.log("MOV 6565 directly:", JSON.stringify(mov6565, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
