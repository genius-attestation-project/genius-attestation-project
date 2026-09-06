import { getOfficeVisibilityOptions } from "../src/features/admin/server/user-access.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "mohamadnifras2004@gmail.com" },
  });

  if (!user || !user.ownerAdminId) {
    console.log("User not found");
    return;
  }

  const res = await getOfficeVisibilityOptions(user.id, user.ownerAdminId, "process");
  console.log("getOfficeVisibilityOptions for module 'process':", JSON.stringify(res, null, 2));

  const resAll = await getOfficeVisibilityOptions(user.id, user.ownerAdminId, undefined);
  console.log("getOfficeVisibilityOptions for all:", JSON.stringify(resAll, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
