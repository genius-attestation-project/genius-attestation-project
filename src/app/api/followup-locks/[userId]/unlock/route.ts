import { z } from "zod";

import { unlockMissedFollowupUser } from "@/features/lead/server/followup-lock.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

const payloadSchema = z.object({
  reason: z.string().trim().min(1, "Unlock reason is required."),
});

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("pending_approval.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const viewerId = session?.user?.id;
    if (!ownerAdminId || !viewerId) return jsonError("Authentication required.", 401);

    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid unlock payload.", 400);
    }

    const { userId } = await context.params;
    const unlocked = await unlockMissedFollowupUser({
      ownerAdminId,
      viewerId,
      userId,
      reason: parsed.data.reason,
      isSuperAdmin: session.user.isSuperAdmin,
    });

    if (!unlocked) {
      return jsonError("Locked user not found.", 404);
    }

    return jsonOk({ message: "User unlocked successfully." });
  } catch (error) {
    console.error("Failed to unlock followup lock", error);
    return jsonError("Unable to unlock user.", 500);
  }
}
