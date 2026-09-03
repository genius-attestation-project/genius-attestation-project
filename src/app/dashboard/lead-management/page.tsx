import { AccessDenied } from "@/components/shared/AccessDenied";
import { requirePermission } from "@/middleware/auth.middleware";
import { redirect } from "next/navigation";

export default async function LeadManagementPage() {
  const session = await requirePermission("lead_management.view", "/dashboard/lead-management");

  if (!session) {
    return <AccessDenied description="Your role cannot access Lead Management." />;
  }

  redirect("/dashboard/lead-management/all-leads");
}
