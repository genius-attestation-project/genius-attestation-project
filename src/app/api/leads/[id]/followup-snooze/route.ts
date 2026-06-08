import { snoozeFollowup } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

function getSnoozeDate(value: unknown) {
  const now = new Date();

  if (value === "10m") {
    return new Date(now.getTime() + 10 * 60 * 1000);
  }

  if (value === "30m") {
    return new Date(now.getTime() + 30 * 60 * 1000);
  }

  if (value === "1h") {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  if (value === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return jsonError("Authentication required.", 401);
    }

    const body = (await request.json().catch(() => null)) as { snoozeFor?: string } | null;
    const nextFollowupAt = getSnoozeDate(body?.snoozeFor);

    if (!nextFollowupAt) {
      return jsonError("Select a valid snooze option.");
    }

    const { id } = await params;
    const lead = await snoozeFollowup({
      ownerAdminId,
      userId,
      leadId: id,
      nextFollowupAt,
    });

    if (!lead) {
      return jsonError("Follow-up lead not found.", 404);
    }

    return jsonOk({
      message: "Follow-up reminder snoozed.",
      nextFollowupAt: nextFollowupAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to snooze followup", error);
    return jsonError("Unable to snooze follow-up.", 500);
  }
}
