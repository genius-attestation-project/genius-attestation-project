import { NextResponse } from "next/server";

import { getAdvancePaymentHistory } from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json({ error: "registrationId is required." }, { status: 400 });
    }

    const history = await getAdvancePaymentHistory(session.user.ownerAdminId, registrationId);
    return NextResponse.json({ items: history });
  } catch (error: any) {
    console.error("[GET /api/advance-payment-approvals/history] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch advance payment history." },
      { status: 500 },
    );
  }
}
