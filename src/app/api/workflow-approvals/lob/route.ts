import { NextResponse, NextRequest } from "next/server";
import { getPendingLobRequests, createLobWorkflowRequest } from "@/features/lead/server/workflow-approval.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { hasPermission, hasOfficeAccess } from "@/features/admin/server/rbac.service";

export async function GET() {
  const denied = await requireApiPermission("lobApproval.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;
    const isSuperAdmin = Boolean(user.isSuperAdmin);
    const hasApproveAll = hasPermission(user, "lobApproval.approve_all");
    const hasApproveAssigned = hasPermission(user, "lobApproval.approve_assigned_users");

    // Determine supervisor filter
    let supervisorId: string | undefined = undefined;
    if (!isSuperAdmin && !hasApproveAll) {
      if (hasApproveAssigned) {
        supervisorId = user.id;
      } else {
        // User has lobApproval.view but neither approve_all nor approve_assigned_users
        supervisorId = user.id;
      }
    }

    let items = await getPendingLobRequests(ownerAdminId, supervisorId);

    // Apply office visibility filtering if applicable
    if (!isSuperAdmin && user.allowedOfficeIds && user.allowedOfficeIds.length > 0) {
      items = items.filter((item: any) => {
        const leadOffice = item.lead?.officeLocationId;
        if (!leadOffice) return true;
        return hasOfficeAccess(user, leadOffice, "lobApproval");
      });
    }

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Failed to fetch LOB requests", error);
    return NextResponse.json({ error: "Unable to fetch LOB requests." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireApiPermission("leads.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const requestedBy = session?.user?.id;

    if (!ownerAdminId || !requestedBy) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { leadId, reason } = body;

    if (!leadId || typeof leadId !== "string" || !leadId.trim()) {
      return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (!trimmedReason) {
      return NextResponse.json({ error: "Reason for moving lead to LOB is required." }, { status: 400 });
    }

    const approval = await createLobWorkflowRequest({
      leadId: leadId.trim(),
      requestedBy,
      reason: trimmedReason,
      ownerAdminId,
    });

    return NextResponse.json({
      success: true,
      message: "LOB request submitted successfully and sent to your supervisor for approval.",
      approvalId: approval.id,
    });
  } catch (error: any) {
    console.error("Failed to submit LOB request", error);
    return NextResponse.json({ error: error.message || "Failed to submit LOB request." }, { status: 400 });
  }
}
