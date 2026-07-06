import { PageHeader } from "@/components/ui/PageHeader";
import { requireAuth } from "@/middleware/auth.middleware";
import { DailySummaryView } from "@/features/attendance/components/DailySummaryView";

export const metadata = {
  title: "Daily Summary — Genius Attestation",
};

export default async function DailySummaryPage() {
  const session = await requireAuth("/dashboard/attendance/daily-summary");
  const canViewAll = session.user.isSuperAdmin || session.user.permissions.includes("attendance.summary.view");

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Attendance"
        title="Daily Summaries"
        description="View employee daily summaries."
      />
      <DailySummaryView canViewAll={canViewAll} />
    </div>
  );
}
