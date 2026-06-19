import { auth } from "@/lib/auth";
import { checkOut } from "@/features/attendance/server/attendance.service";
import { checkoutSchema } from "@/features/attendance/validations/attendance.schema";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }

    const record = await checkOut(session.user.id, parsed.data);
    return Response.json({ record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Check-out failed.";
    console.error("[api/attendance/checkout] Error:", err);
    const status = message.includes("check in first")
      ? 400
      : message.includes("not set up") || message.includes("migrations")
        ? 503
        : 500;
    return Response.json({ message }, { status });
  }
}
