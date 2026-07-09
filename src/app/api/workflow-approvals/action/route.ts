import { NextResponse } from "next/server";
import { actionInactiveLead, actionLobRequest, actionOverdueFollowup } from "@/features/lead/server/workflow-approval.service";
import { ApprovalRequestType, WorkflowApprovalStatus } from "@prisma/client";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const performedBy = session?.user?.id;

    if (!ownerAdminId || !performedBy) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, id, action, remarks } = body;

    if (!type || !id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const workflowAction = action as WorkflowApprovalStatus;

    if (type === ApprovalRequestType.INACTIVE_LEAD) {
      await actionInactiveLead({
        leadId: id,
        action: workflowAction,
        performedBy,
        remarks,
        ownerAdminId,
      });
    } else if (type === ApprovalRequestType.LOB_REQUEST) {
      await actionLobRequest({
        approvalId: id,
        action: workflowAction,
        performedBy,
        remarks,
        ownerAdminId,
      });
    } else if (type === ApprovalRequestType.OVERDUE_FOLLOWUP) {
      await actionOverdueFollowup({
        leadId: id,
        action: workflowAction,
        performedBy,
        remarks,
        ownerAdminId,
      });
    } else {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to perform workflow action", error);
    return NextResponse.json({ error: error.message || "Action failed." }, { status: 500 });
  }
}
