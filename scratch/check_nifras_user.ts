import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "mohamadnifras2004@gmail.com" },
    include: {
      role: true,
      officeLocationRef: true,
      officeVisibilities: {
        include: {
          officeLocation: true,
        }
      }
    }
  });
  console.log("User:", {
    id: user?.id,
    name: user?.name,
    email: user?.email,
    role: user?.role?.name,
    isSuperAdmin: (user?.role as any)?.isSuperAdmin ?? (user as any)?.isSuperAdmin,
    officeLocationId: user?.officeLocationId,
    officeLocationName: user?.officeLocationName,
    officeLocationRef: user?.officeLocationRef,
    officeVisibilities: user?.officeVisibilities,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
