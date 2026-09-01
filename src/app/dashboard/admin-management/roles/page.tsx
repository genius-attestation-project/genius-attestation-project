import { AccessDenied } from "@/components/shared/AccessDenied";
import { RolesManagement } from "@/features/admin/components/RolesManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AdminRolesPage() {
  const session = await requirePermission("roles.view", "/dashboard/admin-management/roles");

  if (!session || !session.user) {
    return <AccessDenied description="Your role cannot access Admin Management Roles." />;
  }

  return <RolesManagement />;
}
