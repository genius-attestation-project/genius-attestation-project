import { auth } from "@/lib/auth";
import { checkIn } from "@/features/attendance/server/attendance.service";
import { checkinSchema } from "@/features/attendance/validations/attendance.schema";

export async function POST(req: Request) {
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

  try {
    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const record = await checkIn(session.user.id, ownerAdminId, parsed.data);
    return Response.json({ record }, { status: 201 });
  } catch (err: any) {
    return Response.json({ message: err.message ?? "Check-in failed." }, { status: 400 });
  }
}
