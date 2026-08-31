import { prisma } from "@/lib/prisma";

type ResolveOfficeLocationNameParams = {
  ownerAdminId: string;
  officeLocationId?: string;
  officeLocationName?: string;
  userId?: string;
};

export async function resolveOfficeLocationName(params: ResolveOfficeLocationNameParams): Promise<string | null> {
  // 1. Prioritize userId DB lookup if userId is provided (ensures real-time DB assignment over stale session values)
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

  // 2. Fallback to officeLocationId from params if userId lookup did not yield a result
  if (params.officeLocationId) {
    const office = await prisma.officeLocation.findFirst({
      where: {
        id: params.officeLocationId,
        ...(params.ownerAdminId ? { ownerAdminId: params.ownerAdminId } : {}),
      },
      select: { officeName: true },
    });

    if (office?.officeName?.trim()) {
      return office.officeName.trim();
    }
  }

  // 3. Fallback to officeLocationName from params
  if (params.officeLocationName?.trim()) {
    return params.officeLocationName.trim();
  }

  // 4. Default to primary process office or first office for this ownerAdmin
  if (params.ownerAdminId) {
    const defaultOffice = await prisma.officeLocation.findFirst({
      where: { ownerAdminId: params.ownerAdminId },
      select: { officeName: true },
      orderBy: { isProcessOffice: "desc" },
    });

    if (defaultOffice?.officeName?.trim()) {
      return defaultOffice.officeName.trim();
    }
  }

  return null;
}

export async function resolveOfficeLocationId(params: ResolveOfficeLocationNameParams): Promise<string | null> {
  // 1. Prioritize userId DB lookup if userId is provided (ensures real-time DB assignment over stale session values)
  if (params.userId) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        officeLocationId: true,
        officeLocationName: true,
        officeLocationRef: { select: { id: true, officeName: true } },
      },
    });

    if (user?.officeLocationId) {
      const office = await prisma.officeLocation.findFirst({
        where: { id: user.officeLocationId },
        select: { id: true },
      });
      if (office) return office.id;
    }

    if (user?.officeLocationRef?.id) {
      return user.officeLocationRef.id;
    }

    const userOfficeName = user?.officeLocationRef?.officeName || user?.officeLocationName;
    if (userOfficeName?.trim()) {
      const office = await prisma.officeLocation.findFirst({
        where: {
          officeName: userOfficeName.trim(),
          ...(params.ownerAdminId ? { ownerAdminId: params.ownerAdminId } : {}),
        },
        select: { id: true },
      });
      if (office) return office.id;
    }
  }

  // 2. Fallback to officeLocationId from params if userId lookup did not yield a result
  if (params.officeLocationId) {
    const office = await prisma.officeLocation.findFirst({
      where: {
        id: params.officeLocationId,
        ...(params.ownerAdminId ? { ownerAdminId: params.ownerAdminId } : {}),
      },
      select: { id: true },
    });
    if (office) return office.id;
  }

  // 3. Fallback to officeLocationName from params
  if (params.officeLocationName?.trim()) {
    const officeNameTrimmed = params.officeLocationName.trim();
    const office = await prisma.officeLocation.findFirst({
      where: {
        officeName: officeNameTrimmed,
        ...(params.ownerAdminId ? { ownerAdminId: params.ownerAdminId } : {}),
      },
      select: { id: true },
    });
    if (office) return office.id;
  }

  // 4. Default to primary process office or first office for this ownerAdmin
  if (params.ownerAdminId) {
    const defaultOffice = await prisma.officeLocation.findFirst({
      where: { ownerAdminId: params.ownerAdminId },
      select: { id: true },
      orderBy: { isProcessOffice: "desc" },
    });

    return defaultOffice?.id || null;
  }

  return null;
}
