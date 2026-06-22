import { NextResponse } from "next/server";

import { requireApiAuth } from "@/features/auth/server/auth.service";
import { rejectBmExtension } from "@/features/bm-report/server/bm-lock.service";

export async function POST(req: Request) {
  try {
    const session = await requireApiAuth();
    const body = await req.json();

    const registrationId = body.registrationId as string;

    if (!registrationId) {
      return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    }

    const result = await rejectBmExtension({
      registrationId,
      ownerAdminId: session.user.ownerAdminId,
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
