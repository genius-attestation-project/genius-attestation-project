import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { findRegistrationForPayment } from "@/features/account-update/server/account-update.service";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ trackingNumber: string }>;
};

export async function GET(_request: NextRequest, context: { params: Promise<{ trackingNumber: string }> }) {
    const params = await context.params;
  const denied = await requireApiPermission("account_update.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { trackingNumber } = await params;
    const registration = await findRegistrationForPayment(ownerAdminId, decodeURIComponent(trackingNumber));

    if (!registration) {
      return jsonError("Tracking number not found in revenue registration.", 404);
    }

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to lookup payment registration", error);
    return jsonError("Unable to lookup tracking number.", 500);
  }
}
