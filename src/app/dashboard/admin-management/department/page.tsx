import { AccessDenied } from "@/components/shared/AccessDenied";
import { DepartmentManagement } from "@/features/admin/components/DepartmentManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AdminDepartmentPage() {
  const session = await requirePermission(
    "departments.view",
    "/dashboard/admin-management/department",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot open department management." />;
  }

  return <DepartmentManagement />;
}
