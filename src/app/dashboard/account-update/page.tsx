import { AccessDenied } from "@/components/shared/AccessDenied";
import { AccountUpdateDashboard } from "@/features/account-update/components/AccountUpdateDashboard";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AccountUpdatePage() {
  const session = await requirePermission("account_update.view", "/dashboard/account-update");

  if (!session) {
    return <AccessDenied description="Your role cannot access account updates." />;
  }

  return (
    <AccountUpdateDashboard
      canApprove={
        session.user.isSuperAdmin ||
        hasPermission(session.user, "account_admin_approval.view") ||
        hasPermission(session.user, "account_approval.view")
      }
      canApproveAction={
        session.user.isSuperAdmin ||
        hasPermission(session.user, "account_admin_approval.edit") ||
        hasPermission(session.user, "account_approval.edit")
      }
      canSubmitPayment={session.user.isSuperAdmin || hasPermission(session.user, "account_update.edit")}
    />
  );
}
