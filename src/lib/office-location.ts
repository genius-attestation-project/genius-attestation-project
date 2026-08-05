import { prisma } from "@/lib/prisma";

type ResolveOfficeLocationNameParams = {
  ownerAdminId: string;
  officeLocationId?: string;
  officeLocationName?: string;
  userId?: string;
};

export async function resolveOfficeLocationName(params: ResolveOfficeLocationNameParams): Promise<string | null> {
  // 1. By officeLocationId
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

  // 4. Fallback: Default to primary process office or first office for this ownerAdmin
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
  // 1. By officeLocationId
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

  // 2. By officeLocationName
  if (params.officeLocationName?.trim()) {
    const officeNameTrimmed = params.officeLocationName.trim();
    const office = await prisma.officeLocation.findFirst({
      where: {
        officeName: { equals: officeNameTrimmed, mode: "insensitive" },
        ...(params.ownerAdminId ? { ownerAdminId: params.ownerAdminId } : {}),
      },
      select: { id: true },
    });
    if (office) return office.id;
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
          officeName: { equals: userOfficeName.trim(), mode: "insensitive" },
          ...(params.ownerAdminId ? { ownerAdminId: params.ownerAdminId } : {}),
        },
        select: { id: true },
      });
      if (office) return office.id;
    }
  }

  // 4. Fallback: Default to primary process office or first office for this ownerAdmin
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


