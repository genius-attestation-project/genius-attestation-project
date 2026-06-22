import { PageHeader } from "@/components/ui/PageHeader";
import { AttendanceDashboard } from "@/features/attendance/components/AttendanceDashboard";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "Attendance Dashboard ? Genius Attestation",
};

export default async function AttendanceDashboardPage() {
  const session = await requireAuth("/dashboard/attendance/dashboard");
  const canViewAll = session.user.isSuperAdmin || hasPermission(session.user, "attendance_approval.view");

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Attendance Module"
        title="Attendance Dashboard"
        description="Real-time overview of today's attendance, approvals, and workforce presence."
      />
      <AttendanceDashboard canViewAll={canViewAll} />
    </div>
  );
}
