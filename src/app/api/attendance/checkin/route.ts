import { auth } from "@/lib/auth";
import { checkIn } from "@/features/attendance/server/attendance.service";
import { checkinSchema } from "@/features/attendance/validations/attendance.schema";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = checkinSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const record = await checkIn(session.user.id, ownerAdminId, parsed.data);
    return Response.json({ record }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Check-in failed.";
    console.error("[api/attendance/checkin] Error:", err);
    const status =
      message.includes("not set up") || message.includes("migrations") ? 503 : 500;
    return Response.json({ message }, { status });
  }
}
