import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import {
  createPaymentUpdate,
  getPaymentUpdates,
} from "@/features/account-update/server/account-update.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("account_update.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const data = await getPaymentUpdates(ownerAdminId);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch payment update queue", error);
    return jsonError("Unable to fetch payment update queue.", 500);
  }
}

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
    await createPaymentUpdate({
      ownerAdminId,
      trackingNumber: String(formData.get("trackingNumber") ?? ""),
      paymentMode: String(formData.get("paymentMode") ?? "") as "Cash" | "Online" | "Cheque",
      amountPaid: formData.get("amountPaid"),
      invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
      paymentDate: formData.get("paymentDate"),
      receiptFile: await readUpload(formData, "receiptFile"),
      submittedBy: session?.user?.name ?? session?.user?.email ?? undefined,
    });

    return jsonOk({ message: "Payment submitted for admin approval." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit payment update.";
    console.error("Failed to create payment update", error);
    return jsonError(message, 400);
  }
}
