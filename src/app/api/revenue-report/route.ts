import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionAccess, hasPermission, hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { getRevenueReport } from "@/features/registration/server/revenue-report.service";
import { jsonError, jsonOk } from "@/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return jsonError("Unauthorized", 401);
    }

    const access = await getSessionAccess(session.user.id);
    if (!access) {
      return jsonError("Unauthorized", 401);
    }

    // 1. Verify View permission
    const canView =
      access.isSuperAdmin ||
      hasPermission(access, "revenue_report.view") ||
      hasPermission(access, "search_report.tracking_report.view") ||
      hasPermission(access, "tracking_report.view");

    if (!canView) {
      return jsonError("You do not have permission to view revenue reports.", 403);
    }

    // 2. Verify Search action permission
    const canSearch =
      access.isSuperAdmin ||
      hasPermission(access, "revenue_report.search") ||
      hasPermission(access, "search_report.tracking_report.search") ||
      hasPermission(access, "tracking_report.search") ||
      hasPermission(access, "revenue_report.view");

    if (!canSearch) {
      return jsonError("You do not have permission to search revenue reports.", 403);
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
      return jsonError("Office selection is required to generate the revenue report.", 400);
    }

    // 3. Verify Office Visibility Access
    if (!access.isSuperAdmin && office.toLowerCase() !== "all") {
      const isAllowed = hasOfficeAccess(access, office, "revenue_report");
      if (!isAllowed) {
        return jsonError("You are not authorized to view revenue reports for this office.", 403);
      }
    }

    if (fromDate && toDate && fromDate > toDate) {
      return jsonError("From Date cannot be later than To Date.", 400);
    }

    const data = await getRevenueReport(
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
      access
    );

    return jsonOk(data);
  } catch (error: any) {
    console.error("[GET /api/revenue-report] Error:", error);
    const isAuthErr =
      error?.message?.includes("not authorized") ||
      error?.message?.includes("do not have authorization");
    return jsonError(
      error?.message || "Failed to generate revenue report.",
      isAuthErr ? 403 : 500
    );
  }
}
