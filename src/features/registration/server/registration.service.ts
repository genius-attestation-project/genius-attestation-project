import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { RegistrationInput } from "@/features/registration/validations/registration.schema";

const registrationInclude = {
  files: { orderBy: { uploadedAt: "desc" as const } },
  auditTrail: { orderBy: { createdAt: "desc" as const } },
};

type RegistrationRecord = Prisma.RegistrationGetPayload<{
  include: typeof registrationInclude;
}>;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function mapRegistration(registration: RegistrationRecord) {
  return {
    ...registration,
    totalCharges: Number(registration.totalCharges),
    advancePaid: Number(registration.advancePaid),
    balanceAmount: Number(registration.balanceAmount),
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
    createdDate: formatDate(registration.createdAt),
    files: registration.files.map((file) => ({
      ...file,
      uploadedAt: file.uploadedAt.toISOString(),
    })),
    auditTrail: registration.auditTrail.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

function buildRegistrationData(input: RegistrationInput) {
  const totalCharges = new Prisma.Decimal(input.totalCharges ?? 0);
  const advancePaid = new Prisma.Decimal(input.advancePaid ?? 0);
  const balanceAmount = totalCharges.minus(advancePaid);

  return {
    trackingNumber: input.trackingNumber,
    customerName: input.customerName,
    mobile: input.mobile,
    email: input.email || null,
    address: input.address || null,
    country: input.country || null,
    state: input.state || null,
    city: input.city || null,
    customerType: input.customerType || null,
    documentType: input.documentType || null,
    documentIssuedCountry: input.documentIssuedCountry || null,
    processType: input.processType || null,
    externalProcess: input.externalProcess || null,
    priority: input.priority || null,
    committedDuration: input.committedDuration || null,
    deliveryLocation: input.deliveryLocation || null,
    totalCharges,
    advancePaid,
    balanceAmount,
    paymentMode: input.paymentMode || null,
    paymentStatus: input.paymentStatus,
    approvalStatus: input.approvalStatus,
    trackingStatus: input.trackingStatus || "Registered",
  };
}

export async function listRegistrations(
  ownerAdminId: string,
  params: { query?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 10, 100));
  const query = params.query?.trim();
  const where: Prisma.RegistrationWhereInput = {
    ownerAdminId,
    ...(query
      ? {
          OR: [
            { trackingNumber: { contains: query, mode: "insensitive" } },
            { customerName: { contains: query, mode: "insensitive" } },
            { mobile: { contains: query, mode: "insensitive" } },
            { documentType: { contains: query, mode: "insensitive" } },
            { paymentStatus: { contains: query, mode: "insensitive" } },
            { approvalStatus: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, totalItems] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: registrationInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.registration.count({ where }),
  ]);

  return {
    items: items.map(mapRegistration),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
}

export async function getRegistrationById(ownerAdminId: string, id: string) {
  const registration = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    include: registrationInclude,
  });

  return registration ? mapRegistration(registration) : null;
}

export async function getRegistrationByTrackingNumber(ownerAdminId: string, trackingNumber: string) {
  const registration = await prisma.registration.findFirst({
    where: { ownerAdminId, trackingNumber },
    include: registrationInclude,
  });

  return registration ? mapRegistration(registration) : null;
}

export async function createRegistration(
  ownerAdminId: string,
  input: RegistrationInput,
  performedBy?: string,
) {
  const registration = await prisma.registration.create({
    data: {
      ...buildRegistrationData(input),
      ownerAdminId,
      createdBy: performedBy ?? null,
      auditTrail: {
        create: {
          action: "Registration created",
          description: `Registration ${input.trackingNumber} was created.`,
          performedBy: performedBy ?? null,
        },
      },
    },
    include: registrationInclude,
  });

  return mapRegistration(registration);
}

export async function updateRegistration(
  ownerAdminId: string,
  id: string,
  input: RegistrationInput,
  performedBy?: string,
) {
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true, paymentStatus: true, totalCharges: true, advancePaid: true },
  });

  if (!existing) return null;

  const paymentChanged =
    existing.paymentStatus !== input.paymentStatus ||
    Number(existing.totalCharges) !== Number(input.totalCharges) ||
    Number(existing.advancePaid) !== Number(input.advancePaid);

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      ...buildRegistrationData(input),
      auditTrail: {
        create: {
          action: paymentChanged ? "Payment updated" : "Registration updated",
          description: paymentChanged
            ? "Commercial or payment details were updated."
            : "Registration details were updated.",
          performedBy: performedBy ?? null,
        },
      },
    },
    include: registrationInclude,
  });

  return mapRegistration(registration);
}

export async function deleteRegistration(ownerAdminId: string, id: string, performedBy?: string) {
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true, trackingNumber: true },
  });

  if (!existing) return false;

  await prisma.auditTrail.create({
    data: {
      registrationId: existing.id,
      action: "Deleted",
      description: `Registration ${existing.trackingNumber} was deleted.`,
      performedBy: performedBy ?? null,
    },
  });
  await prisma.registration.delete({ where: { id: existing.id } });

  return true;
}

export async function addRegistrationFile(
  ownerAdminId: string,
  id: string,
  file: { fileName: string; fileUrl: string; fileType: string },
  performedBy?: string,
) {
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true },
  });

  if (!existing) return null;

  await prisma.registrationFile.create({
    data: {
      registrationId: existing.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
    },
  });

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      auditTrail: {
        create: {
          action: "Document uploaded",
          description: `${file.fileName} was uploaded.`,
          performedBy: performedBy ?? null,
        },
      },
    },
    include: registrationInclude,
  });

  return mapRegistration(registration);
}

export async function setRegistrationApproval(
  ownerAdminId: string,
  id: string,
  approvalStatus: "Approved" | "Rejected",
  performedBy?: string,
) {
  const existing = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true, trackingNumber: true },
  });

  if (!existing) return null;

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      approvalStatus,
      auditTrail: {
        create: {
          action: approvalStatus,
          description: `Registration ${existing.trackingNumber} was ${approvalStatus.toLowerCase()}.`,
          performedBy: performedBy ?? null,
        },
      },
    },
    include: registrationInclude,
  });

  return mapRegistration(registration);
}

export async function listRegistrationAuditTrail(ownerAdminId: string, id: string) {
  const registration = await prisma.registration.findFirst({
    where: { ownerAdminId, id },
    select: { id: true },
  });

  if (!registration) return null;

  return prisma.auditTrail.findMany({
    where: { registrationId: registration.id },
    orderBy: { createdAt: "desc" },
  });
}
