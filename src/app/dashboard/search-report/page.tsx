import { Suspense } from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { SearchReportClient } from "@/features/registration/components/SearchReportClient";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function SearchReportPage() {
  const session = await requirePermission("search_report.view", "/dashboard/search-report");

  if (!session) {
    return <AccessDenied description="Your role cannot access search and reports." />;
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-soft">Loading search...</div>}>
      <SearchReportClient />
    </Suspense>
  );
}
