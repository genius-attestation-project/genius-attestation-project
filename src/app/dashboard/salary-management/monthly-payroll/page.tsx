
import { AccessDenied } from "@/components/shared/AccessDenied";
import { PageHeader } from "@/components/ui/PageHeader";
import { SalaryManagement } from "@/features/salary/components/SalaryManagement";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "Salary Payroll ? Genius Attestation",
};

export default async function SalaryMonthlyPayrollPage() {
  const session = await requireAuth("/dashboard/salary-management/monthly-payroll");
  const hasAccess =
    session.user.isSuperAdmin ||
    ["salary.generate", "salary.approve"].some((permission) => hasPermission(session.user, permission));

  if (!hasAccess) {
    return <AccessDenied description="Your role cannot manage monthly payroll." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Salary Module"
        title="Monthly Payroll"
        description="Generate payroll snapshots and approve them when the month is ready to close."
      />
      <SalaryManagement mode="payroll" />
    </div>
  );
}


