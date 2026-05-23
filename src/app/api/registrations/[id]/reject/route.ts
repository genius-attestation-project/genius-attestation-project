import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { setRegistrationApproval } from "@/features/registration/server/registration.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const registration = await setRegistrationApproval(ownerAdminId, id, "Rejected", performedBy);

    if (!registration) return jsonError("Registration not found.", 404);

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to reject registration", error);
    return jsonError("Unable to reject registration.", 500);
  }
}
