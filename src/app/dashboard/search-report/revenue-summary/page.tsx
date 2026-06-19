import { AccessDenied } from "@/components/shared/AccessDenied";
import { RevenueSummaryClient } from "@/features/search-report/components/RevenueSummaryClient";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function RevenueSummaryPage() {
  const session = await requirePermission("revenue_summary.view", "/dashboard/search-report/revenue-summary");

  if (!session) {
    return <AccessDenied description="Your role cannot access the revenue summary." />;
  }

  return <RevenueSummaryClient />;
}
