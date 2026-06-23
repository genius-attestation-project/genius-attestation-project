import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getSalaryDashboard } from "@/features/salary/server/salary.service";
import { jsonError, jsonOk } from "@/utils/response";

function parseOptionalInt(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.view")) {
      return jsonError("You do not have permission to view salary data.", 403);
    }

    const { searchParams } = new URL(request.url);
    const month = parseOptionalInt(searchParams.get("month"));
    const year = parseOptionalInt(searchParams.get("year"));

    const payload = await getSalaryDashboard(session.user.ownerAdminId ?? session.user.id, {
      month,
      year,
    });

    return jsonOk(payload);
  } catch (error) {
    console.error("[api/salary/dashboard] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to load salary dashboard.", 500);
  }
}
