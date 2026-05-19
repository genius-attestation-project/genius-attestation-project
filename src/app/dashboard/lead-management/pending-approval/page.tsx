import { AccessDenied } from "@/components/shared/AccessDenied";
import { AllLeadsManagement } from "@/features/lead/components/AllLeadsManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function PendingApprovalLeadsPage() {
  const session = await requirePermission(
    "pending_approval.view",
    "/dashboard/lead-management/pending-approval",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access pending approvals." />;
  }

  return (
    <AllLeadsManagement
      title="Pending Approval"
      description="Approval queue powered by real lead records from PostgreSQL."
      endpoint="/api/leads/pending"
      showAddLead={false}
      allowStatusFilter={false}
    />
  );
}
