import { snoozeFollowupWithHistory } from "@/features/lead/server/lead.service";
import { snoozeFollowupSchema } from "@/features/lead/validations/followup.schema";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = snoozeFollowupSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid snooze payload.", 400);
    }

    const lead = await snoozeFollowupWithHistory({
      ownerAdminId,
      leadId: parsed.data.leadId,
      nextFollowupAt: parsed.data.nextFollowupAt,
      description: parsed.data.description,
      changedByUserId: session?.user?.id,
      changedBy: session?.user?.name ?? session?.user?.email ?? undefined,
    });

    if (!lead) {
      return jsonError("Lead not found.", 404);
    }

    return jsonOk({ lead, message: "Followup snoozed successfully." });
  } catch (error) {
    console.error("Failed to snooze followup", error);
    return jsonError("Unable to snooze followup.", 500);
  }
}
