import { PageHeader } from "@/components/ui/PageHeader";
import { AttendanceRecordsTable } from "@/features/attendance/components/AttendanceRecordsTable";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "My Attendance Records — Genius Attestation",
};

export default async function AttendanceRecordsPage() {
  const session = await requireAuth("/dashboard/attendance/records");
  const userName = session.user.name ?? session.user.email ?? "User";

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="My Attendance"
        title="Attendance Records"
        description={`Viewing attendance history for ${userName}.`}
      />
      <AttendanceRecordsTable />
    </div>
  );
}
