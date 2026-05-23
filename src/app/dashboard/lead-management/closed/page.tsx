import { AccessDenied } from "@/components/shared/AccessDenied";
import { ClosedAnalyticsDashboard } from "@/features/closed/components/ClosedAnalyticsDashboard";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function ClosedLeadsPage() {
  const session = await requirePermission("closed_leads.view", "/dashboard/lead-management/closed");

  if (!session) {
    return <AccessDenied description="Your role cannot access closed leads." />;
  }

  return <ClosedAnalyticsDashboard />;
}
