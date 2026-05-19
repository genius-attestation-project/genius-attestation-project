import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function SearchReportPage() {
  const session = await requirePermission("search_report.view", "/dashboard/search-report");

  if (!session) {
    return <AccessDenied description="Your role cannot access search and reports." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="Search / Report"
      title="Search and reporting hub"
      description="The reporting area now has a polished entry point that can be extended without changing your existing route architecture."
    />
  );
}
