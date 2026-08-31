import { prisma } from "./src/lib/prisma";

async function resolveOfficeLocationName(params: {
  ownerAdminId: string;
  officeLocationId?: string;
  officeLocationName?: string;
  userId?: string;
}) {
  // 1. By officeLocationId
  if (params.officeLocationId) {
    const office = await prisma.officeLocation.findFirst({
      where: { id: params.officeLocationId },
      select: { officeName: true },
    });
    if (office?.officeName?.trim()) {
      return office.officeName.trim();
    }
  }

  // 2. By officeLocationName
  if (params.officeLocationName?.trim()) {
    return params.officeLocationName.trim();
  }

  // 3. By userId DB lookup
  if (params.userId) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        officeLocationId: true,
        officeLocationName: true,
        officeLocationRef: { select: { id: true, officeName: true } },
      },
    });

    if (user?.officeLocationRef?.officeName?.trim()) {
      return user.officeLocationRef.officeName.trim();
    }
    if (user?.officeLocationName?.trim()) {
      return user.officeLocationName.trim();
    }
    if (user?.officeLocationId) {
      const office = await prisma.officeLocation.findFirst({
        where: { id: user.officeLocationId },
        select: { officeName: true },
      });
      if (office?.officeName?.trim()) {
        return office.officeName.trim();
      }
    }
  }

  // 4. Fallback
  if (params.ownerAdminId) {
    const defaultOffice = await prisma.officeLocation.findFirst({
      where: { ownerAdminId: params.ownerAdminId },
      select: { officeName: true },
      orderBy: { isProcessOffice: "desc" },
    });
    return defaultOffice?.officeName?.trim() || null;
  }

  return null;
}

async function test() {
  const user = await prisma.user.findFirst({
    where: { email: "testuse.dev@gmail.com" },
  });

  if (!user) {
    console.log("Test Dev user not found!");
    return;
  }

  // Test 1: With all params
  console.log("Test 1 (full params):", await resolveOfficeLocationName({
    ownerAdminId: user.ownerAdminId ?? "",
    officeLocationId: user.officeLocationId ?? undefined,
    officeLocationName: user.officeLocationName ?? undefined,
    userId: user.id,
  }));

  // Test 2: With only userId and ownerAdminId (simulating empty session location params)
  console.log("Test 2 (userId fallback):", await resolveOfficeLocationName({
    ownerAdminId: user.ownerAdminId ?? "",
    officeLocationId: undefined,
    officeLocationName: undefined,
    userId: user.id,
  }));
}

test().catch(console.error).finally(() => prisma.$disconnect());
