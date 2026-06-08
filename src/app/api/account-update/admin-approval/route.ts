import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getAdminApprovalQueue } from "@/features/account-update/server/account-update.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "account_approval.view")) {
      return jsonError("You do not have permission to view finance approvals.", 403);
    }

    const ownerAdminId = session.user.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const data = await getAdminApprovalQueue(ownerAdminId);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch admin approval queue", error);
    return jsonError("Unable to fetch admin approval queue.", 500);
  }
}
