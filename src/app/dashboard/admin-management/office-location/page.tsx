import { AccessDenied } from "@/components/shared/AccessDenied";
import { OfficeLocationManagement } from "@/features/admin/components/OfficeLocationManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AdminOfficeLocationPage() {
  const session = await requirePermission(
    "office_locations.view",
    "/dashboard/admin-management/office-location",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot open office location management." />;
  }

  return <OfficeLocationManagement />;
}
