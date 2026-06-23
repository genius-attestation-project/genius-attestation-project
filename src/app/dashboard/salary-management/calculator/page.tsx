import { AccessDenied } from "@/components/shared/AccessDenied";
import { PageHeader } from "@/components/ui/PageHeader";
import { SalaryManagement } from "@/features/salary/components/SalaryManagement";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "Salary Calculator ? Genius Attestation",
};

export default async function SalaryCalculatorPage() {
  const session = await requireAuth("/dashboard/salary-management/calculator");
  if (!session.user.isSuperAdmin && !hasPermission(session.user, "salary.calculate")) {
    return <AccessDenied description="Your role cannot calculate salary." />;
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Salary Module"
        title="Salary Calculator"
        description="Preview monthly payroll using real attendance and leave records before generating the snapshot."
      />
      <SalaryManagement mode="calculator" />
    </div>
  );
}
