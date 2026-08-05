import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiPermission("ready_for_delivery.deliver");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("Unauthorized.", 401);

    const params = await context.params;
    const registrationId = params.id;

    const body = await request.json();
    const {
      deliveryType,
      deliveryUserId,
      courierCompanyId,
      courierTrackingNumber,
      proofFileId,
    } = body;

    if (!deliveryType || !["User", "Courier"].includes(deliveryType)) {
      return jsonError("Delivery type must be 'User' or 'Courier'.", 400);
    }

    if (deliveryType === "User" && !deliveryUserId) {
      return jsonError("User is required for User delivery type.", 400);
    }

    if (deliveryType === "Courier") {
      if (!courierCompanyId) {
        return jsonError("Courier company is required for Courier delivery type.", 400);
      }
      if (!courierTrackingNumber || !courierTrackingNumber.trim()) {
        return jsonError("Courier tracking number is required.", 400);
      }
    }

    const reg = await prisma.registration.findFirst({
      where: { id: registrationId, ownerAdminId },
      include: {
        documentMovements: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    if (!reg) {
      return jsonError("Registration not found.", 404);
    }

    // Lookup user name if User type
    let deliveryUserName: string | null = null;
    if (deliveryType === "User" && deliveryUserId) {
      const user = await prisma.user.findUnique({
        where: { id: deliveryUserId },
        select: { name: true, email: true },
      });
      deliveryUserName = user?.name || user?.email || null;
    }

    // Lookup courier company name if Courier type
    let courierCompanyName: string | null = null;
    if (deliveryType === "Courier" && courierCompanyId) {
      const company = await prisma.masterData.findUnique({
        where: { id: courierCompanyId },
        select: { name: true },
      });
      courierCompanyName = company?.name || null;
    }

    // Lookup proof file URL
    let deliveryProofFileUrl: string | null = null;
    let deliveryProofFileName: string | null = null;

    if (proofFileId) {
      const storage = await prisma.fileStorage.findUnique({
        where: { id: proofFileId },
      });
      if (storage) {
        deliveryProofFileUrl = `/api/files/${storage.id}/view`;
        deliveryProofFileName = storage.originalName;
      }
    }

    const balanceAmount = Number(reg.balanceAmount ?? 0);
    const performedByName = session.user?.name || session.user?.email || "System";

    // CASE 1: Balance Amount == 0 -> Immediate Delivered
    if (balanceAmount === 0) {
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          deliveryType,
          deliveryUserId: deliveryType === "User" ? deliveryUserId : null,
          deliveryUserName: deliveryType === "User" ? deliveryUserName : null,
          courierCompanyId: deliveryType === "Courier" ? courierCompanyId : null,
          courierCompanyName: deliveryType === "Courier" ? courierCompanyName : null,
          courierTrackingNumber: deliveryType === "Courier" ? courierTrackingNumber?.trim() : null,
          deliveryProofFileUrl,
          deliveryProofFileName,
          deliveryStatus: "Delivered",
          trackingStatus: "Delivered",
          bmStatus: "Delivered",
          auditTrail: {
            create: [
              {
                action: "DELIVERY_STARTED",
                performedBy: performedByName,
                description: `Delivery initiated via ${deliveryType}.`,
              },
              {
                action: "DELIVERED",
                performedBy: performedByName,
                description: `Document delivered via ${deliveryType} (${deliveryType === "User" ? deliveryUserName : courierCompanyName + " #" + courierTrackingNumber}). Balance is 0.`,
              },
            ],
          },
        },
      });

      await prisma.documentMovement.updateMany({
        where: { registrationId: reg.id },
        data: {
          status: "Delivered",
          currentStatus: "Delivered",
        },
      });

      await prisma.documentWorkflowHistory.create({
        data: {
          documentId: reg.id,
          trackingNumber: reg.trackingNumber,
          workflowStep: "Document Delivered",
          status: "Delivered",
          performedBy: performedByName,
          remarks: `Document marked Delivered via ${deliveryType} (${deliveryType === "User" ? deliveryUserName : courierCompanyName}).`,
          ownerAdminId,
        },
      });

      return jsonOk({
        success: true,
        isDelivered: true,
        message: "Document status updated to Delivered.",
      });
    }

    // CASE 2: Balance Amount > 0
    const hasAdvanceApproval = await prisma.advancePaymentApproval.findFirst({
      where: { registrationId: reg.id, ownerAdminId },
    });

    const isAlreadySubmitted = reg.advancePaymentSubmitted || Boolean(hasAdvanceApproval);

    if (isAlreadySubmitted) {
      // User already completed Advance popup once -> Reuse payment info, no advance popup again
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          deliveryType,
          deliveryUserId: deliveryType === "User" ? deliveryUserId : null,
          deliveryUserName: deliveryType === "User" ? deliveryUserName : null,
          courierCompanyId: deliveryType === "Courier" ? courierCompanyId : null,
          courierCompanyName: deliveryType === "Courier" ? courierCompanyName : null,
          courierTrackingNumber: deliveryType === "Courier" ? courierTrackingNumber?.trim() : null,
          deliveryProofFileUrl,
          deliveryProofFileName,
          deliveryStatus: "Pending Approval",
          trackingStatus: "Pending Approval",
          auditTrail: {
            create: {
              action: "DELIVERY_DETAILS_ADDED",
              performedBy: performedByName,
              description: `Delivery details saved via ${deliveryType}. Pending payment approval.`,
            },
          },
        },
      });

      return jsonOk({
        success: true,
        isDelivered: false,
        isPendingApproval: true,
        requiresAdvancePayment: false,
        message: "Delivery details saved. Document remains Pending Approval.",
      });
    }

    // Save delivery details on registration and signal frontend to open Advance popup
    await prisma.registration.update({
      where: { id: reg.id },
      data: {
        deliveryType,
        deliveryUserId: deliveryType === "User" ? deliveryUserId : null,
        deliveryUserName: deliveryType === "User" ? deliveryUserName : null,
        courierCompanyId: deliveryType === "Courier" ? courierCompanyId : null,
        courierCompanyName: deliveryType === "Courier" ? courierCompanyName : null,
        courierTrackingNumber: deliveryType === "Courier" ? courierTrackingNumber?.trim() : null,
        deliveryProofFileUrl,
        deliveryProofFileName,
        deliveryStatus: "Delivery Details Saved",
        auditTrail: {
          create: {
            action: "DELIVERY_STARTED",
            performedBy: performedByName,
            description: `Delivery initiated via ${deliveryType}. Advance payment required.`,
          },
        },
      },
    });

    return jsonOk({
      success: true,
      isDelivered: false,
      requiresAdvancePayment: true,
      message: "Delivery details saved. Please submit advance payment.",
    });
  } catch (error: any) {
    console.error("[POST /api/ready-for-delivery/[id]/deliver] Error:", error);
    return jsonError("Failed to save delivery details.", 500);
  }
}
