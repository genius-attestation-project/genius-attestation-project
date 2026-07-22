import { getFollowupHistory } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function GET(_: NextRequest, context: { params: Promise<{ leadId: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Authentication required.", 401);

    const { leadId } = await context.params;
    const data = await getFollowupHistory(ownerAdminId, leadId, userId);

    if (!data) {
      return jsonError("Lead not found.", 404);
    }

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followup history", error);
    return jsonError("Unable to fetch followup history.", 500);
  }
}
