import { LeaveRequestsManagement } from "@/features/leave/components/LeaveRequestsManagement";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function LeaveRequestsPage() {
  await requireAuth("/dashboard/leave-management/requests");

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <LeaveRequestsManagement />
    </div>
  );
}
