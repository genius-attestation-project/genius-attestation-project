import { Suspense } from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { RevenueReportClient } from "@/features/registration/components/RevenueReportClient";
import { requirePermission } from "@/middleware/auth.middleware";
import { hasPermission } from "@/features/admin/server/rbac.service";

export default async function RevenueReportPage() {
  const session = await requirePermission(
    "revenue_report.view",
    "/dashboard/revenue-report"
  );

  if (!session || !session.user) {
    return <AccessDenied description="Your role cannot access the Revenue Report." />;
  }

  const canSearch =
    Boolean(session.user.isSuperAdmin) ||
    hasPermission(session.user, "revenue_report.search") ||
    hasPermission(session.user, "search_report.tracking_report.search") ||
    hasPermission(session.user, "tracking_report.search") ||
    hasPermission(session.user, "revenue_report.view");

  const canExport =
    Boolean(session.user.isSuperAdmin) ||
    hasPermission(session.user, "revenue_report.export") ||
    hasPermission(session.user, "search_report.tracking_report.export") ||
    hasPermission(session.user, "tracking_report.export");

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-soft">
          Loading revenue report...
        </div>
      }
    >
      <RevenueReportClient canSearch={canSearch} canExport={canExport} />
    </Suspense>
  );
}
