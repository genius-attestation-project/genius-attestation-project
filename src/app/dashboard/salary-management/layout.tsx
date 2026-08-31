import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { hasPermission } from "@/features/admin/server/rbac.service";
import { requireAuth } from "@/middleware/auth.middleware";

function canAccessSalaryModule(session: Awaited<ReturnType<typeof requireAuth>>["user"]) {
  return (
    session.isSuperAdmin ||
    ["salary.view", "salary.calculate", "salary.generate", "salary.approve", "salary.report"].some((permission) =>
      hasPermission(session, permission),
    )
  );
}

export default async function SalaryManagementLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth("/dashboard/salary-management");

  if (!canAccessSalaryModule(session.user)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
