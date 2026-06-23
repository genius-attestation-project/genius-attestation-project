import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { generateSalaryPayrolls } from "@/features/salary/server/salary.service";
import { salaryGenerateSchema } from "@/features/salary/validations/salary.schema";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.generate")) {
      return jsonError("You do not have permission to generate payroll.", 403);
    }

    const body = (await request.json().catch(() => ({}))) as unknown;
    const parsed = salaryGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid salary generation request.", 400);
    }

    const now = new Date();
    const payload = await generateSalaryPayrolls(session.user.ownerAdminId ?? session.user.id, {
      month: parsed.data.month ?? now.getMonth() + 1,
      year: parsed.data.year ?? now.getFullYear(),
      userId: parsed.data.userId,
      notes: parsed.data.notes,
      generatedBy: session.user.id,
    });

    return jsonOk(payload);
  } catch (error) {
    console.error("[api/salary/generate] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to generate payroll.", 500);
  }
}
