import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { hasPermission } from "@/features/admin/server/rbac.service";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function LeaveManagementLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth("/dashboard/leave-management");
  const hasAccess =
    session.user.isSuperAdmin ||
    ["leave.view", "leave.create", "leave.approve", "leave.report"].some((permission) =>
      hasPermission(session.user, permission),
    );

  if (!hasAccess) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
