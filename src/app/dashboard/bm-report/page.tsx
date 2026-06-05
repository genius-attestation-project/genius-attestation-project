import { AccessDenied } from "@/components/shared/AccessDenied";
import { BmReportDashboard } from "@/features/bm-report/components/BmReportDashboard";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function BmReportPage() {
  const session = await requirePermission("bm_report.view", "/dashboard/bm-report");

  if (!session) {
    return <AccessDenied description="Your role cannot access BM reports." />;
  }

  const currentOfficeLocationName = await resolveOfficeLocationName({
    ownerAdminId: session.user.ownerAdminId ?? "",
    officeLocationId: session.user.officeLocationId,
    officeLocationName: session.user.officeLocationName,
  });

  return <BmReportDashboard currentOfficeLocationName={currentOfficeLocationName ?? ""} />;
}
