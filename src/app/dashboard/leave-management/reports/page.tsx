import { AccessDenied } from "@/components/shared/AccessDenied";
import { PageHeader } from "@/components/ui/PageHeader";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { LeaveReportsManagement } from "@/features/leave/components/LeaveReportsManagement";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function LeaveReportsPage() {
  const session = await requireAuth("/dashboard/leave-management/reports");
  if (!session.user.isSuperAdmin && !hasPermission(session.user, "leave.report")) {
    return <AccessDenied description="You do not have permission to view leave reports." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader eyebrow="Leave Management" title="Leave Reports" description="Audit approved, rejected, pending, and cancelled leaves." />
      <LeaveReportsManagement />
    </div>
  );
}
