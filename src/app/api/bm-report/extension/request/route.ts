import { NextResponse } from "next/server";

import { requireApiAuth } from "@/features/auth/server/auth.service";
import { requestBmExtension } from "@/features/bm-report/server/bm-lock.service";

export async function POST(req: Request) {
  try {
    const session = await requireApiAuth();
    const body = await req.json();

    const registrationId = body.registrationId as string;
    const reason = body.reason as string;

    if (!registrationId || !reason) {
      return NextResponse.json({ message: "Registration ID and reason are required." }, { status: 400 });
    }

    const result = await requestBmExtension({
      registrationId,
      ownerAdminId: session.user.ownerAdminId,
      reason,
      requestedByUserId: session.user.id,
    });

    return NextResponse.json({ message: "Extension requested successfully.", registration: result });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to request extension." },
      { status: 500 },
    );
  }
}
