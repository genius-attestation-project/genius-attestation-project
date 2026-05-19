import { AccessDenied } from "@/components/shared/AccessDenied";
import { LeadLobManagement } from "@/features/lead/components/LeadLobManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function LeadLobPage() {
  const session = await requirePermission("lob.view", "/dashboard/lead-management/lob");

  if (!session) {
    return <AccessDenied description="Your role cannot access line-of-business reporting." />;
  }

  return <LeadLobManagement />;
}
