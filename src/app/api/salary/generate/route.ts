import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { generateSalaryPayrolls } from "@/features/salary/server/salary.service";
import { jsonError, jsonOk } from "@/utils/response";

function parseOptionalInt(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.generate")) {
      return jsonError("You do not have permission to generate payroll.", 403);
    }

    const body = (await request.json().catch(() => ({}))) as {
      month?: number;
      year?: number;
      userId?: string;
      notes?: string;
    };

    const now = new Date();
    const payload = await generateSalaryPayrolls(session.user.ownerAdminId ?? session.user.id, {
      month: parseOptionalInt(String(body.month ?? "")) ?? now.getMonth() + 1,
      year: parseOptionalInt(String(body.year ?? "")) ?? now.getFullYear(),
      userId: body.userId,
      notes: body.notes,
      generatedBy: session.user.id,
    });

    return jsonOk(payload);
  } catch (error) {
    console.error("[api/salary/generate] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to generate payroll.", 500);
  }
}


