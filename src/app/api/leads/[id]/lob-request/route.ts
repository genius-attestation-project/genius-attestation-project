import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { createLobWorkflowRequest } from "@/features/lead/server/workflow-approval.service";
import { jsonError, jsonOk } from "@/utils/response";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireApiPermission("leads.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const requestedBy = session?.user?.id;

    if (!ownerAdminId || !requestedBy) {
      return jsonError("Authentication required.", 401);
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonError("Lead ID is required.", 400);
    }

    const body = (await request.json().catch(() => ({}))) as {
      reason?: unknown;
    };

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return jsonError("Reason for moving lead to LOB is required.", 400);
    }

    // Verify lead exists and belongs to ownerAdminId
    const lead = await prisma.lead.findFirst({
      where: {
        id,
        ownerAdminId,
      },
      select: {
        id: true,
        leadStatus: true,
        assignedUserId: true,
        createdById: true,
      },
    });

    if (!lead) {
      return jsonError("Lead not found.", 404);
    }

    const approval = await createLobWorkflowRequest({
      leadId: id,
      requestedBy,
      reason,
      ownerAdminId,
    });

    return jsonOk({
      success: true,
      message: "LOB request submitted successfully and sent to your supervisor for approval.",
      approvalId: approval.id,
    });
  } catch (error: any) {
    console.error("Failed to create LOB request", error);
    return jsonError(
      error instanceof Error ? error.message : "Unable to submit LOB request.",
      400,
    );
  }
}
