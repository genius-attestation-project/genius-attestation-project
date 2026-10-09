import { Suspense } from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { TrackingReportClient } from "@/features/registration/components/TrackingReportClient";
import { requirePermission } from "@/middleware/auth.middleware";
import { hasPermission } from "@/features/admin/server/rbac.service";

export default async function TrackingReportPage() {
  const session = await requirePermission(
    "search_report.tracking_report.view",
    "/dashboard/search-report/tracking-report"
  );

  if (!session || !session.user) {
    return <AccessDenied description="Your role cannot access the Tracking Report." />;
  }

  const canExport =
    Boolean(session.user.isSuperAdmin) ||
    hasPermission(session.user, "search_report.tracking_report.export") ||
    hasPermission(session.user, "search_report.export");

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-soft">
          Loading tracking report...
        </div>
      }
    >
      <TrackingReportClient canExport={canExport} />
    </Suspense>
  );
}
