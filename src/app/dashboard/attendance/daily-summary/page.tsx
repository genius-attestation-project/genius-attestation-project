import { PageHeader } from "@/components/ui/PageHeader";
import { requireAuth } from "@/middleware/auth.middleware";
import { DailySummaryForm } from "@/features/attendance/components/DailySummaryForm";

export const metadata = {
  title: "Daily Summary — Genius Attestation",
};

export default async function DailySummaryPage() {
  await requireAuth("/dashboard/attendance/daily-summary");

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Attendance"
        title="My Daily Summary"
        description="Submit or update your work summary for today."
      />
      <DailySummaryForm />
    </div>
  );
}
