import { listRegistrations } from "../src/features/registration/server/registration.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const reg = await prisma.registration.findFirst();
    if (!reg) {
        console.log("No registrations found in db");
        return;
    }
    console.log("Testing with admin:", reg.ownerAdminId);
    const result = await listRegistrations(reg.ownerAdminId, { pageSize: 50 });
    console.log("Success! Items:", result.items.length);
  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
