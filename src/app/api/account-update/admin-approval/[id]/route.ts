import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { setAdminApprovalDecision } from "@/features/account-update/server/account-update.service";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "account_approval.edit")) {
      return jsonError("You do not have permission to update finance approvals.", 403);
    }

    const ownerAdminId = session.user.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const body = (await request.json().catch(() => null)) as
      | { action?: "approve" | "reject"; reason?: string }
      | null;

    if (!body?.action || !["approve", "reject"].includes(body.action)) {
      return jsonError("A valid approval action is required.");
    }

    const { id } = await params;
    await setAdminApprovalDecision({
      ownerAdminId,
      id,
      action: body.action,
      reason: body.reason,
      performedBy: session.user.name ?? session.user.email ?? undefined,
    });

    return jsonOk({
      message:
        body.action === "approve"
          ? "Finance approval completed successfully."
          : "Finance rejection recorded successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update finance approval.";
    console.error("Failed to update admin approval", error);
    return jsonError(message, 400);
  }
}
