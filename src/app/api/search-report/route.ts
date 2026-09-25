import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { getDocumentReport } from "@/features/registration/server/document-report.service";
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
      hasPermission(access, "search_report.view") ||
      hasPermission(access, "search_report.search");

    if (!canView) {
      return jsonError("You do not have permission to view document reports.", 403);
    }

    const { searchParams } = new URL(request.url);
    const office = searchParams.get("office")?.trim() || "";
    const fromDate = searchParams.get("fromDate")?.trim() || undefined;
    const toDate = searchParams.get("toDate")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || searchParams.get("trackingNumber")?.trim() || undefined;
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawPageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const page = isNaN(rawPage) ? 1 : rawPage;
    const pageSize = isNaN(rawPageSize) ? 10 : rawPageSize;

    if (!office) {
      return jsonError("Office selection is required to generate the document report.", 400);
    }

    const data = await getDocumentReport(
      ownerAdminId,
      {
        office,
        fromDate,
        toDate,
        search,
        page,
        pageSize,
      },
      access!
    );

    return jsonOk(data);
  } catch (error: any) {
    console.error("[GET /api/search-report] Error:", error);
    const isAuthErr = error?.message?.includes("not authorized");
    return jsonError(error?.message || "Failed to generate document report.", isAuthErr ? 403 : 500);
  }
}
