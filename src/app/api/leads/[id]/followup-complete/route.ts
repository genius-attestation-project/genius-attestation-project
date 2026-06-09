import { completeFollowup } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return jsonError("Authentication required.", 401);
    }

    const { id } = await params;
    const lead = await completeFollowup(ownerAdminId, userId, id);

    if (!lead) {
      return jsonError("Follow-up lead not found.", 404);
    }

    return jsonOk({ message: "Follow-up marked as completed." });
  } catch (error) {
    console.error("Failed to complete followup", error);
    return jsonError("Unable to complete follow-up.", 500);
  }
}
