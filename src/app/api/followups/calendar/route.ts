import { getFollowupCalendar } from "@/features/lead/server/lead.service";
import type { FollowupFilter } from "@/features/lead/types/followup.types";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

const validFilters: FollowupFilter[] = ["all", "today", "upcoming", "missed", "completed"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const rawFilter = searchParams.get("filter");
    const filter = validFilters.includes(rawFilter as FollowupFilter)
      ? (rawFilter as FollowupFilter)
      : "all";

    const data = await getFollowupCalendar(ownerAdminId, filter);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followup calendar", error);
    return jsonError("Unable to fetch followup calendar.", 500);
  }
}
