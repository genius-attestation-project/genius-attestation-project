import { PageHeader } from "@/components/ui/PageHeader";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { ApplyLeaveManagement } from "@/features/leave/components/ApplyLeaveManagement";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function ApplyLeavePage() {
  const session = await requireAuth("/dashboard/leave-management/apply");
  if (!session.user.isSuperAdmin && !hasPermission(session.user, "leave.create")) {
    return <AccessDenied description="You do not have permission to apply for leave." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader eyebrow="Leave Management" title="Apply Leave" description="Submit a leave request for approval." />
      <ApplyLeaveManagement />
    </div>
  );
}
