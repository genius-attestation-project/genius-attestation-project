import { AccessDenied } from "@/components/shared/AccessDenied";
import { ProcessDashboard } from "@/features/process/components/ProcessDashboard";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function ProcessPage() {
  const session = await requirePermission("process.view", "/dashboard/process");

  if (!session) {
    return <AccessDenied description="Your role cannot access the Process Module." />;
  }

  const isSuperAdmin = Boolean(session.user.isSuperAdmin || session.user.role === "Super Admin");

  return (
    <ProcessDashboard
      userPermissions={session.user.permissions || []}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
