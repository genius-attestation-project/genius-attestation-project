import { getFollowupsByDate } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    date: string;
  }>;
};

export async function GET(_: NextRequest, context: { params: Promise<{ date: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Authentication required.", 401);

    const { date } = await context.params;
    const data = await getFollowupsByDate(ownerAdminId, date, userId);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followups by date", error);
    return jsonError("Unable to fetch followups by date.", 500);
  }
}
