import { completeFollowupWithDescription } from "@/features/lead/server/lead.service";
import { completeFollowupSchema } from "@/features/lead/validations/followup.schema";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = completeFollowupSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid completion payload.", 400);
    }

    const lead = await completeFollowupWithDescription({
      ownerAdminId,
      leadId: parsed.data.leadId,
      completionDescription: parsed.data.completionDescription,
      changedByUserId: session?.user?.id,
      changedBy: session?.user?.name ?? session?.user?.email ?? undefined,
    });

    if (!lead) {
      return jsonError("Lead not found.", 404);
    }

    return jsonOk({ lead, message: "Followup marked as completed." });
  } catch (error) {
    console.error("Failed to complete followup", error);
    return jsonError("Unable to complete followup.", 500);
  }
}
