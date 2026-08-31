import type { ReactNode } from "react";
import { requireAuth } from "@/middleware/auth.middleware";
import { redirect } from "next/navigation";

export default async function AttendanceLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth("/dashboard/attendance");

  // Users with at least attendance.view can access the module
  const hasAccess =
    session.user.isSuperAdmin ||
    session.user.permissions.some((p: string) =>
      p.startsWith("attendance"),
    );

  if (!hasAccess) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
