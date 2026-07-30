import { NextResponse } from "next/server";

import { getAdvancePaymentStats } from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getAdvancePaymentStats(session.user.ownerAdminId);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[GET /api/advance-payment-approvals/stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch advance payment stats." },
      { status: 500 },
    );
  }
}
