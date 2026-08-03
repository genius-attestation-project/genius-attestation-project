import { AccessDenied } from "@/components/shared/AccessDenied";
import { PendingApprovalDashboard } from "@/features/lead/components/PendingApprovalDashboard";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function PendingApprovalPage() {
  const session = await requirePermission(
    "pending_approval.view",
    "/dashboard/pending-approval",
  );

  if (!session) {
    return <AccessDenied description="Your role cannot access pending approvals." />;
  }

  return <PendingApprovalDashboard />;
}
