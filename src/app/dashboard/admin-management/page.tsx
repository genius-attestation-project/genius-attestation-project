import { AccessDenied } from "@/components/shared/AccessDenied";
import { AdminOverview } from "@/features/admin/components/AdminOverview";
import { adminManagementLinks } from "@/features/dashboard/data/dashboard.data";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AdminManagementPage() {
  const session = await requirePermission("admin_management.view", "/dashboard/admin-management");

  if (!session) {
    return <AccessDenied description="Your role cannot access Admin Management." />;
  }

  return <AdminOverview links={adminManagementLinks} />;
}
