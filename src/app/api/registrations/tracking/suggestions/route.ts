import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { getSessionAccess, canUserViewDocumentDetails, hasPermission } from "@/features/admin/server/rbac.service";
import { searchTrackingSuggestions } from "@/features/registration/server/registration.service";

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
    const canSearch =
      Boolean(access?.isSuperAdmin) ||
      hasPermission(access, "search_report.search") ||
      hasPermission(access, "search_report.view") ||
      canUserViewDocumentDetails(access);

    if (!canSearch) {
      return jsonError("You do not have permission to search registrations.", 403);
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();

    if (!query) {
      return jsonOk({ suggestions: [] });
    }

    const suggestions = await searchTrackingSuggestions(ownerAdminId, query, access);

    return jsonOk({ suggestions });
  } catch (error: any) {
    console.error("Failed to fetch tracking suggestions", error);
    return jsonError("Unable to fetch tracking suggestions.", 500);
  }
}

