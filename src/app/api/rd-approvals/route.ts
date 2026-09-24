import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  listRDApprovals,
  createRDApprovalRequest,
} from "@/features/pending-approval/server/rd-approval.service";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) return jsonError("No owner admin ID found.", 401);

    const canView =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "pending_approval.rd_approval.view") ||
      hasPermission(session.user, "pending_approval.rd_approval.approve") ||
      hasPermission(session.user, "pending_approval.rd_approval.reject") ||
      hasPermission(session.user, "pending_approval.view");

    if (!canView) {
      return jsonError("Forbidden. You do not have permission to view RD approvals.", 403);
    }

    const url = new URL(request.url);
    const queryOfficeId = url.searchParams.get("officeId") || url.searchParams.get("officeLocationId");
    const queryOfficeName = url.searchParams.get("office") || url.searchParams.get("officeName");
    const status = url.searchParams.get("status") || "Pending";
    const search = url.searchParams.get("search") || undefined;

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

    const items = await listRDApprovals({
      ownerAdminId,
      officeId: queryOfficeId || undefined,
      officeName: queryOfficeName || undefined,
      status,
      search,
      isSuperAdmin: session.user.isSuperAdmin,
      allowedOfficeIds: allowedOfficeIds ?? undefined,
      allowedOfficeNames: allowedOfficeNames ?? undefined,
    });

    return jsonOk({ items, total: items.length });
  } catch (error: any) {
    console.error("Failed to list RD approvals:", error);
    return jsonError(error.message || "Failed to list RD approvals.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized.", 401);
    }

    const canCreate =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "home.document_in_hand.rd_button") ||
      hasPermission(session.user, "home.rd_button");

    if (!canCreate) {
      return jsonError("Forbidden. You do not have permission to create RD approval requests.", 403);
    }

    const body = await request.json().catch(() => ({}));
    const trackingNumbers = Array.isArray(body?.trackingNumbers)
      ? body.trackingNumbers
      : body?.trackingNumber
        ? [body.trackingNumber]
        : [];

    if (trackingNumbers.length === 0) {
      return jsonError("Tracking number(s) are required.", 400);
    }

    const result = await createRDApprovalRequest({
      trackingNumbers,
      userId: session.user.id,
      userName: session.user.name || undefined,
      ownerAdminId,
      remarks: body?.remarks,
    });

    return jsonOk(result);
  } catch (error: any) {
    console.error("Failed to create RD approval request:", error);
    return jsonError(error.message || "Failed to create RD approval request.", 500);
  }
}
