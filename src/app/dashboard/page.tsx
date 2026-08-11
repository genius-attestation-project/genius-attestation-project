import { Suspense } from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { requirePermission } from "@/middleware/auth.middleware";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

function DashboardFallback() {
  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <LoadingSkeleton key={index} className="h-39 w-full" />
        ))}
      </section>
      <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <LoadingSkeleton className="h-105 w-full" />
        <LoadingSkeleton className="h-105 w-full" />
      </section>
      <LoadingSkeleton className="h-90 w-full" />
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requirePermission("dashboard.view", "/dashboard");

  if (!session) {
    return <AccessDenied description="Your role cannot access the dashboard." />;
  }

  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
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
