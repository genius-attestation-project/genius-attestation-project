import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import {
  approvePaymentUpdate,
  resetPaymentApproval,
} from "@/features/account-update/server/account-update.service";
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

    if (
      !session.user.isSuperAdmin &&
      !hasPermission(session.user, "account_admin_approval.edit") &&
      !hasPermission(session.user, "account_approval.edit")
    ) {
      return jsonError("You do not have permission to update finance approvals.", 403);
    }

    const ownerAdminId = session.user.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const body = (await request.json().catch(() => null)) as { action?: "approve" | "reset"; reason?: string } | null;

    if (!body?.action || !["approve", "reset"].includes(body.action)) {
      return jsonError("A valid approval action is required.");
    }

    const { id } = await params;
    const performedBy = session.user.name ?? session.user.email ?? undefined;

    if (body.action === "approve") {
      await approvePaymentUpdate({ ownerAdminId, id, performedBy });
    } else {
      await resetPaymentApproval({ ownerAdminId, id, performedBy, reason: body.reason });
    }

    return jsonOk({
      message:
        body.action === "approve"
          ? "Finance approval completed successfully."
          : "Finance approval reset successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update finance approval.";
    console.error("Failed to update admin approval", error);
    return jsonError(message, 400);
  }
}
