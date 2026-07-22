import { getFollowupCalendar } from "@/features/lead/server/lead.service";
import type { FollowupFilter } from "@/features/lead/types/followup.types";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

const validFilters: FollowupFilter[] = ["all", "today", "upcoming", "missed", "completed"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Authentication required.", 401);

    const { searchParams } = new URL(request.url);
    const rawFilter = searchParams.get("filter");
    const filter = validFilters.includes(rawFilter as FollowupFilter)
      ? (rawFilter as FollowupFilter)
      : "all";

    const assignedUser = searchParams.get("assignedUser") || undefined;
    const officeLocationId = searchParams.get("officeLocationId") || undefined;
    const leadStatus = searchParams.get("leadStatus") || undefined;

    const data = await getFollowupCalendar(ownerAdminId, filter, userId, {
      assignedUser,
      officeLocationId,
      leadStatus,
    });
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followup calendar", error);
    return jsonError("Unable to fetch followup calendar.", 500);
  }
}
