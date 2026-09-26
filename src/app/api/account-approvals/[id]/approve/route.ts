import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { approveAccountApproval } from "@/features/account-approval/server/account-approval.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    const canApprove =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "account_approval.approve") ||
      hasPermission(session.user, "*");

    if (!canApprove) {
      return jsonError("You do not have permission to approve account transactions.", 403);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { approvalRemarks } = body;

    let allowedOfficeNames = session.user.allowedOfficeNames;
    let allowedOfficeIds = session.user.allowedOfficeIds;

    if (!session.user.isSuperAdmin) {
      if (session.user.moduleOfficeVisibilities?.["account_approval"]) {
        const modConfig = session.user.moduleOfficeVisibilities["account_approval"];
        allowedOfficeNames = modConfig.officeNames;
        allowedOfficeIds = modConfig.officeIds;
      } else if (session.user.moduleOfficeVisibilities?.["pending_approval"]) {
        const modConfig = session.user.moduleOfficeVisibilities["pending_approval"];
        allowedOfficeNames = modConfig.officeNames;
        allowedOfficeIds = modConfig.officeIds;
      }
    }

    const updated = await approveAccountApproval({
      id,
      ownerAdminId,
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Approver",
      approvalRemarks,
      isSuperAdmin: session.user.isSuperAdmin,
      allowedOfficeNames,
      allowedOfficeIds,
    });

    return jsonOk({ success: true, item: updated });
  } catch (error: any) {
    console.error("[POST /api/account-approvals/[id]/approve] Error:", error);
    return jsonError(error.message || "Failed to approve account transaction.", 400);
  }
}
