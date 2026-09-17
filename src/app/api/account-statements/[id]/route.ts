import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { prisma } from "@/lib/prisma";
import {
  updateAdvancePaymentApproval,
  deleteAdvancePaymentApproval,
} from "@/features/revenue/server/advance-payment-approval.service";
import {
  updateAccountPanelTransaction,
  deleteAccountPanelTransaction,
} from "@/features/account-panel/server/account-panel-transaction.service";

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

    if (sourceType === "ADVANCE_PAYMENT") {
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
            { error: "You are not authorized to edit records for this office." },
            { status: 403 }
          );
        }
      }

      const updated = await updateAdvancePaymentApproval({
        ownerAdminId,
        approvalId: cleanId,
        performedByUserId: session.user.id,
        advanceAmount: body.advanceAmount ?? body.amount,
        paymentDate: body.paymentDate ?? body.transactionDate,
        paymentMode: body.paymentMode,
        referenceNumber: body.referenceNumber ?? body.invoiceNumber,
        collectedBy: body.collectedBy,
        remarks: body.narration ?? body.remarks,
        bankProofFileId: body.bankProofFileId,
      });
      return NextResponse.json({ success: true, item: updated });
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
            { error: "You are not authorized to edit records for this office." },
            { status: 403 }
          );
        }
      }

      const updated = await updateAccountPanelTransaction(ownerAdminId, cleanId, {
        amount: body.amount ?? body.advanceAmount,
        transactionDate: body.transactionDate ?? body.paymentDate,
        invoiceNumber: body.invoiceNumber ?? body.referenceNumber,
        narration: body.narration ?? body.remarks,
        billAttachment: body.billAttachment,
      });
      return NextResponse.json({ success: true, item: updated });
    } else {
      // Attempt advance payment update first, fallback to account panel
      const approval = await prisma.advancePaymentApproval.findFirst({
        where: { id: cleanId, ownerAdminId },
        include: { registration: true },
      });

      if (approval) {
        if (!isSuperAdmin) {
          const office = approval.office || approval.registration?.regionOfRegistration;
          if (!hasOfficeAccess(session.user, office, "account_statements")) {
            return NextResponse.json(
              { error: "You are not authorized to edit records for this office." },
              { status: 403 }
            );
          }
        }

        const updated = await updateAdvancePaymentApproval({
          ownerAdminId,
          approvalId: cleanId,
          performedByUserId: session.user.id,
          advanceAmount: body.advanceAmount ?? body.amount,
          paymentDate: body.paymentDate ?? body.transactionDate,
          paymentMode: body.paymentMode,
          referenceNumber: body.referenceNumber ?? body.invoiceNumber,
          collectedBy: body.collectedBy,
          remarks: body.narration ?? body.remarks,
          bankProofFileId: body.bankProofFileId,
        });
        return NextResponse.json({ success: true, item: updated });
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

        const updated = await updateAccountPanelTransaction(ownerAdminId, cleanId, {
          amount: body.amount ?? body.advanceAmount,
          transactionDate: body.transactionDate ?? body.paymentDate,
          invoiceNumber: body.invoiceNumber ?? body.referenceNumber,
          narration: body.narration ?? body.remarks,
          billAttachment: body.billAttachment,
        });
        return NextResponse.json({ success: true, item: updated });
      }
    }
  } catch (error: any) {
    console.error("[PUT /api/account-statements/[id]] Error:", error);
    const isAuthErr = error?.message?.includes("not authorized");
    return NextResponse.json(
      { error: error?.message || "Failed to update statement transaction." },
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

