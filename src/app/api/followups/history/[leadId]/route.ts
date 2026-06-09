import { getFollowupHistory } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { leadId } = await context.params;
    const data = await getFollowupHistory(ownerAdminId, leadId);

    if (!data) {
      return jsonError("Lead not found.", 404);
    }

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch followup history", error);
    return jsonError("Unable to fetch followup history.", 500);
  }
}
