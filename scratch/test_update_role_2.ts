import { PrismaClient } from "@prisma/client";
import { updateRole } from "../src/features/admin/server/rbac.service";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const ownerAdminId = user!.ownerAdminId || user!.id;
  
  const role = await prisma.accessRole.findFirst({ where: { ownerAdminId } });
  
  const result = await updateRole(ownerAdminId, role!.id, {
    name: role!.name,
    description: role!.description || "",
    isActive: role!.isActive,
  });
  
  console.log("Updated role via updateRole:", JSON.stringify(result, null, 2));
}

main().finally(() => prisma.$disconnect());
