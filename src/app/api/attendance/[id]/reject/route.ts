import { auth } from "@/lib/auth";
import { rejectAttendance } from "@/features/attendance/server/attendance.service";
import { rejectSchema } from "@/features/attendance/validations/attendance.schema";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const canApprove =
    session.user.isSuperAdmin || hasPermission(session.user, "attendance_approval.view");

  if (!canApprove) {
    return Response.json({ message: "Access denied." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = rejectSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  try {
    const record = await rejectAttendance(id, ownerAdminId, parsed.data.rejectionReason);
    return Response.json({ record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Rejection failed.";
    console.error("[api/attendance/reject] Error:", err);
    return Response.json({ message }, { status: 500 });
  }
}
