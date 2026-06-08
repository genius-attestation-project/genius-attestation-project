"use client";

import { BadgeCheck, BadgeDollarSign, ClipboardList, LoaderCircle, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatsCard } from "@/components/ui/StatsCard";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";
import { DashboardRightRail } from "@/features/dashboard/components/DashboardRightRail";
import { DashboardTables } from "@/features/dashboard/components/DashboardTables";
import type { DashboardStat } from "@/features/dashboard/data/dashboard.data";
import type { DashboardStatsResponse } from "@/features/lead/types/lead.types";

type DashboardOverviewProps = {
  permissions: string[];
  isSuperAdmin: boolean;
  role: string;
};

const defaultStats: DashboardStatsResponse = {
  totalLeads: 0,
  activeLeads: 0,
  closedLeads: 0,
  pendingLeads: 0,
  totalRevenue: 0,
  followups: 0,
  recentLeads: [],
  recentActivities: [],
  charts: {
    monthlyLeads: [],
    revenueTrends: [],
    leadsByStatus: [],
    followupCounts: [],
  },
};

function canAccess(
  permissions: string[],
  isSuperAdmin: boolean,
  required: string[],
) {
  return isSuperAdmin || required.some((permission) => permissions.includes(permission));
}

export function DashboardOverview({
  permissions,
  isSuperAdmin,
  role,
}: DashboardOverviewProps) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStatsResponse>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/dashboard/stats", { cache: "no-store" });
        const payload = (await response.json()) as DashboardStatsResponse & { message?: string };

        if (response.status === 401) {
          console.warn("[dashboard] Stats request returned 401, redirecting to login.");
          router.replace("/login?callbackUrl=/dashboard&error=SessionExpired");
          return;
        }

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load dashboard.");
        }

        if (!ignore) {
          setStats(payload);
        }
      } catch (fetchError) {
        console.error("Failed to load dashboard", fetchError);

        if (!ignore) {
          setError(
            fetchError instanceof Error ? fetchError.message : "Unable to load dashboard.",
          );
          setStats(defaultStats);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [router]);

  const cards = useMemo(
    (): DashboardStat[] => {
      const visibleCards: DashboardStat[] = [];

      if (canAccess(permissions, isSuperAdmin, ["leads.view", "dashboard.view"])) {
        visibleCards.push({
          label: "Total Leads",
          value: stats.totalLeads.toLocaleString(),
          delta: "Live",
          description: "All leads in PostgreSQL",
          icon: Users,
          tone: "blue",
        });
        visibleCards.push({
          label: "Active Leads",
          value: stats.activeLeads.toLocaleString(),
          delta: "Live",
          description: "Open and active pipeline",
          icon: UserCheck,
          tone: "slate",
        });
      }

      if (canAccess(permissions, isSuperAdmin, ["revenue_registration.view", "account_update.view"])) {
        visibleCards.push({
          label: "Revenue",
          value: `$${Math.round(stats.totalRevenue).toLocaleString()}`,
          delta: "Live",
          description: "Finance-approved registration revenue",
          icon: BadgeDollarSign,
          tone: "blue",
        });
      }

      if (canAccess(permissions, isSuperAdmin, ["followups.view"])) {
        visibleCards.push({
          label: "Followups",
          value: stats.followups.toLocaleString(),
          delta: "Live",
          description: "Leads requiring followup",
          icon: LoaderCircle,
          tone: "amber",
        });
      }

      if (canAccess(permissions, isSuperAdmin, ["closed_leads.view"])) {
        visibleCards.push({
          label: "Closed Leads",
          value: stats.closedLeads.toLocaleString(),
          delta: "Live",
          description: "Successfully closed leads",
          icon: BadgeCheck,
          tone: "slate",
        });
      }

      if (canAccess(permissions, isSuperAdmin, ["pending_approval.view"])) {
        visibleCards.push({
          label: "Pending Approval",
          value: stats.pendingLeads.toLocaleString(),
          delta: "Live",
          description: "Awaiting approval action",
          icon: ClipboardList,
          tone: "amber",
        });
      }

      return visibleCards;
    },
    [isSuperAdmin, permissions, stats],
  );

  const showCharts = canAccess(permissions, isSuperAdmin, [
    "leads.view",
    "followups.view",
    "closed_leads.view",
    "revenue_registration.view",
  ]);
  const showRecentActivity = canAccess(permissions, isSuperAdmin, ["dashboard.view", "leads.view"]);
  const showRecentLeads = canAccess(permissions, isSuperAdmin, ["leads.view"]);

  if (loading) {
    return (
      <div className="grid min-w-0 gap-4 sm:gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <StatsCard key={card.label} {...card} />
          ))}
        </section>
        <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]">
          <LoadingSkeleton className="h-[540px] w-full" />
          <LoadingSkeleton className="h-[540px] w-full" />
        </section>
        <LoadingSkeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={LoaderCircle}
        title="Unable to load dashboard"
        description={error}
      />
    );
  }

  if (cards.length === 0 && !showCharts && !showRecentLeads) {
    return (
      <EmptyState
        icon={LoaderCircle}
        title={`Dashboard access ready for ${role}`}
        description="This dashboard is active, but no widgets are assigned to the current permission set yet."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </section>

      {showCharts || showRecentActivity ? (
        <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]">
          {showCharts ? (
            <DashboardCharts
              monthlyLeads={stats.charts.monthlyLeads}
              revenueTrends={stats.charts.revenueTrends}
              leadsByStatus={stats.charts.leadsByStatus}
              followupCounts={stats.charts.followupCounts}
            />
          ) : (
            <EmptyState
              icon={LoaderCircle}
              title="Charts hidden"
              description="This role does not currently include analytics widgets."
            />
          )}
          {showRecentActivity ? (
            <DashboardRightRail activities={stats.recentActivities} />
          ) : (
            <EmptyState
              icon={LoaderCircle}
              title="Activity hidden"
              description="Recent activity becomes visible when dashboard or lead permissions are granted."
            />
          )}
        </section>
      ) : null}

      {showRecentLeads ? <DashboardTables rows={stats.recentLeads} /> : null}
    </div>
  );
}
