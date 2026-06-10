import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { getAccountStatement } from "@/features/account-update/server/account-update.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  const denied = await requireApiPermission("account_update.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { searchParams } = new URL(request.url);
    const data = await getAccountStatement(ownerAdminId, searchParams.get("search") ?? undefined);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch account statement", error);
    return jsonError("Unable to fetch account statement.", 500);
  }
}
