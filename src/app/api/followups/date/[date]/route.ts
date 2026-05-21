import { getFollowupsByDate } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{
    date: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { date } = await context.params;
    const data = await getFollowupsByDate(ownerAdminId, date);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followups by date", error);
    return jsonError("Unable to fetch followups by date.", 500);
  }
}
