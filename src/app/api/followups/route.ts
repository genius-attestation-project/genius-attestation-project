import { getFollowupCalendar } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Authentication required.", 401);

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");
    const assignedUser = searchParams.get("assignedUser") || undefined;
    const officeLocationId = searchParams.get("officeLocationId") || undefined;
    const leadStatus = searchParams.get("leadStatus") || undefined;

    const data = await getFollowupCalendar(
      ownerAdminId,
      filter === "today" || filter === "upcoming" || filter === "missed" || filter === "completed"
        ? filter
        : "all",
      userId,
      { assignedUser, officeLocationId, leadStatus }
    );
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followups", error);
    return jsonError("Unable to fetch followups.", 500);
  }
}
