import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rejectMovementApproval } from "@/features/document-movement/server/movement-approval.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized.", 401);
    }

    const { id } = await params;
    if (!id) {
      return jsonError("Movement approval ID is required.", 400);
    }

    const body = await request.json().catch(() => ({}));
    const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason : undefined;

    const item = await rejectMovementApproval({
      id,
      ownerAdminId,
      rejectedByUserId: session.user.id,
      rejectedByName: session.user.name ?? session.user.email ?? "Admin User",
      rejectionReason,
    });

    return jsonOk({ success: true, item });
  } catch (error: any) {
    console.error("Failed to reject movement request:", error);
    return jsonError(error.message || "Failed to reject movement request.", 500);
  }
}
