import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { approveSalaryPayroll } from "@/features/salary/server/salary.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.approve")) {
      return jsonError("You do not have permission to approve payroll.", 403);
    }

    const body = (await request.json().catch(() => ({}))) as { payrollId?: string };
    if (!body.payrollId) {
      return jsonError("Payroll id is required.", 400);
    }

    const payroll = await approveSalaryPayroll(session.user.ownerAdminId ?? session.user.id, {
      payrollId: body.payrollId,
      approvedBy: session.user.id,
    });

    return jsonOk({ payroll });
  } catch (error) {
    console.error("[api/salary/approve] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to approve payroll.", 500);
  }
}
