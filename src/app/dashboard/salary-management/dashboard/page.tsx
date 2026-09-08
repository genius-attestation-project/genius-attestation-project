import { AccessDenied } from "@/components/shared/AccessDenied";
import { SalaryManagement } from "@/features/salary/components/SalaryManagement";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "Salary Dashboard ? Genius Attestation",
};

export default async function SalaryDashboardPage() {
  const session = await requireAuth("/dashboard/salary-management/dashboard");
  if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.view")) {
    return <AccessDenied description="Your role cannot view salary data." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <SalaryManagement mode="dashboard" />
    </div>
  );
}
