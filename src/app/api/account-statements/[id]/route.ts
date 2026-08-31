import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    if (sourceType === "ADVANCE_PAYMENT") {
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
      try {
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
      } catch (advErr: any) {
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
    return NextResponse.json(
      { error: error?.message || "Failed to update statement transaction." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (sourceType === "ADVANCE_PAYMENT" || id.startsWith("debit_adv_")) {
      const res = await deleteAdvancePaymentApproval({
        ownerAdminId,
        approvalId: cleanId,
        performedByUserId: session.user.id,
      });
      return NextResponse.json(res);
    } else if (sourceType === "ACCOUNT_PANEL") {
      const res = await deleteAccountPanelTransaction(ownerAdminId, cleanId);
      return NextResponse.json(res);
    } else {
      try {
        const res = await deleteAdvancePaymentApproval({
          ownerAdminId,
          approvalId: cleanId,
          performedByUserId: session.user.id,
        });
        return NextResponse.json(res);
      } catch (advErr) {
        const res = await deleteAccountPanelTransaction(ownerAdminId, cleanId);
        return NextResponse.json(res);
      }
    }
  } catch (error: any) {
    console.error("[DELETE /api/account-statements/[id]] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete statement transaction." },
      { status: 400 }
    );
  }
}
