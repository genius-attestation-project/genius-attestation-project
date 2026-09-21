import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { approveRDApproval } from "@/features/pending-approval/server/rd-approval.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized.", 401);
    }

    const canApprove =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "pending_approval.rd_approval.approve");

    if (!canApprove) {
      return jsonError("Forbidden. You do not have permission to approve RD requests.", 403);
    }

    const { id } = await params;
    if (!id) {
      return jsonError("RD approval ID is required.", 400);
    }

    const body = await request.json().catch(() => ({}));
    const approvalRemarks = typeof body.remarks === "string" ? body.remarks : typeof body.approvalRemarks === "string" ? body.approvalRemarks : undefined;

    let allowedOfficeIds = session.user.allowedOfficeIds;
    let allowedOfficeNames = session.user.allowedOfficeNames;

    if (!session.user.isSuperAdmin) {
      if (session.user.moduleOfficeVisibilities?.["rd_approval"]) {
        const modConfig = session.user.moduleOfficeVisibilities["rd_approval"];
        allowedOfficeIds = modConfig.officeIds;
        allowedOfficeNames = modConfig.officeNames;
      } else if (session.user.moduleOfficeVisibilities?.["pending_approval"]) {
        const modConfig = session.user.moduleOfficeVisibilities["pending_approval"];
        allowedOfficeIds = modConfig.officeIds;
        allowedOfficeNames = modConfig.officeNames;
      }
    }

    const result = await approveRDApproval({
      id,
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? "Admin User",
      ownerAdminId,
      approvalRemarks,
      allowedOfficeNames: allowedOfficeNames ?? undefined,
      allowedOfficeIds: allowedOfficeIds ?? undefined,
      isSuperAdmin: session.user.isSuperAdmin,
    });

    return jsonOk({ success: true, ...result });
  } catch (error: any) {
    console.error("Failed to approve RD request:", error);
    const status = error.message?.includes("Forbidden") ? 403 : error.message?.includes("not found") ? 404 : 400;
    return jsonError(error.message || "Failed to approve RD request.", status);
  }
}
