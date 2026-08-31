import { PrismaClient } from "@prisma/client";
import { setRolePermissions } from "../src/features/admin/server/rbac.service";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const ownerAdminId = user!.ownerAdminId || user!.id;
  
  const role = await prisma.accessRole.findFirst({ where: { ownerAdminId } });
  console.log("Updating role", role!.name, role!.id);
  
  const updated = await setRolePermissions(ownerAdminId, role!.id, ["dashboard.view", "menu.dashboard"]);
  
  console.log("Updated role permissions:", updated?.permissions, updated?.menuPermissions);
  
  const check = await prisma.accessRole.findUnique({
    where: { id: role!.id },
    include: { rolePermissions: { include: { permission: true } } }
  });
  console.log("Check DB:", check?.rolePermissions.map(rp => rp.permission.code));
}

main().finally(() => prisma.$disconnect());
