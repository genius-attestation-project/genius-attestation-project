import { auth } from "@/lib/auth";
import { getTodayAttendance, getAttendanceSetting, isAttendanceReady } from "@/features/attendance/server/attendance.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    const ready = await isAttendanceReady();
    if (!ready) {
      return Response.json({
        ready: false,
        message: "Attendance tables are not set up yet.",
      });
    }

    const [record, setting] = await Promise.all([
      getTodayAttendance(session.user.id),
      getAttendanceSetting(session.user.id),
    ]);
    
    const expectedCheckoutTime = setting?.expectedCheckoutTime || "18:00";
    const hasCheckedIn = !!record;
    const hasCheckedOut = !!record?.checkoutTime;
    
    let isEligible = false;
    
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, "0");
    const currentM = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentH}:${currentM}`;

    if (hasCheckedIn && !hasCheckedOut && record?.status !== "Leave") {
       if (currentTimeStr >= expectedCheckoutTime) {
         isEligible = true;
       }
    }
    
    return Response.json({ 
        expectedCheckoutTime,
        hasCheckedIn,
        hasCheckedOut,
        isEligible,
        status: record?.status || "None"
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load checkout status.";
    console.error("[api/attendance/checkout/status] Error:", err);
    return Response.json({ message }, { status: 500 });
  }
}
