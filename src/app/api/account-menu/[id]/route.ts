import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import {
  updateAccountNode,
  deleteAccountNode,
} from "@/features/account-menu/server/account-menu.service";
import { accountNodeUpdateSchema } from "@/features/account-menu/validations/account-menu.schema";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireApiPermission("account_menu.update");
  if (authError) return authError;

  try {
    const { id } = await params;
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = accountNodeUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    const node = await updateAccountNode(
      ownerAdminId,
      session?.user?.id,
      session?.user?.name || session?.user?.email || "User",
      id,
      parsed.data
    );

    return jsonOk({ node });
  } catch (error: any) {
    if (error.message && error.message.includes("already exists")) {
      return jsonError(error.message, 409);
    }
    console.error("Failed to update account node:", error);
    return jsonError(error.message || "Unable to update account node.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireApiPermission("account_menu.delete");
  if (authError) return authError;

  try {
    const { id } = await params;
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    await deleteAccountNode(
      ownerAdminId,
      session?.user?.id,
      session?.user?.name || session?.user?.email || "User",
      id
    );

    return jsonOk({ success: true });
  } catch (error: any) {
    if (error.message && error.message.includes("contains")) {
      return jsonError(error.message, 400);
    }
    console.error("Failed to delete account node:", error);
    return jsonError(error.message || "Unable to delete account node.", 500);
  }
}
