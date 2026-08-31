import { PrismaClient } from "@prisma/client";
import { listRoles } from "../src/features/admin/server/rbac.service";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log("No user");
  const ownerAdminId = user.ownerAdminId || user.id;
  
  const roles = await listRoles(ownerAdminId);
  console.log(JSON.stringify(roles, null, 2));
}

main().finally(() => prisma.$disconnect());
