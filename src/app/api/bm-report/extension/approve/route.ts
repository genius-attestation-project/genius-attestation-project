import { NextResponse } from "next/server";

import { requireApiAuth } from "@/features/auth/server/auth.service";
import { approveBmExtension } from "@/features/bm-report/server/bm-lock.service";

export async function POST(req: Request) {
  try {
    const session = await requireApiAuth();
    const body = await req.json();

    const registrationId = body.registrationId as string;

    if (!registrationId) {
      return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    }

    const result = await approveBmExtension({
      registrationId,
      ownerAdminId: session.user.ownerAdminId,
      approvedByUserId: session.user.id,
    });

    return NextResponse.json({ message: "Extension approved successfully.", registration: result });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to approve extension." },
      { status: 500 },
    );
  }
}
