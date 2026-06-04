import { resetUserPassword } from "@/features/admin/server/rbac.service";
import { resetUserPasswordSchema } from "@/features/admin/validations/rbac.schema";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("users.manage");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = resetUserPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid password reset payload.");
    }

    const user = await resetUserPassword(ownerAdminId, id, parsed.data.password);

    if (!user) {
      return jsonError("User not found.", 404);
    }

    return jsonOk({ user });
  } catch (error) {
    console.error("Failed to reset user password", error);
    return jsonError("Unable to reset user password.", 500);
  }
}
