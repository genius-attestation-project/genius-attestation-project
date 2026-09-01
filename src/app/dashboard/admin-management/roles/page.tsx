import { AccessDenied } from "@/components/shared/AccessDenied";
import { RolesManagement } from "@/features/admin/components/RolesManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AdminRolesPage() {
  const session = await requirePermission("roles.view", "/dashboard/admin-management/roles");

  if (!session || !session.user?.isSuperAdmin) {
    return <AccessDenied description="Only Super Admin users can manage office visibilities and permissions." />;
  }

  return <RolesManagement />;
}
