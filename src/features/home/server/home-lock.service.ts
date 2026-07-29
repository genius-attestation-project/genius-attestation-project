import { prisma } from "@/lib/prisma";

export async function requestHomeExtension(params: {
  registrationId: string;
  ownerAdminId: string;
  reason: string;
  requestedByUserId: string;
}) {
  const existing = await prisma.registration.findFirst({
    where: { id: params.registrationId, ownerAdminId: params.ownerAdminId },
    select: { id: true, trackingNumber: true, isBmLocked: true },
  });

  if (!existing) {
    throw new Error("Registration not found");
  }

  if (!existing.isBmLocked) {
    throw new Error("This registration is not locked, so an extension is not required.");
  }

  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.update({
      where: { id: existing.id },
      data: {
        bmExtensionStatus: "Pending",
        bmExtensionReason: params.reason,
        bmExtensionRequestedBy: params.requestedByUserId,
        bmExtensionRequestedAt: new Date(),
      },
    });

    await tx.auditTrail.create({
      data: {
        registrationId: existing.id,
        action: "Home Extension Requested",
        description: `Requested extension with reason: ${params.reason}`,
        performedBy: params.requestedByUserId,
      },
    });

    return registration;
  });
}

export async function approveHomeExtension(params: {
  registrationId: string;
  ownerAdminId: string;
  approvedByUserId: string;
}) {
  const existing = await prisma.registration.findFirst({
    where: { id: params.registrationId, ownerAdminId: params.ownerAdminId },
    select: { id: true, trackingNumber: true },
  });

  if (!existing) {
    throw new Error("Registration not found");
  }

  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.update({
      where: { id: existing.id },
      data: {
        isBmLocked: false,
        bmLockReason: null,
        bmExtensionStatus: "Approved",
        bmExtensionApprovedBy: params.approvedByUserId,
        bmExtensionApprovedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.auditTrail.create({
      data: {
        registrationId: existing.id,
        action: "Home Extension Approved",
        description: `Extension approved. The record is now unlocked.`,
        performedBy: params.approvedByUserId,
      },
    });

    return registration;
  });
}

export async function rejectHomeExtension(params: {
  registrationId: string;
  ownerAdminId: string;
  rejectedByUserId: string;
}) {
  const existing = await prisma.registration.findFirst({
    where: { id: params.registrationId, ownerAdminId: params.ownerAdminId },
    select: { id: true, trackingNumber: true },
  });

  if (!existing) {
    throw new Error("Registration not found");
  }

  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.update({
      where: { id: existing.id },
      data: {
        bmExtensionStatus: "Rejected",
        bmExtensionApprovedBy: params.rejectedByUserId,
        bmExtensionApprovedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.auditTrail.create({
      data: {
        registrationId: existing.id,
        action: "Home Extension Rejected",
        description: `Extension request was rejected. The record remains locked.`,
        performedBy: params.rejectedByUserId,
      },
    });

    return registration;
  });
}
