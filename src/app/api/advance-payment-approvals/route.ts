import { NextResponse } from "next/server";

import {
  listAdvancePaymentApprovals,
  submitAdvancePaymentApproval,
} from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canUserAddAdvance,
  getSessionAccess,
  hasPermission,
} from "@/features/admin/server/rbac.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !session.user.isSuperAdmin &&
      !hasPermission(session.user, "advance_payment_approval.view") &&
      !hasPermission(session.user, "advance_details_approval.view")
    ) {
      return NextResponse.json({ error: "Forbidden. Access to advance payment approvals denied." }, { status: 403 });
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
    let allowedOfficeIds = session.user.allowedOfficeIds;
    let allowedOfficeNames = session.user.allowedOfficeNames;

    if (!session.user.isSuperAdmin && session.user.moduleOfficeVisibilities?.["pending_approval"]) {
      const modConfig = session.user.moduleOfficeVisibilities["pending_approval"];
      allowedOfficeIds = modConfig.officeIds;
      allowedOfficeNames = modConfig.officeNames;
    }

    const result = await listAdvancePaymentApprovals(session.user.ownerAdminId, {
      status,
      office,
      fromDate,
      toDate,
      search,
      registrationId,
      page,
      pageSize,
      isSuperAdmin: session.user.isSuperAdmin,
      allowedOfficeIds,
      allowedOfficeNames,
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

    const registrationId = (body.registrationId || body.revenueRegistrationId || body.id || body.trackingNumber || "").toString().trim();
    if (!registrationId) {
      return NextResponse.json({ error: "Registration ID is required." }, { status: 400 });
    }

    // 1. Fetch registration record with regionOfRegistrationId & regionOfRegistration
    const registration = await prisma.registration.findFirst({
      where: {
        ownerAdminId: session.user.ownerAdminId,
        OR: [
          { id: registrationId },
          { trackingNumber: registrationId },
        ],
      },
      select: {
        id: true,
        regionOfRegistration: true,
        regionOfRegistrationId: true,
      },
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration record not found." }, { status: 404 });
    }

    // 2. Check authorization via canUserAddAdvance
    const access = (await getSessionAccess(session.user.id)) || session.user;
    if (!canUserAddAdvance(access, registration)) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to add advance for documents registered in this office." },
        { status: 403 },
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const advanceAmount = Number(body.advanceAmount ?? body.amount ?? 0);
    const receiptFileId = body.receiptFileId || body.proofFileId || (Array.isArray(body.proofFiles) ? body.proofFiles[0] : null) || null;

    const approval = await submitAdvancePaymentApproval({
      ownerAdminId: session.user.ownerAdminId,
      registrationId: registration.id,
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
      bankName: body.bankName || null,
      transactionRefNo: body.transactionRefNo || null,
      transferDate: body.transferDate || null,
      upiTransactionId: body.upiTransactionId || null,
      chequeNumber: body.chequeNumber || null,
      chequeDate: body.chequeDate || null,
      ddNumber: body.ddNumber || null,
      ddDate: body.ddDate || null,
      cardLast4: body.cardLast4 || null,
      approvalCode: body.approvalCode || null,
      paymentGateway: body.paymentGateway || null,
      onlineTransactionId: body.onlineTransactionId || null,
      walletName: body.walletName || null,
      walletTransactionId: body.walletTransactionId || null,
      paymentReferenceNo: body.paymentReferenceNo || null,
      paymentDescription: body.paymentDescription || null,
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
