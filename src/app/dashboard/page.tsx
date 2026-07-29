import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { getGreeting } from "@/features/dashboard/data/dashboard.data";
import { requirePermission } from "@/middleware/auth.middleware";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

function DashboardFallback() {
  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <LoadingSkeleton key={index} className="h-[156px] w-full" />
        ))}
      </section>
      <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <LoadingSkeleton className="h-[420px] w-full" />
        <LoadingSkeleton className="h-[420px] w-full" />
      </section>
      <LoadingSkeleton className="h-[360px] w-full" />
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requirePermission("dashboard.view", "/dashboard");

  if (!session) {
    return <AccessDenied description="Your role cannot access the dashboard." />;
  }

  const greeting = getGreeting();
  const userName = session.user.name ?? session.user.email ?? "Workspace User";
  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting}, ${userName}`}
        description="A quick view of today's lead activity and approvals."
      />
      <Suspense fallback={<DashboardFallback />}>
        <DashboardOverview
          ownerAdminId={ownerAdminId}
          permissions={session.user.permissions}
          isSuperAdmin={session.user.isSuperAdmin}
          role={session.user.role}
        />
      </Suspense>
    </div>
  );
}
