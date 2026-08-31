import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import {
  getAccountTree,
  createAccountNode,
} from "@/features/account-menu/server/account-menu.service";
import { accountNodeCreateSchema } from "@/features/account-menu/validations/account-menu.schema";

export async function GET(request: NextRequest) {
  const authError = await requireApiPermission("account_menu.view");
  if (authError) return authError;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const tree = await getAccountTree(ownerAdminId);
    return jsonOk({ tree });
  } catch (error: any) {
    console.error("Failed to fetch account tree:", error);
    return jsonError(error.message || "Unable to fetch account tree.", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireApiPermission("account_menu.create");
  if (authError) return authError;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = accountNodeCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    const node = await createAccountNode(
      ownerAdminId,
      session?.user?.id,
      session?.user?.name || session?.user?.email || "User",
      parsed.data
    );

    return jsonOk({ node }, 201);
  } catch (error: any) {
    if (error.message && error.message.includes("already exists")) {
      return jsonError(error.message, 409);
    }
    console.error("Failed to create account node:", error);
    return jsonError(error.message || "Unable to create account node.", 500);
  }
}
