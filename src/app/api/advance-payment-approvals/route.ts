import { NextResponse } from "next/server";

import {
  listAdvancePaymentApprovals,
  submitAdvancePaymentApproval,
} from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const office = searchParams.get("office") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const search = searchParams.get("search") || undefined;
    const registrationId = searchParams.get("registrationId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "100", 10);

    const result = await listAdvancePaymentApprovals(session.user.ownerAdminId, {
      status,
      office,
      fromDate,
      toDate,
      search,
      registrationId,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/advance-payment-approvals] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list advance payment approvals." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    console.log("[Backend POST /api/advance-payment-approvals] Received request body:", body);

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const registrationId = (body.registrationId || body.revenueRegistrationId || body.id || body.trackingNumber || "").toString().trim();
    const advanceAmount = Number(body.advanceAmount ?? body.amount ?? 0);
    const receiptFileId = body.receiptFileId || body.proofFileId || (Array.isArray(body.proofFiles) ? body.proofFiles[0] : null) || null;

    const approval = await submitAdvancePaymentApproval({
      ownerAdminId: session.user.ownerAdminId,
      registrationId,
      advanceAmount,
      paymentDate: body.paymentDate,
      paymentMode: body.paymentMode,
      referenceNumber: body.referenceNumber || null,
      collectedBy: body.collectedBy || null,
      remarks: body.remarks || null,
      proofFileType: body.proofFileType || null,
      receiptFileId,
      performedByUserId: session.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, item: approval });
  } catch (error: any) {
    console.error("[Backend POST /api/advance-payment-approvals] Validation / Error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit advance payment request." },
      { status: 400 },
    );
  }
}
