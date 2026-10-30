import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";
import { getSessionAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return jsonError("Unauthorized", 401);
    }

    const access = await getSessionAccess(session.user.id);
    const canCheck =
      Boolean(access?.isSuperAdmin) ||
      hasPermission(access, "revenue_registration.view") ||
      hasPermission(access, "revenue_registration.edit") ||
      hasPermission(access, "revenue_registration.create_request") ||
      hasPermission(access, "edit.create_request") ||
      hasPermission(access, "search_report.search");

    if (!canCheck) {
      return jsonError("You do not have permission to perform this action.", 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const trackingNumber = (searchParams.get("trackingNumber") || "").trim();
    const excludeId = (searchParams.get("excludeId") || "").trim();

    if (!trackingNumber) {
      return jsonError("Tracking number is required.", 400);
    }

    // 1. Check in Registration
    const registration = await prisma.registration.findFirst({
      where: {
        ownerAdminId,
        trackingNumber,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: {
        id: true,
        trackingNumber: true,
        customerName: true,
        documentType: true,
        documentName: true,
        regionOfRegistration: true,
        trackingStatus: true,
      },
    });

    if (registration) {
      return jsonOk({
        exists: true,
        registration,
      });
    }

    // 2. Check in DocumentMovement if not found in Registration
    const mov = await prisma.documentMovement.findFirst({
      where: {
        trackingNumber,
        ...(excludeId ? { NOT: { registrationId: excludeId } } : {}),
      },
      select: {
        registrationId: true,
        trackingNumber: true,
      },
    });

    if (mov && mov.registrationId) {
      const regFromMov = await prisma.registration.findFirst({
        where: {
          ownerAdminId,
          id: mov.registrationId,
        },
        select: {
          id: true,
          trackingNumber: true,
          customerName: true,
          documentType: true,
          documentName: true,
          regionOfRegistration: true,
          trackingStatus: true,
        },
      });

      if (regFromMov) {
        return jsonOk({
          exists: true,
          registration: regFromMov,
        });
      }
    }

    return jsonOk({
      exists: false,
      registration: null,
    });
  } catch (error) {
    console.error("Failed to check tracking number:", error);
    return jsonError("Unable to verify tracking number.", 500);
  }
}
