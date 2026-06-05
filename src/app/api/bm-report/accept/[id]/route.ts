import { acceptBmRegistration } from "@/features/bm-report/server/bm-report.service";
import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const denied = await requireApiPermission("bm_report.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const officeLocationName = ownerAdminId
      ? await resolveOfficeLocationName({
          ownerAdminId,
          officeLocationId: session.user?.officeLocationId,
          officeLocationName: session.user?.officeLocationName,
        })
      : null;
    const acceptedByUserId = session?.user?.id;
    const acceptedByName = session?.user?.name ?? session?.user?.email ?? undefined;

    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);
    if (!officeLocationName || !acceptedByUserId) {
      return jsonError("Office location and session user are required to accept BM documents.", 400);
    }

    const { id } = await context.params;
    const accepted = await acceptBmRegistration({
      id,
      ownerAdminId,
      officeLocationName,
      acceptedByUserId,
      acceptedByName,
    });

    if (!accepted) {
      return jsonError("Document not found in inward queue or it was already accepted.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to accept BM document", error);
    return jsonError("Unable to accept BM document.", 500);
  }
}
