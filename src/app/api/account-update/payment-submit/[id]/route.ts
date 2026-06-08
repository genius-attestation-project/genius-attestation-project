import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { submitPaymentUpdate } from "@/features/account-update/server/account-update.service";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const denied = await requireApiPermission("account_update.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { id } = await params;
    await submitPaymentUpdate(
      ownerAdminId,
      id,
      session?.user?.name ?? session?.user?.email ?? undefined,
    );

    return jsonOk({ message: "Payment submitted successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit payment.";
    console.error("Failed to submit payment update", error);
    return jsonError(message, 400);
  }
}
