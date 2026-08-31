import { AccessDenied } from "@/components/shared/AccessDenied";
import { AssignLeadsManagement } from "@/features/lead/components/AssignLeadsManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AssignLeadsPage() {
  const session = await requirePermission(
    "assigned_leads.view",
    "/dashboard/lead-management/assign-leads",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access assigned leads." />;
  }

  return <AssignLeadsManagement />;
}
