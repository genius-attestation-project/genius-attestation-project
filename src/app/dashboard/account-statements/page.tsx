import { AccessDenied } from "@/components/shared/AccessDenied";
import { AccountStatementsPage } from "@/features/account-statements/components/AccountStatementsPage";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function DashboardAccountStatementsPage() {
  const session = await requirePermission("account_statements.view", "/dashboard/account-statements");

  if (!session) {
    return <AccessDenied description="Your role cannot access Account Statements." />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0c0e] py-6">
      <AccountStatementsPage />
    </div>
  );
}
