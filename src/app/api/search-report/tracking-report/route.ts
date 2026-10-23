import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { getTrackingReport } from "@/features/registration/server/tracking-report.service";
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
    const canView =
      access?.isSuperAdmin ||
      hasPermission(access, "revenue_report.view") ||
      hasPermission(access, "revenue_report.search") ||
      hasPermission(access, "search_report.tracking_report.view") ||
      hasPermission(access, "search_report.tracking_report.search") ||
      hasPermission(access, "tracking_report.view") ||
      hasPermission(access, "tracking_report.search") ||
      hasPermission(access, "search_report.view");

    if (!canView) {
      return jsonError("You do not have permission to view revenue reports.", 403);
    }

    const { searchParams } = new URL(request.url);
    const office = searchParams.get("office")?.trim() || "";
    const rawOfficeIds = searchParams.getAll("officeIds");
    const officeIds = (rawOfficeIds.length > 0 ? rawOfficeIds : [office])
      .flatMap((id) => (id ? id.split(",") : []))
      .map((s) => s.trim())
      .filter(Boolean);

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
    const search = searchParams.get("search")?.trim() || undefined;

    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const pageSize = pageSizeParam ? Math.max(1, parseInt(pageSizeParam, 10)) : 10;

    if (!office && officeIds.length === 0) {
      return jsonError("Office selection is required to generate the tracking report.", 400);
    }

    if (fromDate && toDate && fromDate > toDate) {
      return jsonError("From Date cannot be later than To Date.", 400);
    }

    const data = await getTrackingReport(
      ownerAdminId,
      {
        office: office || officeIds.join(","),
        officeIds,
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
        search,
        page,
        pageSize,
      },
      access!
    );

    return jsonOk(data);
  } catch (error: any) {
    console.error("[GET /api/search-report/tracking-report] Error:", error);
    const isAuthErr =
      error?.message?.includes("not authorized") ||
      error?.message?.includes("do not have authorization");
    return jsonError(
      error?.message || "Failed to generate tracking report.",
      isAuthErr ? 403 : 500
    );
  }
}
