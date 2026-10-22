import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { getAccountTransactions } from "@/features/account-panel/server/account-panel-transaction.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const authError = await requireApiPermission("account_panel.view");
  if (authError) return authError;

  const session = await auth();

  try {
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { accountId } = await params;
    if (!accountId) {
      return jsonError("Account ID is required.", 400);
    }

    const { searchParams } = new URL(request.url);
    const officeId = searchParams.get("officeId") || undefined;

    const transactions = await getAccountTransactions(ownerAdminId, accountId, officeId);
    return jsonOk({ transactions });
  } catch (error: any) {
    console.error("Failed to fetch transactions for account:", error);
    return jsonError(error.message || "Unable to fetch transactions.", 500);
  }
}
