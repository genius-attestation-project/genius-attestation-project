import { NextResponse } from "next/server";

import { listAdvancePaymentApprovals } from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const result = await listAdvancePaymentApprovals(session.user.ownerAdminId, {
      status,
      search,
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
