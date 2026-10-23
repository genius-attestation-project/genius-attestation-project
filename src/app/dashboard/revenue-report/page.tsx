import { Suspense } from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { TrackingReportClient } from "@/features/registration/components/TrackingReportClient";
import { requireAuth } from "@/middleware/auth.middleware";
import { hasPermission } from "@/features/admin/server/rbac.service";

export default async function RevenueReportPage() {
  const session = await requireAuth("/dashboard/revenue-report");

  if (!session || !session.user) {
    return <AccessDenied description="Your role cannot access the Revenue Report." />;
  }

  const canView =
    Boolean(session.user.isSuperAdmin) ||
    hasPermission(session.user, "revenue_report.view") ||
    hasPermission(session.user, "revenue_report.search") ||
    hasPermission(session.user, "search_report.tracking_report.view") ||
    hasPermission(session.user, "tracking_report.view") ||
    hasPermission(session.user, "search_report.view");

  if (!canView) {
    return <AccessDenied description="Your role cannot access the Revenue Report." />;
  }

  const canExport =
    Boolean(session.user.isSuperAdmin) ||
    hasPermission(session.user, "revenue_report.export") ||
    hasPermission(session.user, "search_report.tracking_report.export") ||
    hasPermission(session.user, "tracking_report.export") ||
    hasPermission(session.user, "search_report.export");

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-soft">
          Loading revenue report...
        </div>
      }
    >
      <TrackingReportClient canExport={canExport} />
    </Suspense>
  );
}
