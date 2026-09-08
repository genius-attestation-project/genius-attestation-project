import { AttendanceRecordsTable } from "@/features/attendance/components/AttendanceRecordsTable";
import { requireAuth } from "@/middleware/auth.middleware";

export const metadata = {
  title: "My Attendance Records — Genius Attestation",
};

export default async function AttendanceRecordsPage() {
  await requireAuth("/dashboard/attendance/records");

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <AttendanceRecordsTable />
    </div>
  );
}
