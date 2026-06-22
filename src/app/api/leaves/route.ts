import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { applyLeaveRequest, listLeaveRequests } from "@/features/leave/server/leave.service";
import { applyLeaveSchema } from "@/features/leave/validations/leave.schema";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);

    const canViewAll =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "leave.approve") ||
      hasPermission(session.user, "leave.report");

    if (!canViewAll && !hasPermission(session.user, "leave.view") && !hasPermission(session.user, "leave.create")) {
      return jsonError("You do not have permission to view leaves.", 403);
    }

    const { searchParams } = new URL(request.url);
    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const rows = await listLeaveRequests({
      ownerAdminId,
      userId: session.user.id,
      canViewAll,
      isSuperAdmin: session.user.isSuperAdmin,
      filterUserId: searchParams.get("userId") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      officeLocationId: searchParams.get("officeLocationId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      month: searchParams.get("month") ? Number(searchParams.get("month")) : undefined,
      year: searchParams.get("year") ? Number(searchParams.get("year")) : undefined,
    });

    return jsonOk({ rows });
  } catch (error) {
    console.error("[api/leaves] GET failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to fetch leaves.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);
    if (!session.user.isSuperAdmin && !hasPermission(session.user, "leave.create")) {
      return jsonError("You do not have permission to apply for leave.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = applyLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid leave payload.");
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const row = await applyLeaveRequest({
      ownerAdminId,
      userId: session.user.id,
      ...parsed.data,
    });

    return jsonOk({ row }, 201);
  } catch (error) {
    console.error("[api/leaves] POST failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to submit leave request.", 500);
  }
}
