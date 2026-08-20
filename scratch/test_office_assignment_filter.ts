import { prisma } from "../src/lib/prisma";
import { getAvailableOfficesGroupedByCountry } from "../src/features/account-menu/server/account-menu.service";

async function main() {
  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161";

  const groups = await getAvailableOfficesGroupedByCountry(ownerAdminId);

  console.log("=== GROUPS RETURNED FOR OFFICE ASSIGNMENT ===");
  console.dir(groups, { depth: null });

  const hasExternal = groups.some((g) => g.country === "External Processing Office");
  console.log(`\nExternal Processing Office group present: ${hasExternal ? "FAIL ❌" : "NO (PASS ✅)"}`);

  const indiaGroup = groups.find((g) => g.country.toLowerCase() === "india");
  if (indiaGroup) {
    console.log("\nIndia offices in group:");
    console.log(indiaGroup.offices.map((o) => o.name));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
