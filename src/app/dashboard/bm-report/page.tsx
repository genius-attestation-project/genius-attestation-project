import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function BmReportPage() {
  const session = await requirePermission("bm_report.view", "/dashboard/bm-report");

  if (!session) {
    return <AccessDenied description="Your role cannot access BM reports." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="BM Report"
      title="Business monitoring reports"
      description="The BM report section is aligned to the new premium SaaS dashboard language and ready for deeper reporting widgets."
    />
  );
}
