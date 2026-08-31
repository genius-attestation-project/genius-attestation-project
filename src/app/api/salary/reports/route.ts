import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getSalaryReports } from "@/features/salary/server/salary.service";
import { salaryReportsQuerySchema } from "@/features/salary/validations/salary.schema";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.report")) {
      return jsonError("You do not have permission to view salary reports.", 403);
    }

    const { searchParams } = new URL(request.url);
    const parsed = salaryReportsQuerySchema.safeParse({
      month: searchParams.get("month") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid salary report filters.", 400);
    }

    const payload = await getSalaryReports(session.user.ownerAdminId ?? session.user.id, {
      month: parsed.data.month,
      year: parsed.data.year,
      userId: parsed.data.userId,
      status: parsed.data.status,
    });

    return jsonOk(payload);
  } catch (error) {
    console.error("[api/salary/reports] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to load salary reports.", 500);
  }
}
