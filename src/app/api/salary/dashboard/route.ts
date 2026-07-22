import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getSalaryDashboard } from "@/features/salary/server/salary.service";
import { salaryMonthYearQuerySchema } from "@/features/salary/validations/salary.schema";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.view")) {
      return jsonError("You do not have permission to view salary data.", 403);
    }

    const { searchParams } = new URL(request.url);
    const parsed = salaryMonthYearQuerySchema.safeParse({
      month: searchParams.get("month") ?? undefined,
      year: searchParams.get("year") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid salary period.", 400);
    }

    const payload = await getSalaryDashboard(session.user.ownerAdminId ?? session.user.id, {
      month: parsed.data.month,
      year: parsed.data.year,
    });

    return jsonOk(payload);
  } catch (error) {
    console.error("[api/salary/dashboard] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to load salary dashboard.", 500);
  }
}
