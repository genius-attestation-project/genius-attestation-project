import { prisma } from "@/lib/prisma";

type ResolveOfficeLocationNameParams = {
  ownerAdminId: string;
  officeLocationId?: string;
  officeLocationName?: string;
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
