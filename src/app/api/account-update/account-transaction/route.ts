import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import {
  createAccountTransaction,
  getAccountTransactions,
} from "@/features/account-update/server/account-update.service";
import { jsonError, jsonOk } from "@/utils/response";

async function readUpload(formData: FormData, fieldName: string) {
  const file = formData.get(fieldName);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return {
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    fileData: new Uint8Array(await file.arrayBuffer()),
  };
}

export async function GET() {
  const denied = await requireApiPermission("account_update.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const data = await getAccountTransactions(ownerAdminId);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch account transactions", error);
    return jsonError("Unable to fetch account transactions.", 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireApiPermission("account_update.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const formData = await request.formData();
    await createAccountTransaction({
      ownerAdminId,
      transactionType: String(formData.get("transactionType") ?? "") as "Cash" | "UPI" | "Cheque",
      category: String(formData.get("category") ?? ""),
      amount: formData.get("amount"),
      date: formData.get("date"),
      description: String(formData.get("description") ?? ""),
      billFile: await readUpload(formData, "billFile"),
      createdBy: session?.user?.name ?? session?.user?.email ?? undefined,
    });

    return jsonOk({ message: "Transaction saved successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save account transaction.";
    console.error("Failed to create account transaction", error);
    return jsonError(message, 400);
  }
}
