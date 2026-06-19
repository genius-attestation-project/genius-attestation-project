import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui/PageHeader";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { AttendanceApprovalTable } from "@/features/attendance/components/AttendanceApprovalTable";
import { requireAuth } from "@/middleware/auth.middleware";
import { hasPermission } from "@/features/admin/server/rbac.service";

export const metadata = {
  title: "Attendance Approval — Genius Attestation",
};

export default async function AttendanceApprovalPage() {
  const session = await requireAuth("/dashboard/attendance/approval");

  const canApprove =
    session.user.isSuperAdmin ||
    hasPermission(session.user, "attendance_approval.view");

  if (!canApprove) {
    return (
      <AccessDenied description="You do not have permission to approve attendance records." />
    );
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Attendance Module"
        title="Attendance Approval"
        description="Review, approve, or reject submitted attendance records. Delayed approvals are fully supported."
      />
      <AttendanceApprovalTable />
    </div>
  );
}
