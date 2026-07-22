import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { getRegistrationByTrackingNumber } from "@/features/registration/server/registration.service";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ trackingNumber: string }>;
};

export async function GET(_: NextRequest, context: { params: Promise<{ trackingNumber: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { trackingNumber } = await context.params;
    const decodedTrackingNumber = decodeURIComponent(trackingNumber);
    const registration = await getRegistrationByTrackingNumber(ownerAdminId, decodedTrackingNumber);

    if (!registration) return jsonError("Registration not found.", 404);

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to fetch registration by tracking number", error);
    return jsonError("Unable to fetch registration.", 500);
  }
}
