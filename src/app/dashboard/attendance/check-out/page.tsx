import { requirePermission } from "@/middleware/auth.middleware";
import { AttendanceCheckoutForm } from "../../../../features/attendance/components/AttendanceCheckoutForm";

export const metadata = {
  title: "Check Out — Genius Attestation",
};

export default async function AttendanceCheckOutPage() {
  await requirePermission("attendance.check_out.view", "/dashboard/attendance/check-out");

  // Get current server time
  const serverTime = new Date().toISOString();

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <AttendanceCheckoutForm serverTimeStr={serverTime} />
    </div>
  );
}
