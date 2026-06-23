import { AccessDenied } from "@/components/shared/AccessDenied";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        eyebrow="Salary Module"
        title="Salary Dashboard"
        description="Track payroll previews, generated salary snapshots, and monthly totals from attendance plus leave data."
      />
      <SalaryManagement mode="dashboard" />
    </div>
  );
}
