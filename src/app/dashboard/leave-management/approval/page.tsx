import { AccessDenied } from "@/components/shared/AccessDenied";
import { PageHeader } from "@/components/ui/PageHeader";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { LeaveApprovalManagement } from "@/features/leave/components/LeaveApprovalManagement";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function LeaveApprovalPage() {
  const session = await requireAuth("/dashboard/leave-management/approval");
  if (!session.user.isSuperAdmin && !hasPermission(session.user, "leave.approve")) {
    return <AccessDenied description="You do not have permission to approve leave requests." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader eyebrow="Leave Management" title="Leave Approval" description="Approve or reject pending leave requests." />
      <LeaveApprovalManagement />
    </div>
  );
}
