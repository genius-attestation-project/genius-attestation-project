import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { approveSalaryPayroll } from "@/features/salary/server/salary.service";
import { salaryApproveSchema } from "@/features/salary/validations/salary.schema";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.approve")) {
      return jsonError("You do not have permission to approve payroll.", 403);
    }

    const body = (await request.json().catch(() => ({}))) as unknown;
    const parsed = salaryApproveSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payroll approval request.", 400);
    }

    const payroll = await approveSalaryPayroll(session.user.ownerAdminId ?? session.user.id, {
      payrollId: parsed.data.payrollId,
      approvedBy: session.user.id,
    });

    return jsonOk({ payroll });
  } catch (error) {
    console.error("[api/salary/approve] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to approve payroll.", 500);
  }
}
