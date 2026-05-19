import { AccessDenied } from "@/components/shared/AccessDenied";
import { AllLeadsManagement } from "@/features/lead/components/AllLeadsManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function ClosedLeadsPage() {
  const session = await requirePermission("closed_leads.view", "/dashboard/lead-management/closed");

  if (!session) {
    return <AccessDenied description="Your role cannot access closed leads." />;
  }

  return (
    <AllLeadsManagement
      title="Closed Leads"
      description="Closed lead records synced from the live CRM database."
      endpoint="/api/leads/closed"
      showAddLead={false}
      allowStatusFilter={false}
    />
  );
}
