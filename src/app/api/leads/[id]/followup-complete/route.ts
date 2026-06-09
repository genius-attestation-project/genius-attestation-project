import { completeFollowup } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";

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
      description?: unknown;
      completionDescription?: unknown;
    };
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : typeof body.completionDescription === "string"
          ? body.completionDescription.trim()
          : "";

    console.log("Lead ID:", id);
    console.log("Body:", body);

    if (!description) {
      return jsonError("Completion description is required.", 400);
    }

    const existingLead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, ownerAdminId: true, assignedUserId: true },
    });

    if (!existingLead) {
      return jsonError("Follow-up lead not found.", 404);
    }

    const lead = await completeFollowup({
      ownerAdminId,
      userId,
      leadId: id,
      completionDescription: description,
      changedBy: session?.user?.name ?? session?.user?.email ?? undefined,
    });

    if (!lead) {
      return jsonError("Follow-up lead not found.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Unable to complete follow-up.", 500);
  }
}
