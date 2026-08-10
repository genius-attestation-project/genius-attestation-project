import { AccessDenied } from "@/components/shared/AccessDenied";
import { BmReportDashboard } from "@/features/bm-report/components/BmReportDashboard";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requirePermission } from "@/middleware/auth.middleware";

export const dynamic = "force-dynamic";

export default async function BmReportPage() {
  try {
    const session = await requirePermission("bm_report.view", "/dashboard/bm-report");

    if (!session) {
      return <AccessDenied description="Your role cannot access the BM Report movement tracking module." />;
    }

    const currentOfficeLocationName = await resolveOfficeLocationName({
      ownerAdminId: session?.user?.ownerAdminId ?? "",
      officeLocationId: session?.user?.officeLocationId,
      officeLocationName: session?.user?.officeLocationName,
      userId: session?.user?.id,
    }).catch(() => "");

    return <BmReportDashboard currentOfficeLocationName={currentOfficeLocationName ?? ""} />;
  } catch (error) {
    console.error("[BmReportPage] Failed to render BM Report page:", error);
    return <BmReportDashboard currentOfficeLocationName="" />;
  }
}
