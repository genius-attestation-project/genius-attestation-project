import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionAccess, hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { verifyCoreSubProcessCompleted } from "@/features/process/server/core-subprocess-validation";

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

    // Mandatory Field Validations
    if (!deliveryType || !["User", "Courier"].includes(deliveryType)) {
      return jsonError("Please complete all mandatory delivery information before continuing.", 400);
    }

    if (deliveryType === "User" && !deliveryUserId) {
      return jsonError("Please complete all mandatory delivery information before continuing.", 400);
    }

    if (deliveryType === "Courier") {
      if (!courierCompanyId || !courierTrackingNumber || !courierTrackingNumber.trim()) {
        return jsonError("Please complete all mandatory delivery information before continuing.", 400);
      }
    }

    if (!proofFileId) {
      return jsonError("Please complete all mandatory delivery information before continuing.", 400);
    }

    const userAccess = await getSessionAccess(session.user.id);
    if (!userAccess) return jsonError("Unauthorized.", 401);

    const reg = await prisma.registration.findFirst({
      where: { id: registrationId, ownerAdminId },
      include: {
        documentMovements: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    if (!reg) {
      return jsonError("Registration not found.", 404);
    }

    const isSuperAdmin = userAccess.isSuperAdmin === true || userAccess.allowedOfficeNames === null;
    if (!isSuperAdmin) {
      const canAccessDeliveryLoc = reg.deliveryLocation && hasOfficeAccess(userAccess, reg.deliveryLocation);
      const canAccessRegion = reg.regionOfRegistration && hasOfficeAccess(userAccess, reg.regionOfRegistration);
      if (!canAccessDeliveryLoc && !canAccessRegion) {
        return jsonError("You do not have permission to deliver documents for this office location.", 403);
      }
    }

    // 1. CORE SUBPROCESS VALIDATION BEFORE READY FOR DELIVERY / DELIVERY
    const coreCheck = await verifyCoreSubProcessCompleted(reg.trackingNumber, ownerAdminId);
    if (!coreCheck.isCompleted) {
      return jsonError(
        coreCheck.message || "Cannot move this document to Ready For Delivery because the Core SubProcess has not been completed.",
        400
      );
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
    const storage = await prisma.fileStorage.findUnique({
      where: { id: proofFileId },
    });
    if (!storage) {
      return jsonError("Please complete all mandatory delivery information before continuing.", 400);
    }
    const deliveryProofFileUrl = `/api/files/${storage.id}/view`;
    const deliveryProofFileName = storage.originalName;

    const totalCharges = Number(reg.totalCharges ?? 0);
    const advancePaid = Number(reg.advancePaid ?? 0);
    const balanceAmount = Number(reg.balanceAmount ?? Math.max(0, totalCharges - advancePaid));
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

    // CASE 2: Balance Amount > 0 -> Stop delivery process, require remaining payment
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
            description: `Delivery initiated via ${deliveryType}. Remaining balance of ₹${balanceAmount.toLocaleString()} required before delivery.`,
          },
        },
      },
    });

    return jsonOk({
      success: true,
      isDelivered: false,
      requiresAdvancePayment: true,
      pendingBalance: balanceAmount,
      totalCharges,
      advancePaid,
      message: `Delivery details saved. Remaining balance of ₹${balanceAmount.toLocaleString()} is required to complete delivery.`,
    });
  } catch (error: any) {
    console.error("[POST /api/ready-for-delivery/[id]/deliver] Error:", error);
    return jsonError("Failed to save delivery details.", 500);
  }
}
