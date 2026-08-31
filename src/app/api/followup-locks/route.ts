import { listMissedFollowupLocks } from "@/features/lead/server/followup-lock.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("pending_approval.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const viewerId = session?.user?.id;
    if (!ownerAdminId || !viewerId) return jsonError("Authentication required.", 401);

    const items = await listMissedFollowupLocks({
      ownerAdminId,
      viewerId,
      isSuperAdmin: session.user.isSuperAdmin,
    });

    return jsonOk({ items });
  } catch (error) {
    console.error("Failed to fetch followup locks", error);
    return jsonError("Unable to fetch followup locks.", 500);
  }
}
