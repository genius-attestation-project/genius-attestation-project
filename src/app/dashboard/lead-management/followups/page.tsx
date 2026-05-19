import { AccessDenied } from "@/components/shared/AccessDenied";
import { AllLeadsManagement } from "@/features/lead/components/AllLeadsManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function LeadFollowupsPage() {
  const session = await requirePermission("followups.view", "/dashboard/lead-management/followups");

  if (!session) {
    return <AccessDenied description="Your role cannot access followup leads." />;
  }

  return (
    <AllLeadsManagement
      title="Followups"
      description="Followup leads synced from the live CRM database."
      endpoint="/api/followups"
      showAddLead={false}
      allowStatusFilter={false}
    />
  );
}
