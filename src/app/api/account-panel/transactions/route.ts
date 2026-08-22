import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { createAccountPanelTransactionSchema } from "@/features/account-panel/validations/account-panel-transaction.schema";
import {
  createAccountPanelTransaction,
  getAccountTransactions,
} from "@/features/account-panel/server/account-panel-transaction.service";
import { resolveOfficeLocationId } from "@/lib/office-location";

export async function POST(request: NextRequest) {
  // Authorization: require account_panel.create OR account_panel.view permission
  const authError = await requireApiPermission("account_panel.create");
  const session = await auth();

  if (authError && !session?.user) {
    return authError;
  }

  try {
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json();

    // Validate payload
    const parsed = createAccountPanelTransactionSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(errorMsg || "Invalid transaction input.", 400);
    }

    // Resolve user office location
    const officeId =
      parsed.data.officeId ||
      (await resolveOfficeLocationId({
        ownerAdminId,
        userId: session?.user?.id,
        officeLocationId: session?.user?.officeLocationId,
        officeLocationName: session?.user?.officeLocationName,
      }));

    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email || undefined;

    const transaction = await createAccountPanelTransaction(
      ownerAdminId,
      userId,
      userName,
      {
        ...parsed.data,
        officeId,
      }
    );

    return jsonOk(
      {
        success: true,
        transaction,
        message: "Transaction created successfully.",
      },
      201
    );
  } catch (error: any) {
    console.error("Failed to create account panel transaction:", error);
    return jsonError(error.message || "Unable to save transaction.", 400);
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireApiPermission("account_panel.view");
  const session = await auth();

  if (authError && !session?.user) {
    return authError;
  }

  try {
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return jsonError("Account ID query parameter is required.", 400);
    }

    const transactions = await getAccountTransactions(ownerAdminId, accountId);
    return jsonOk({ transactions });
  } catch (error: any) {
    console.error("Failed to fetch account transactions:", error);
    return jsonError(error.message || "Unable to fetch transactions.", 500);
  }
}
