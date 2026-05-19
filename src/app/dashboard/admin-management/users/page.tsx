import { AccessDenied } from "@/components/shared/AccessDenied";
import { UsersManagement } from "@/features/admin/components/UsersManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AdminUsersPage() {
  const session = await requirePermission("users.view", "/dashboard/admin-management/users");

  if (!session) {
    return <AccessDenied description="Your role cannot manage or view users." />;
  }

  return <UsersManagement />;
}
