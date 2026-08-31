import { AdminOverview } from "@/features/admin/components/AdminOverview";
import { adminManagementLinks } from "@/features/dashboard/data/dashboard.data";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function AdminManagementPage() {
  await requireAuth("/dashboard/admin-management");
  return <AdminOverview links={adminManagementLinks} />;
}
