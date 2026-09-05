import { prisma } from "../src/lib/prisma";
import {
  resolveOfficeIdentifiers,
  listSubPackageItemsForOffice,
  getSubPackagesForProcessType,
  getAssignedOfficeWorkspaceStats,
  listWorkspaceDocuments,
} from "../src/features/assigned-office/server/assigned-office.service";

async function main() {
  console.log("=== 1. USERS & ROLES ===");
  const users = await prisma.user.findMany({
    where: { email: { in: ["mohamadnifras2004@gmail.com"] } },
    include: { role: true },
  });
  console.log("Users:", JSON.stringify(users, null, 2));

  console.log("=== 2. ASSIGNED OFFICE TABLE RECORDS ===");
  const assignedOffices = await (prisma as any).assignedOffice.findMany();
  console.log("AssignedOffices:", JSON.stringify(assignedOffices, null, 2));

  console.log("=== 3. OFFICE LOCATION TABLE RECORDS ===");
  const officeLocations = await prisma.officeLocation.findMany({
    where: { OR: [{ id: "cmtonzb7n00nfql0uachgncpt" }, { officeName: "AmGenius" }] },
  });
  console.log("OfficeLocations:", JSON.stringify(officeLocations, null, 2));

  console.log("=== 4. ASSIGNED OFFICE SUB PACKAGES TABLE ===");
  const officeSubPkgs = await (prisma as any).assignedOfficeSubPackage.findMany();
  console.log("AssignedOfficeSubPackages:", JSON.stringify(officeSubPkgs, null, 2));

  console.log("=== 5. SUB PACKAGES TABLE ===");
  const subPackages = await prisma.subPackage.findMany();
  console.log("SubPackages:", JSON.stringify(subPackages, null, 2));

  console.log("=== 6. RESOLVE OFFICE IDENTIFIERS TEST ===");
  const res1 = await resolveOfficeIdentifiers("cmtonzb7n00nfql0uachgncpt");
  console.log("Resolve by OfficeLocation ID (cmtonzb7n00nfql0uachgncpt):", res1);
  const res2 = await resolveOfficeIdentifiers("cmtd6lftq0000yl2ps48dbc0o");
  console.log("Resolve by AssignedOffice ID (cmtd6lftq0000yl2ps48dbc0o):", res2);
}

main().catch(console.error).finally(() => prisma.$disconnect());
