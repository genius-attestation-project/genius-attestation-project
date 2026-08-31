import { getTodayFollowups } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Authentication required.", 401);

    const data = await getTodayFollowups(ownerAdminId, userId);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch today's followups", error);
    return jsonError("Unable to fetch today's followups.", 500);
  }
}
