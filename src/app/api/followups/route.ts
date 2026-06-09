import { getFollowupCalendar } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");
    const data = await getFollowupCalendar(
      ownerAdminId,
      filter === "today" || filter === "upcoming" || filter === "missed" || filter === "completed"
        ? filter
        : "all",
    );
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followups", error);
    return jsonError("Unable to fetch followups.", 500);
  }
}

