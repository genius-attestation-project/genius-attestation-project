import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";
import { DashboardRightRail } from "@/features/dashboard/components/DashboardRightRail";
import { DashboardTables } from "@/features/dashboard/components/DashboardTables";
import {
  getDashboardStats,
  getGreeting,
} from "@/features/dashboard/data/dashboard.data";
import { requireAuth } from "@/middleware/auth.middleware";

export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");
  const greeting = getGreeting();
  const userName = session.user.name ?? session.user.email ?? "Workspace User";
  const stats = getDashboardStats().slice(0, 6);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Home Dashboard"
        title={`${greeting}, ${userName}`}
        description="A simplified overview of the current workspace modules with clearer hierarchy, lighter spacing, and fewer competing panels."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <DashboardCharts />
        <DashboardRightRail />
      </section>

      <DashboardTables />
    </div>
  );
}
