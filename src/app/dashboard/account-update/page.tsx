import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AccountUpdatePage() {
  const session = await requirePermission("account_update.view", "/dashboard/account-update");

  if (!session) {
    return <AccessDenied description="Your role cannot access account updates." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="Account Update"
      title="Account update workspace"
      description="Account upkeep, verification, and data correction tasks can now plug into the redesigned shell without structural rewrites."
    />
  );
}
