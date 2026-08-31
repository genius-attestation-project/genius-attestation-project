import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { getAccountNodeAuditLogs } from "@/features/account-menu/server/account-menu.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireApiPermission("account_menu.view");
  if (authError) return authError;

  try {
    const { id } = await params;
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const logs = await getAccountNodeAuditLogs(ownerAdminId, id);
    return jsonOk({ logs });
  } catch (error: any) {
    console.error("Failed to fetch node audit logs:", error);
    return jsonError(error.message || "Unable to fetch audit logs.", 500);
  }
}
