import { PageHeader } from "@/components/ui/PageHeader";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { getGreeting } from "@/features/dashboard/data/dashboard.data";
import { requirePermission } from "@/middleware/auth.middleware";

export default async function DashboardPage() {
  const session = await requirePermission("dashboard.view", "/dashboard");

  if (!session) {
    return <AccessDenied description="Your role cannot access the dashboard." />;
  }

  const greeting = getGreeting();
  const userName = session.user.name ?? session.user.email ?? "Workspace User";

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Home Dashboard"
        title={`${greeting}, ${userName}`}
        description="A quick view of today's lead activity and approvals."
      />
      <DashboardOverview
        permissions={session.user.permissions}
        isSuperAdmin={session.user.isSuperAdmin}
        role={session.user.role}
      />
    </div>
  );
}
