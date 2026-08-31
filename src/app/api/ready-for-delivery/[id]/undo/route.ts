import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiPermission("ready_for_delivery.undo");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("Unauthorized.", 401);

    const params = await context.params;
    const registrationId = params.id;

    const reg = await prisma.registration.findFirst({
      where: { id: registrationId, ownerAdminId },
    });

    if (!reg) {
      return jsonError("Registration not found.", 404);
    }

    const performedByName = session.user?.name || session.user?.email || "System";

    // Undo delivery: Remove delivery details, restore Deliver button and status
    await prisma.registration.update({
      where: { id: reg.id },
      data: {
        deliveryType: null,
        deliveryUserId: null,
        deliveryUserName: null,
        courierCompanyId: null,
        courierCompanyName: null,
        courierTrackingNumber: null,
        deliveryProofFileUrl: null,
        deliveryProofFileName: null,
        deliveryStatus: null,
        trackingStatus: "Ready for Delivery",
        bmStatus: "Ready for Delivery",
        auditTrail: {
          create: {
            action: "UNDO_DELIVERY",
            performedBy: performedByName,
            description: "Delivery details undone. Deliver button restored.",
          },
        },
      },
    });

    await prisma.documentWorkflowHistory.create({
      data: {
        documentId: reg.id,
        trackingNumber: reg.trackingNumber,
        workflowStep: "Undo Delivery",
        status: "Ready for Delivery",
        performedBy: performedByName,
        remarks: "Delivery details undone by user.",
        ownerAdminId,
      },
    });

    return jsonOk({
      success: true,
      message: "Delivery details undone. Document returned to Ready For Delivery.",
    });
  } catch (error: any) {
    console.error("[POST /api/ready-for-delivery/[id]/undo] Error:", error);
    return jsonError("Failed to undo delivery details.", 500);
  }
}
