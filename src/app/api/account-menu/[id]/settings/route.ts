import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { updateAccountNodeSettings } from "@/features/account-menu/server/account-menu.service";
import { accountNodeSettingsSchema } from "@/features/account-menu/validations/account-menu.schema";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireApiPermission("account_menu.settings");
  if (authError) return authError;

  try {
    const { id } = await params;
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = accountNodeSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid settings payload.");
    }

    const updatedNode = await updateAccountNodeSettings(
      ownerAdminId,
      session?.user?.id,
      session?.user?.name || session?.user?.email || "User",
      id,
      parsed.data
    );

    return jsonOk({ node: updatedNode });
  } catch (error: any) {
    if (error.message && error.message.includes("leaf nodes")) {
      return jsonError(error.message, 400);
    }
    console.error("Failed to update account node settings:", error);
    return jsonError(error.message || "Unable to update node settings.", 500);
  }
}
