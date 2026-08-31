import { prisma } from "@/lib/prisma";

export type CreateCorporateDetailInput = {
  companyName: string;
  contactPersonName: string;
  contactPersonMobile: string;
  email?: string;
  address?: string;
  agreementFileId?: string;
  isActive?: boolean;
};

export type UpdateCorporateDetailInput = Partial<CreateCorporateDetailInput> & {
  approvalStatus?: string;
  rejectionReason?: string;
};

export async function listCorporateDetails(
  ownerAdminId: string,
  options: {
    query?: string;
    approvalStatus?: string;
    activeOnly?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { query, approvalStatus, activeOnly, page = 1, pageSize = 50 } = options;
  const skip = (page - 1) * pageSize;

  const whereClause: any = { ownerAdminId, isArchived: false };
  if (activeOnly) whereClause.isActive = true;
  if (approvalStatus) whereClause.approvalStatus = approvalStatus;

  if (query) {
    whereClause.OR = [
      { companyName: { contains: query } },
      { contactPersonName: { contains: query } },
      { contactPersonMobile: { contains: query } },
      { email: { contains: query } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.corporateDetail.findMany({
      where: whereClause,
      include: {
        agreementFile: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.corporateDetail.count({ where: whereClause }),
  ]);

  const groupStats = await prisma.corporateDetail.groupBy({
    by: ["isActive"],
    where: { ownerAdminId, isArchived: false },
    _count: { id: true },
  });

  const activeCount = groupStats.find((s) => s.isActive)?._count.id || 0;
  const inactiveCount = groupStats.find((s) => !s.isActive)?._count.id || 0;

  return {
    items,
    total,
    activeCount,
    inactiveCount,
    page,
    pageSize,
  };
}

export async function getCorporateDetail(ownerAdminId: string, id: string) {
  return prisma.corporateDetail.findFirst({
    where: { id, ownerAdminId, isArchived: false },
    include: { agreementFile: true },
  });
}

export async function createCorporateDetail(
  ownerAdminId: string,
  input: CreateCorporateDetailInput,
  createdBy?: string
) {
  if (!input.companyName?.trim()) throw new Error("Company Name is required.");
  if (!input.contactPersonName?.trim()) throw new Error("Contact Person Name is required.");
  if (!input.contactPersonMobile?.trim()) throw new Error("Contact Person Mobile is required.");

  return prisma.corporateDetail.create({
    data: {
      companyName: input.companyName.trim(),
      contactPersonName: input.contactPersonName.trim(),
      contactPersonMobile: input.contactPersonMobile.trim(),
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      agreementFileId: input.agreementFileId || null,
      approvalStatus: "Pending Approval",
      isActive: input.isActive ?? true,
      createdBy: createdBy || null,
      ownerAdminId,
    },
    include: { agreementFile: true },
  });
}

export async function updateCorporateDetail(
  ownerAdminId: string,
  id: string,
  input: UpdateCorporateDetailInput,
  updatedBy?: string
) {
  const existing = await prisma.corporateDetail.findFirst({
    where: { id, ownerAdminId },
  });
  if (!existing) throw new Error("Corporate Detail record not found.");

  return prisma.corporateDetail.update({
    where: { id },
    data: {
      ...(input.companyName !== undefined && { companyName: input.companyName.trim() }),
      ...(input.contactPersonName !== undefined && { contactPersonName: input.contactPersonName.trim() }),
      ...(input.contactPersonMobile !== undefined && { contactPersonMobile: input.contactPersonMobile.trim() }),
      ...(input.email !== undefined && { email: input.email?.trim() || null }),
      ...(input.address !== undefined && { address: input.address?.trim() || null }),
      ...(input.agreementFileId !== undefined && { agreementFileId: input.agreementFileId || null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.approvalStatus !== undefined && { approvalStatus: input.approvalStatus }),
      ...(input.rejectionReason !== undefined && { rejectionReason: input.rejectionReason }),
      updatedBy: updatedBy || null,
    },
    include: { agreementFile: true },
  });
}

export async function deleteCorporateDetail(ownerAdminId: string, id: string) {
  const existing = await prisma.corporateDetail.findFirst({
    where: { id, ownerAdminId },
  });
  if (!existing) throw new Error("Corporate Detail record not found.");

  return prisma.corporateDetail.update({
    where: { id },
    data: { isArchived: true },
  });
}

export async function approveCorporateDetail(
  ownerAdminId: string,
  id: string,
  approvedBy: string,
  updates?: UpdateCorporateDetailInput
) {
  const existing = await prisma.corporateDetail.findFirst({
    where: { id, ownerAdminId },
  });
  if (!existing) throw new Error("Corporate Detail record not found.");

  return prisma.corporateDetail.update({
    where: { id },
    data: {
      ...(updates?.companyName && { companyName: updates.companyName.trim() }),
      ...(updates?.contactPersonName && { contactPersonName: updates.contactPersonName.trim() }),
      ...(updates?.contactPersonMobile && { contactPersonMobile: updates.contactPersonMobile.trim() }),
      ...(updates?.email !== undefined && { email: updates.email?.trim() || null }),
      ...(updates?.address !== undefined && { address: updates.address?.trim() || null }),
      ...(updates?.agreementFileId !== undefined && { agreementFileId: updates.agreementFileId || null }),
      approvalStatus: "Approved",
      approvedBy,
      approvedAt: new Date(),
    },
    include: { agreementFile: true },
  });
}

export async function rejectCorporateDetail(
  ownerAdminId: string,
  id: string,
  rejectedBy: string,
  rejectionReason?: string
) {
  const existing = await prisma.corporateDetail.findFirst({
    where: { id, ownerAdminId },
  });
  if (!existing) throw new Error("Corporate Detail record not found.");

  return prisma.corporateDetail.update({
    where: { id },
    data: {
      approvalStatus: "Rejected",
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason?.trim() || null,
    },
    include: { agreementFile: true },
  });
}
