import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";
import {
  listAccountApprovals,
  createAccountApprovalRequest,
} from "@/features/account-approval/server/account-approval.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return jsonError("Unauthorized", 401);
    }

    const canView =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "account_approval.view") ||
      hasPermission(session.user, "account_approval.approve") ||
      hasPermission(session.user, "account_approval.reject") ||
      hasPermission(session.user, "pending_approval.view") ||
      hasPermission(session.user, "*");

    if (!canView) {
      return jsonError("You do not have permission to view account approvals.", 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "Pending";
    const office = searchParams.get("office") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

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

    const data = await listAccountApprovals({
      ownerAdminId,
      status,
      office,
      search,
      page,
      pageSize,
      isSuperAdmin: session.user.isSuperAdmin,
      allowedOfficeNames,
      allowedOfficeIds,
    });

    return jsonOk(data);
  } catch (error: any) {
    console.error("[GET /api/account-approvals] Error:", error);
    return jsonError(error.message || "Failed to list account approvals.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    const canEdit =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "account_statements.edit") ||
      hasPermission(session.user, "*");

    if (!canEdit) {
      return jsonError("You do not have permission to edit account statements.", 403);
    }

    const body = await request.json().catch(() => ({}));
    const {
      targetId,
      sourceType,
      office,
      officeId,
      customerName,
      trackingNumber,
      oldAmount,
      oldDate,
      oldPaymentMode,
      oldBankName,
      oldCollectedBy,
      oldInvoiceNumber,
      oldRemarks,
      oldProofFileId,
      oldProofFileUrl,
      oldProofFileName,
      newAmount,
      newDate,
      newPaymentMode,
      newBankName,
      newCollectedBy,
      newInvoiceNumber,
      newRemarks,
      newProofFileId,
      newProofFileUrl,
      newProofFileName,
      beforeSnapshot,
      afterSnapshot,
    } = body;

    if (!targetId || !sourceType) {
      return jsonError("Target transaction ID and source type are required.", 400);
    }

    if (!newAmount || newAmount <= 0) {
      return jsonError("New amount must be greater than zero.", 400);
    }

    if (!newDate) {
      return jsonError("New transaction date is required.", 400);
    }

    const approval = await createAccountApprovalRequest({
      ownerAdminId,
      targetId,
      sourceType,
      userId: session.user.id,
      userName: session.user.name || session.user.email || "User",
      office,
      officeId,
      customerName,
      trackingNumber,
      oldAmount: Number(oldAmount || 0),
      oldDate: oldDate || newDate,
      oldPaymentMode,
      oldBankName,
      oldCollectedBy,
      oldInvoiceNumber,
      oldRemarks,
      oldProofFileId,
      oldProofFileUrl,
      oldProofFileName,
      newAmount: Number(newAmount),
      newDate,
      newPaymentMode,
      newBankName,
      newCollectedBy,
      newInvoiceNumber,
      newRemarks,
      newProofFileId,
      newProofFileUrl,
      newProofFileName,
      beforeSnapshot,
      afterSnapshot,
    });

    return jsonOk({ success: true, pendingApproval: true, item: approval });
  } catch (error: any) {
    console.error("[POST /api/account-approvals] Error:", error);
    return jsonError(error.message || "Failed to create account approval request.", 400);
  }
}
