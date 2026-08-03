import { prisma } from "@/lib/prisma";

type ResolveOfficeLocationNameParams = {
  ownerAdminId: string;
  officeLocationId?: string;
  officeLocationName?: string;
  userId?: string;
};

export async function resolveOfficeLocationName(params: ResolveOfficeLocationNameParams) {
  if (params.officeLocationId) {
    const office = await prisma.officeLocation.findFirst({
      where: {
        id: params.officeLocationId,
        ownerAdminId: params.ownerAdminId,
      },
      select: { officeName: true },
    });

    if (office?.officeName?.trim()) {
      return office.officeName.trim();
    }
  }

  return params.officeLocationName?.trim() || null;
}

export async function resolveOfficeLocationId(params: ResolveOfficeLocationNameParams) {
  if (params.officeLocationId) {
    const office = await prisma.officeLocation.findFirst({
      where: {
        id: params.officeLocationId,
        ownerAdminId: params.ownerAdminId,
      },
      select: { id: true },
    });
    if (office) return office.id;
  }

  if (params.officeLocationName?.trim()) {
    const officeNameTrimmed = params.officeLocationName.trim();
    const office = await prisma.officeLocation.findFirst({
      where: {
        officeName: { equals: officeNameTrimmed, mode: "insensitive" },
        ownerAdminId: params.ownerAdminId,
      },
      select: { id: true },
    });
    if (office) return office.id;
  }

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
        where: {
          id: user.officeLocationId,
          ownerAdminId: params.ownerAdminId,
        },
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
          ownerAdminId: params.ownerAdminId,
        },
        select: { id: true },
      });
      if (office) return office.id;
    }
  }

  // Fallback: Default to primary process office or first office for this ownerAdmin
  const defaultOffice = await prisma.officeLocation.findFirst({
    where: { ownerAdminId: params.ownerAdminId },
    select: { id: true },
    orderBy: { isProcessOffice: "desc" },
  });

  return defaultOffice?.id || null;
}

