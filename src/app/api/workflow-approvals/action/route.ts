import { NextResponse, NextRequest } from "next/server";
import { actionInactiveLead, actionLobRequest, actionOverdueFollowup } from "@/features/lead/server/workflow-approval.service";
import { ApprovalRequestType, WorkflowApprovalStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function POST(req: NextRequest) {
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
    const actionKey = workflowAction === "Approved" ? "approve" : workflowAction === "Rejected" ? "reject" : "return";

    if (type === ApprovalRequestType.INACTIVE_LEAD) {
      if (!session.user.isSuperAdmin && !hasPermission(session.user, `inactiveLead.${actionKey}`)) {
        return NextResponse.json({ error: `Forbidden. You do not have permission to ${actionKey} inactive leads.` }, { status: 403 });
      }
      await actionInactiveLead({
        leadId: id,
        action: workflowAction,
        performedBy,
        remarks,
        ownerAdminId,
      });
    } else if (type === ApprovalRequestType.LOB_REQUEST) {
      const isSuperAdmin = Boolean(session.user.isSuperAdmin);
      const hasApproveAll = hasPermission(session.user, "lobApproval.approve_all");
      const hasApproveAssigned = hasPermission(session.user, "lobApproval.approve_assigned_users");
      const hasLegacyAction = hasPermission(session.user, `lobApproval.${actionKey}`);

      if (!isSuperAdmin && !hasApproveAll && !hasApproveAssigned && !hasLegacyAction) {
        return NextResponse.json({ error: `Forbidden. You do not have permission to ${actionKey} LOB requests.` }, { status: 403 });
      }

      await actionLobRequest({
        approvalId: id,
        action: workflowAction,
        performedBy,
        remarks,
        ownerAdminId,
        userAccess: session.user,
      });
    } else if (type === ApprovalRequestType.OVERDUE_FOLLOWUP) {
      if (
        !session.user.isSuperAdmin &&
        !hasPermission(session.user, `overdueFollowup.${actionKey}`) &&
        !hasPermission(session.user, "pending_approval.edit")
      ) {
        return NextResponse.json({ error: `Forbidden. You do not have permission to ${actionKey} overdue followups.` }, { status: 403 });
      }
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
    const message = error.message || "Action failed.";
    const isForbidden = message.toLowerCase().includes("forbidden") || message.toLowerCase().includes("permission") || message.toLowerCase().includes("office access");
    const status = isForbidden ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
