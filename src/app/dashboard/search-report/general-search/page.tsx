import { Suspense } from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { SearchReportClient } from "@/features/registration/components/SearchReportClient";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function GeneralSearchPage() {
  const session = await requirePermission(
    "search_report.view",
    "/dashboard/search-report/general-search"
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access General Search." />;
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-soft">Loading search...</div>}>
      <SearchReportClient />
    </Suspense>
  );
}
