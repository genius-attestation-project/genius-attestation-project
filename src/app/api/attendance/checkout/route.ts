import { auth } from "@/lib/auth";
import { checkOut } from "@/features/attendance/server/attendance.service";
import { checkoutSchema } from "@/features/attendance/validations/attendance.schema";

export async function POST(req: Request) {
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

  try {
    const record = await checkOut(session.user.id, parsed.data);
    return Response.json({ record });
  } catch (err: any) {
    return Response.json({ message: err.message ?? "Check-out failed." }, { status: 400 });
  }
}
