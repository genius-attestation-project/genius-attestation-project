import { AccessDenied } from "@/components/shared/AccessDenied";
import { requirePermission } from "@/middleware/auth.middleware";
import { redirect } from "next/navigation";

export default async function LeaveManagementIndexPage() {
  const session = await requirePermission("leave.view", "/dashboard/leave-management");

  if (!session) {
    return <AccessDenied description="Your role cannot access Leave Management." />;
  }

  redirect("/dashboard/leave-management/apply");
}
