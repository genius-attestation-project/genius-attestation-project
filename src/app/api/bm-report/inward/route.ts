import { getBmReportStats, listBmInward } from "@/features/bm-report/server/bm-report.service";
import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
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

    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);
    if (!officeLocationName) return jsonError("Office location is required for BM report access.", 400);

    const [items, stats] = await Promise.all([
      listBmInward(ownerAdminId, officeLocationName),
      getBmReportStats(ownerAdminId, officeLocationName),
    ]);

    return jsonOk({ items, stats });
  } catch (error) {
    console.error("Failed to fetch BM inward", error);
    return jsonError("Unable to fetch BM inward.", 500);
  }
}
