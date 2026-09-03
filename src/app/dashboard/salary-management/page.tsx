import { AccessDenied } from "@/components/shared/AccessDenied";
import { requirePermission } from "@/middleware/auth.middleware";
import { redirect } from "next/navigation";

export default async function SalaryManagementIndexPage() {
  const session = await requirePermission("salary.view", "/dashboard/salary-management");

  if (!session) {
    return <AccessDenied description="Your role cannot access Salary Management." />;
  }

  redirect("/dashboard/salary-management/dashboard");
}
