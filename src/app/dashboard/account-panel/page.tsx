import { AccessDenied } from "@/components/shared/AccessDenied";
import { AccountPanelDashboard } from "@/features/account-panel/components/AccountPanelDashboard";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AccountPanelPage() {
  const session = await requirePermission("account_panel.view", "/dashboard/account-panel");

  if (!session) {
    return <AccessDenied description="Your role cannot access Account Panel." />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0c0e] py-6">
      <AccountPanelDashboard />
    </div>
  );
}
