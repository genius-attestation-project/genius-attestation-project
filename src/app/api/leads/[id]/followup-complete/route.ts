import { completeFollowup } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
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
    if (!id?.trim()) {
      return jsonError("Lead id is required.", 400);
    }

    const body = (await request.json().catch(() => ({}))) as {
      description?: unknown;
      completionDescription?: unknown;
      completionNote?: unknown;
    };
    const description =
      typeof body.completionNote === "string"
        ? body.completionNote.trim()
        : typeof body.description === "string"
          ? body.description.trim()
          : typeof body.completionDescription === "string"
          ? body.completionDescription.trim()
          : "";

    const lead = await completeFollowup({
      ownerAdminId,
      userId,
      leadId: id,
      completionDescription: description,
      completionNote: description,
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
