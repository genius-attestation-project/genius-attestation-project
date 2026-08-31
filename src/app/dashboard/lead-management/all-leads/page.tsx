import { AccessDenied } from "@/components/shared/AccessDenied";
import { AllLeadsManagement } from "@/features/lead/components/AllLeadsManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function AllLeadsPage() {
  const session = await requirePermission("leads.view", "/dashboard/lead-management/all-leads");

  if (!session) {
    return <AccessDenied description="Your role cannot access the all leads workspace." />;
  }

  return <AllLeadsManagement />;
}
