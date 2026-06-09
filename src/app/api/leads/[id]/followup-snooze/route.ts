import { snoozeFollowup } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

function parseFollowupDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(
  request: Request,
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
    const body = (await request.json().catch(() => ({}))) as {
      nextFollowupDateTime?: unknown;
      nextFollowupAt?: unknown;
      snoozeFor?: unknown;
    };
    const nextFollowupAt =
      parseFollowupDateTime(body.nextFollowupDateTime) ??
      parseFollowupDateTime(body.nextFollowupAt) ??
      getSnoozeDate(body.snoozeFor);

    console.log("Lead ID:", id);
    console.log("Body:", body);

    if (!nextFollowupAt) {
      return jsonError("Next follow-up date and time is required.", 400);
    }

    const existingLead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, ownerAdminId: true, assignedUserId: true },
    });

    if (!existingLead) {
      return jsonError("Follow-up lead not found.", 404);
    }

    const lead = await snoozeFollowup({
      ownerAdminId,
      userId,
      leadId: id,
      nextFollowupAt,
      changedBy: session?.user?.name ?? session?.user?.email ?? undefined,
    });

    if (!lead) {
      return jsonError("Follow-up lead not found.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Unable to snooze follow-up.", 500);
  }
}
