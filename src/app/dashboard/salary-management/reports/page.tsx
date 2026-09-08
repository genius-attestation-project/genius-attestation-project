import { AccessDenied } from "@/components/shared/AccessDenied";
import { SalaryManagement } from "@/features/salary/components/SalaryManagement";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "Salary Reports ? Genius Attestation",
};

export default async function SalaryReportsPage() {
  const session = await requireAuth("/dashboard/salary-management/reports");
  if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.report")) {
    return <AccessDenied description="Your role cannot view salary reports." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <SalaryManagement mode="reports" />
    </div>
  );
}
