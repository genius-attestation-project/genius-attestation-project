import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { getTrackingReportExport } from "@/features/registration/server/tracking-report.service";
import { jsonError } from "@/utils/response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return jsonError("Unauthorized", 401);
    }

    const access = await getSessionAccess(session.user.id);
    const canExport =
      access?.isSuperAdmin ||
      hasPermission(access, "revenue_report.export") ||
      hasPermission(access, "search_report.tracking_report.export") ||
      hasPermission(access, "tracking_report.export") ||
      hasPermission(access, "search_report.export");

    if (!canExport) {
      return jsonError("You do not have permission to export revenue reports.", 403);
    }

    const { searchParams } = new URL(request.url);
    const office = searchParams.get("office")?.trim() || "";
    const fromDate = searchParams.get("fromDate")?.trim() || undefined;
    const toDate = searchParams.get("toDate")?.trim() || undefined;
    const trackingNumber = searchParams.get("trackingNumber")?.trim() || undefined;
    const customerName = searchParams.get("customerName")?.trim() || undefined;
    const mobile = searchParams.get("mobile")?.trim() || undefined;
    const registeredPerson = searchParams.get("registeredPerson")?.trim() || undefined;
    const collectedPerson = searchParams.get("collectedPerson")?.trim() || undefined;
    const documentType = searchParams.get("documentType")?.trim() || undefined;
    const processType = searchParams.get("processType")?.trim() || undefined;
    const status = searchParams.get("status")?.trim() || searchParams.get("trackingStatus")?.trim() || undefined;
    const hasBalance = searchParams.get("hasBalance")?.trim() || undefined;

    if (!office) {
      return jsonError("Office selection is required to export the revenue report.", 400);
    }

    if (fromDate && toDate && fromDate > toDate) {
      return jsonError("From Date cannot be later than To Date.", 400);
    }

    const { buffer, fileName } = await getTrackingReportExport(
      ownerAdminId,
      {
        office,
        fromDate,
        toDate,
        trackingNumber,
        customerName,
        mobile,
        registeredPerson,
        collectedPerson,
        documentType,
        processType,
        status,
        hasBalance,
      },
      access!
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/revenue-report/export] Error:", error);
    const isAuthErr =
      error?.message?.includes("not authorized") ||
      error?.message?.includes("do not have authorization");
    return jsonError(
      error?.message || "Failed to export revenue report.",
      isAuthErr ? 403 : 500
    );
  }
}
