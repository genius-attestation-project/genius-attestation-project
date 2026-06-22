import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getLeaveReport } from "@/features/leave/server/leave.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);
    if (!session.user.isSuperAdmin && !hasPermission(session.user, "leave.report")) {
      return jsonError("You do not have permission to access leave reports.", 403);
    }

    const { searchParams } = new URL(request.url);
    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const payload = await getLeaveReport({
      ownerAdminId,
      userId: session.user.id,
      canViewAll: true,
      isSuperAdmin: session.user.isSuperAdmin,
      filterUserId: searchParams.get("userId") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      officeLocationId: searchParams.get("officeLocationId") ?? undefined,
      month: searchParams.get("month") ? Number(searchParams.get("month")) : undefined,
      year: searchParams.get("year") ? Number(searchParams.get("year")) : undefined,
    });

    return jsonOk(payload);
  } catch (error) {
    console.error("[api/leaves/reports] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to build leave report.", 500);
  }
}
