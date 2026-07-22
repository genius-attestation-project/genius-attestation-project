import { NextResponse, NextRequest } from "next/server";

import { requireApiAuth } from "@/middleware/auth.middleware";
import { rejectBmExtension } from "@/features/bm-report/server/bm-lock.service";

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiAuth();
    const body = await req.json();

    const registrationId = body.registrationId as string;

    if (!registrationId) {
      return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    }

    const result = await rejectBmExtension({
      registrationId,
      ownerAdminId: session.user.ownerAdminId ?? session.user.id,
      rejectedByUserId: session.user.id,
    });

    return NextResponse.json({ message: "Extension rejected successfully.", registration: result });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to reject extension." },
      { status: 500 },
    );
  }
}
