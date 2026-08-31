import { prisma } from "../src/lib/prisma";
import { normalizeOfficeName } from "../src/utils/format";

async function main() {
  console.log("[Migration] Starting Assigned Office name normalization...");

  // Query all AssignedOffice records directly from assigned_offices DB table
  const assignedOffices = await (prisma as any).assignedOffice.findMany();
  console.log(`[Migration] Found ${assignedOffices.length} Assigned Office record(s).`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const office of assignedOffices) {
    const originalName = office.username;
    const normalizedName = normalizeOfficeName(originalName);

    if (normalizedName && normalizedName !== originalName) {
      console.log(`[Migration] Updating Assigned Office ID ${office.id}: '${originalName}' -> '${normalizedName}'`);

      // Update assigned_offices table
      await (prisma as any).assignedOffice.update({
        where: { id: office.id },
        data: { username: normalizedName },
      });

      // Update matching office_locations table record while keeping office ID unchanged
      await prisma.officeLocation.updateMany({
        where: {
          OR: [
            { id: office.id },
            { officeName: originalName, ownerAdminId: office.ownerAdminId },
          ],
        },
        data: { officeName: normalizedName },
      });

      updatedCount++;
    } else {
      console.log(`[Migration] Skipping Assigned Office ID ${office.id}: '${originalName}' (already normalized)`);
      skippedCount++;
    }
  }

  console.log(`[Migration] Complete. Updated: ${updatedCount}, Unchanged: ${skippedCount}.`);
}

main()
  .catch((e) => {
    console.error("[Migration] Error running migration:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
