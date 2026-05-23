import { AccessDenied } from "@/components/shared/AccessDenied";
import { FollowupsCalendarManagement } from "@/features/lead/components/FollowupsCalendarManagement";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function LeadFollowupsPage() {
  const session = await requirePermission("followups.view", "/dashboard/lead-management/followups");

  if (!session) {
    return <AccessDenied description="Your role cannot access followup leads." />;
  }

  return <FollowupsCalendarManagement />;
}
