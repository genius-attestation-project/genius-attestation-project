import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const denied = await requireApiPermission("branch_movement.viewTimeline");
  if (denied) return denied;

  try {
    const resolvedParams = await params;
    const { trackingNumber } = resolvedParams;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const registration = await prisma.registration.findFirst({
      where: { trackingNumber, ownerAdminId },
      include: {
        documentMovements: true,
      },
    });

    if (!registration) {
      return jsonError("Registration not found", 404);
    }

    const movements = await prisma.branchMovementRecord.findMany({
      where: { trackingNumber, ownerAdminId },
      orderBy: { createdAt: "desc" },
    });

    const currentMovement = registration.documentMovements[0];

    return jsonOk({
      registration: {
        trackingNumber: registration.trackingNumber,
        customerName: registration.customerName,
        service: registration.processType ?? registration.documentType ?? "-",
        status: registration.trackingStatus,
        updatedAt: registration.updatedAt,
      },
      currentLocation: currentMovement ? {
        officeId: currentMovement.currentOfficeId,
        status: currentMovement.status,
        receivedAt: currentMovement.acceptedAt,
        handledBy: currentMovement.acceptedBy,
        updatedAt: currentMovement.updatedAt,
      } : null,
      timeline: movements,
    });
  } catch (error) {
    console.error("[timeline_api_error]", error);
    return jsonError("Internal Server Error", 500);
  }
}
