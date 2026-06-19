import { PageHeader } from "@/components/ui/PageHeader";
import { AttendanceDashboard } from "@/features/attendance/components/AttendanceDashboard";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "Attendance Dashboard — Genius Attestation",
};

export default async function AttendanceDashboardPage() {
  const session = await requireAuth("/dashboard/attendance/dashboard");

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Attendance Module"
        title="Attendance Dashboard"
        description="Real-time overview of today's attendance, approvals, and workforce presence."
      />
      <AttendanceDashboard isSuperAdmin={session.user.isSuperAdmin} />
    </div>
  );
}
