import { auth } from "@/lib/auth";
import { cancelLeaveRequest } from "@/features/leave/server/leave.service";
import { leaveCancelSchema } from "@/features/leave/validations/leave.schema";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);

    const body = await request.json().catch(() => null);
    const parsed = leaveCancelSchema.safeParse(body ?? {});
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid cancel payload.");

    const { id } = await params;
    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const row = await cancelLeaveRequest({
      leaveId: id,
      ownerAdminId,
      userId: session.user.id,
      note: parsed.data.note,
    });

    return jsonOk({ row });
  } catch (error) {
    console.error("[api/leaves/:id/cancel] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to cancel leave.", 500);
  }
}
