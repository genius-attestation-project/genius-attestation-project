import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { getDocumentReportExport } from "@/features/registration/server/document-report.service";
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
    const canExport = access?.isSuperAdmin || hasPermission(access, "search_report.export");

    if (!canExport) {
      return jsonError("You do not have permission to export document reports.", 403);
    }

    const { searchParams } = new URL(request.url);
    const office = searchParams.get("office")?.trim() || "";
    const fromDate = searchParams.get("fromDate")?.trim() || undefined;
    const toDate = searchParams.get("toDate")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || searchParams.get("trackingNumber")?.trim() || undefined;

    if (!office) {
      return jsonError("Office selection is required to export the document report.", 400);
    }

    const { buffer, fileName } = await getDocumentReportExport(
      ownerAdminId,
      {
        office,
        fromDate,
        toDate,
        search,
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
    console.error("[GET /api/search-report/export] Error:", error);
    const isAuthErr = error?.message?.includes("not authorized");
    return jsonError(error?.message || "Failed to export document report.", isAuthErr ? 403 : 500);
  }
}
