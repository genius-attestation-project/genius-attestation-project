import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { prisma } from "@/lib/prisma";
import { deleteAdvancePaymentApproval } from "@/features/revenue/server/advance-payment-approval.service";
import { deleteAccountPanelTransaction } from "@/features/account-panel/server/account-panel-transaction.service";
import { createAccountApprovalRequest } from "@/features/account-approval/server/account-approval.service";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiPermission("account_statements.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // If ID starts with "debit_adv_", strip prefix to get original advance payment approval ID
    const cleanId = id.startsWith("debit_adv_") ? id.replace("debit_adv_", "") : id;
    const sourceType = body.sourceType || (id.startsWith("debit_adv_") ? "ADVANCE_PAYMENT" : undefined);
    const isSuperAdmin = Boolean(session.user.isSuperAdmin);

    const newAmount = Number(body.amount ?? body.advanceAmount ?? 0);
    const newDate = body.paymentDate ?? body.transactionDate;
    const newPaymentMode = body.paymentMode ?? undefined;
    const newBankName = body.bankName?.trim() || undefined;
    const newCollectedBy = body.collectedBy?.trim() || undefined;
    const newInvoiceNumber = body.invoiceNumber ?? body.referenceNumber ?? undefined;
    const newRemarks = body.narration ?? body.remarks ?? undefined;
    const newProofFileId = body.newProofFileId ?? body.bankProofFileId ?? body.billAttachment ?? undefined;
    const newProofFileUrl = body.newProofFileUrl ?? (newProofFileId ? `/api/files/${newProofFileId}/view` : undefined);
    const newProofFileName = body.newProofFileName ?? body.billFileName ?? undefined;

    if (sourceType === "ADVANCE_PAYMENT") {
      const approval = await prisma.advancePaymentApproval.findFirst({
        where: { id: cleanId, ownerAdminId },
        include: {
          registration: true,
          auditLogs: {
            where: { action: { in: ["Submitted", "Created"] } },
            select: { remarks: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });

      if (!approval) {
        return NextResponse.json({ error: "Advance payment transaction not found." }, { status: 404 });
      }

      const office = approval.office || approval.registration?.regionOfRegistration;
      if (!isSuperAdmin) {
        if (!hasOfficeAccess(session.user, office, "account_statements")) {
          return NextResponse.json(
            { error: "You are not authorized to edit records for this office." },
            { status: 403 }
          );
        }
      }

      const oldAmount = Number(approval.advanceAmount ?? 0);
      const oldDate = approval.paymentDate || approval.requestedAt || approval.createdAt;
      const oldPaymentMode = approval.paymentMode || approval.registration?.paymentMode || "Cash";
      const oldBankName = approval.registration?.bankName || null;
      const oldCollectedBy = approval.collectedBy || approval.requestedByName || approval.registration?.collectedPerson || approval.registration?.registeredPerson || "Staff";
      const oldInvoiceNumber = approval.trackingNumber || approval.referenceNumber || approval.registration?.trackingNumber || "";
      const oldRemarks = approval.remarks || approval.registration?.paymentDescription || approval.auditLogs?.[0]?.remarks || "";
      const oldProofFileId = approval.receiptFileId || approval.bankProofFileId || null;
      const oldProofFileUrl = approval.receiptFileUrl || (oldProofFileId ? `/api/files/${oldProofFileId}/view` : null) || approval.bankProofFileUrl || null;
      const oldProofFileName = approval.receiptFileName || approval.bankProofFileName || "Proof Document";

      const approvalRequest = await createAccountApprovalRequest({
        ownerAdminId,
        targetId: cleanId,
        sourceType: "ADVANCE_PAYMENT",
        userId: session.user.id,
        userName: session.user.name || session.user.email || "User",
        office,
        customerName: approval.customerName || approval.registration?.customerName || null,
        trackingNumber: approval.trackingNumber || approval.registration?.trackingNumber || null,
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
        newAmount: newAmount > 0 ? newAmount : oldAmount,
        newDate: newDate || oldDate,
        newPaymentMode: newPaymentMode ?? oldPaymentMode,
        newBankName: newBankName !== undefined ? newBankName : oldBankName,
        newCollectedBy: newCollectedBy !== undefined ? newCollectedBy : oldCollectedBy,
        newInvoiceNumber: newInvoiceNumber !== undefined ? newInvoiceNumber : oldInvoiceNumber,
        newRemarks: newRemarks !== undefined ? newRemarks : oldRemarks,
        newProofFileId: newProofFileId !== undefined ? newProofFileId : oldProofFileId,
        newProofFileUrl: newProofFileUrl !== undefined ? newProofFileUrl : oldProofFileUrl,
        newProofFileName: newProofFileName !== undefined ? newProofFileName : oldProofFileName,
      });

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: "Transaction edit submitted for approval.",
        item: approvalRequest,
      });
    } else if (sourceType === "ACCOUNT_PANEL") {
      const transaction = await (prisma as any).accountPanelTransaction.findFirst({
        where: { id: cleanId, ownerAdminId },
        include: { account: true },
      });

      if (!transaction) {
        return NextResponse.json({ error: "Account panel transaction not found." }, { status: 404 });
      }

      if (!isSuperAdmin) {
        if (!hasOfficeAccess(session.user, transaction.officeId, "account_statements")) {
          return NextResponse.json(
            { error: "You are not authorized to edit records for this office." },
            { status: 403 }
          );
        }
      }

      // Resolve office name if officeId exists
      let officeName: string | null = null;
      if (transaction.officeId) {
        const offLoc = await (prisma as any).officeLocation.findFirst({
          where: { id: transaction.officeId },
          select: { officeName: true },
        });
        officeName = offLoc?.officeName || transaction.officeId;
      }

      const oldAmount = Number(transaction.amount ?? 0);
      const oldDate = transaction.transactionDate || transaction.createdAt;
      const oldPaymentMode = transaction.account?.name || "Account Voucher";
      const oldBankName = null;
      const oldCollectedBy = transaction.createdByName || "System";
      const oldInvoiceNumber = transaction.invoiceNumber || "";
      const oldRemarks = transaction.narration || "";
      const oldProofFileId = transaction.billAttachment || null;
      const oldProofFileUrl = transaction.billAttachment
        ? transaction.billAttachment.startsWith("/") || transaction.billAttachment.startsWith("http")
          ? transaction.billAttachment
          : `/api/files/${transaction.billAttachment}/view`
        : null;
      const oldProofFileName = transaction.billAttachment || "Bill Attachment";

      const approvalRequest = await createAccountApprovalRequest({
        ownerAdminId,
        targetId: cleanId,
        sourceType: "ACCOUNT_PANEL",
        userId: session.user.id,
        userName: session.user.name || session.user.email || "User",
        office: officeName,
        officeId: transaction.officeId || null,
        customerName: transaction.account?.name || null,
        trackingNumber: transaction.invoiceNumber || null,
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
        newAmount: newAmount > 0 ? newAmount : oldAmount,
        newDate: newDate || oldDate,
        newPaymentMode: newPaymentMode ?? oldPaymentMode,
        newBankName: newBankName !== undefined ? newBankName : oldBankName,
        newCollectedBy: newCollectedBy !== undefined ? newCollectedBy : oldCollectedBy,
        newInvoiceNumber: newInvoiceNumber !== undefined ? newInvoiceNumber : oldInvoiceNumber,
        newRemarks: newRemarks !== undefined ? newRemarks : oldRemarks,
        newProofFileId: newProofFileId !== undefined ? newProofFileId : oldProofFileId,
        newProofFileUrl: newProofFileUrl !== undefined ? newProofFileUrl : oldProofFileUrl,
        newProofFileName: newProofFileName !== undefined ? newProofFileName : oldProofFileName,
      });

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: "Transaction edit submitted for approval.",
        item: approvalRequest,
      });
    } else {
      // Fallback: check AdvancePaymentApproval then AccountPanelTransaction
      const approval = await prisma.advancePaymentApproval.findFirst({
        where: { id: cleanId, ownerAdminId },
        include: { registration: true },
      });

      if (approval) {
        const office = approval.office || approval.registration?.regionOfRegistration;
        if (!isSuperAdmin) {
          if (!hasOfficeAccess(session.user, office, "account_statements")) {
            return NextResponse.json(
              { error: "You are not authorized to edit records for this office." },
              { status: 403 }
            );
          }
        }

        const oldAmount = Number(approval.advanceAmount ?? 0);
        const oldDate = approval.paymentDate || approval.requestedAt || approval.createdAt;
        const oldPaymentMode = approval.paymentMode || approval.registration?.paymentMode || "Cash";
        const oldBankName = approval.registration?.bankName || null;
        const oldCollectedBy = approval.collectedBy || approval.requestedByName || "Staff";
        const oldInvoiceNumber = approval.trackingNumber || approval.referenceNumber || "";
        const oldRemarks = approval.remarks || "";
        const oldProofFileId = approval.receiptFileId || approval.bankProofFileId || null;
        const oldProofFileUrl = approval.receiptFileUrl || (oldProofFileId ? `/api/files/${oldProofFileId}/view` : null) || approval.bankProofFileUrl || null;
        const oldProofFileName = approval.receiptFileName || approval.bankProofFileName || "Proof Document";

        const approvalRequest = await createAccountApprovalRequest({
          ownerAdminId,
          targetId: cleanId,
          sourceType: "ADVANCE_PAYMENT",
          userId: session.user.id,
          userName: session.user.name || session.user.email || "User",
          office,
          customerName: approval.customerName || null,
          trackingNumber: approval.trackingNumber || null,
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
          newAmount: newAmount > 0 ? newAmount : oldAmount,
          newDate: newDate || oldDate,
          newPaymentMode: newPaymentMode ?? oldPaymentMode,
          newBankName: newBankName !== undefined ? newBankName : oldBankName,
          newCollectedBy: newCollectedBy !== undefined ? newCollectedBy : oldCollectedBy,
          newInvoiceNumber: newInvoiceNumber !== undefined ? newInvoiceNumber : oldInvoiceNumber,
          newRemarks: newRemarks !== undefined ? newRemarks : oldRemarks,
          newProofFileId: newProofFileId !== undefined ? newProofFileId : oldProofFileId,
          newProofFileUrl: newProofFileUrl !== undefined ? newProofFileUrl : oldProofFileUrl,
          newProofFileName: newProofFileName !== undefined ? newProofFileName : oldProofFileName,
        });

        return NextResponse.json({
          success: true,
          pendingApproval: true,
          message: "Transaction edit submitted for approval.",
          item: approvalRequest,
        });
      } else {
        const transaction = await (prisma as any).accountPanelTransaction.findFirst({
          where: { id: cleanId, ownerAdminId },
        });

        if (!transaction) {
          return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
        }

        if (!isSuperAdmin) {
          if (!hasOfficeAccess(session.user, transaction.officeId, "account_statements")) {
            return NextResponse.json(
              { error: "You are not authorized to edit records for this office." },
              { status: 403 }
            );
          }
        }

        const oldAmount = Number(transaction.amount ?? 0);
        const oldDate = transaction.transactionDate || transaction.createdAt;
        const oldPaymentMode = "Account Voucher";
        const oldBankName = null;
        const oldCollectedBy = transaction.createdByName || "System";
        const oldInvoiceNumber = transaction.invoiceNumber || "";
        const oldRemarks = transaction.narration || "";
        const oldProofFileId = transaction.billAttachment || null;
        const oldProofFileUrl = transaction.billAttachment
          ? transaction.billAttachment.startsWith("/") || transaction.billAttachment.startsWith("http")
            ? transaction.billAttachment
            : `/api/files/${transaction.billAttachment}/view`
          : null;
        const oldProofFileName = transaction.billAttachment || "Bill Attachment";

        const approvalRequest = await createAccountApprovalRequest({
          ownerAdminId,
          targetId: cleanId,
          sourceType: "ACCOUNT_PANEL",
          userId: session.user.id,
          userName: session.user.name || session.user.email || "User",
          office: transaction.officeId || null,
          customerName: null,
          trackingNumber: transaction.invoiceNumber || null,
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
          newAmount: newAmount > 0 ? newAmount : oldAmount,
          newDate: newDate || oldDate,
          newPaymentMode: newPaymentMode ?? oldPaymentMode,
          newBankName: newBankName !== undefined ? newBankName : oldBankName,
          newCollectedBy: newCollectedBy !== undefined ? newCollectedBy : oldCollectedBy,
          newInvoiceNumber: newInvoiceNumber !== undefined ? newInvoiceNumber : oldInvoiceNumber,
          newRemarks: newRemarks !== undefined ? newRemarks : oldRemarks,
          newProofFileId: newProofFileId !== undefined ? newProofFileId : oldProofFileId,
          newProofFileUrl: newProofFileUrl !== undefined ? newProofFileUrl : oldProofFileUrl,
          newProofFileName: newProofFileName !== undefined ? newProofFileName : oldProofFileName,
        });

        return NextResponse.json({
          success: true,
          pendingApproval: true,
          message: "Transaction edit submitted for approval.",
          item: approvalRequest,
        });
      }
    }
  } catch (error: any) {
    console.error("[PUT /api/account-statements/[id]] Error:", error);
    const isAuthErr = error?.message?.includes("not authorized");
    return NextResponse.json(
      { error: error?.message || "Failed to submit statement transaction edit for approval." },
      { status: isAuthErr ? 403 : 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiPermission("account_statements.delete");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("sourceType");

    const cleanId = id.startsWith("debit_adv_") ? id.replace("debit_adv_", "") : id;
    const isSuperAdmin = Boolean(session.user.isSuperAdmin);

    if (sourceType === "ADVANCE_PAYMENT" || id.startsWith("debit_adv_")) {
      if (!isSuperAdmin) {
        const approval = await prisma.advancePaymentApproval.findFirst({
          where: { id: cleanId, ownerAdminId },
          include: { registration: true },
        });
        if (!approval) {
          return NextResponse.json({ error: "Advance payment transaction not found." }, { status: 404 });
        }
        const office = approval.office || approval.registration?.regionOfRegistration;
        if (!hasOfficeAccess(session.user, office, "account_statements")) {
          return NextResponse.json(
            { error: "You are not authorized to delete records for this office." },
            { status: 403 }
          );
        }
      }

      const res = await deleteAdvancePaymentApproval({
        ownerAdminId,
        approvalId: cleanId,
        performedByUserId: session.user.id,
      });
      return NextResponse.json(res);
    } else if (sourceType === "ACCOUNT_PANEL") {
      if (!isSuperAdmin) {
        const transaction = await (prisma as any).accountPanelTransaction.findFirst({
          where: { id: cleanId, ownerAdminId },
        });
        if (!transaction) {
          return NextResponse.json({ error: "Account panel transaction not found." }, { status: 404 });
        }
        if (!hasOfficeAccess(session.user, transaction.officeId, "account_statements")) {
          return NextResponse.json(
            { error: "You are not authorized to delete records for this office." },
            { status: 403 }
          );
        }
      }

      const res = await deleteAccountPanelTransaction(ownerAdminId, cleanId);
      return NextResponse.json(res);
    } else {
      const approval = await prisma.advancePaymentApproval.findFirst({
        where: { id: cleanId, ownerAdminId },
        include: { registration: true },
      });

      if (approval) {
        if (!isSuperAdmin) {
          const office = approval.office || approval.registration?.regionOfRegistration;
          if (!hasOfficeAccess(session.user, office, "account_statements")) {
            return NextResponse.json(
              { error: "You are not authorized to delete records for this office." },
              { status: 403 }
            );
          }
        }

        const res = await deleteAdvancePaymentApproval({
          ownerAdminId,
          approvalId: cleanId,
          performedByUserId: session.user.id,
        });
        return NextResponse.json(res);
      } else {
        const transaction = await (prisma as any).accountPanelTransaction.findFirst({
          where: { id: cleanId, ownerAdminId },
        });
        if (!transaction) {
          return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
        }

        if (!isSuperAdmin) {
          if (!hasOfficeAccess(session.user, transaction.officeId, "account_statements")) {
            return NextResponse.json(
              { error: "You are not authorized to delete records for this office." },
              { status: 403 }
            );
          }
        }

        const res = await deleteAccountPanelTransaction(ownerAdminId, cleanId);
        return NextResponse.json(res);
      }
    }
  } catch (error: any) {
    console.error("[DELETE /api/account-statements/[id]] Error:", error);
    const isAuthErr = error?.message?.includes("not authorized");
    return NextResponse.json(
      { error: error?.message || "Failed to delete statement transaction." },
      { status: isAuthErr ? 403 : 400 }
    );
  }
}
