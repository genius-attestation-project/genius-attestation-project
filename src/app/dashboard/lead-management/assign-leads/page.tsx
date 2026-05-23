import { AccessDenied } from "@/components/shared/AccessDenied";
import { ModulePlaceholder } from "@/features/dashboard/components/ModulePlaceholder";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AssignLeadsPage() {
  const session = await requirePermission(
    "assigned_leads.view",
    "/dashboard/lead-management/assign-leads",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access assigned leads." />;
  }

  return (
    <ModulePlaceholder
      eyebrow="Lead Management"
      title="Assign Leads"
      description="Use this section to manage lead routing, assignment visibility, and ownership workflow inside the new sidebar structure."
    />
  );
}
