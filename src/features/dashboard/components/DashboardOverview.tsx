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
import type { DashboardStatsResponse } from "@/features/lead/types/lead.types";

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

export function DashboardOverview() {
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
    () => [
      {
        label: "Total Leads",
        value: stats.totalLeads.toLocaleString(),
        delta: "Live",
        description: "All leads in PostgreSQL",
        icon: Users,
        tone: "blue" as const,
      },
      {
        label: "Active Leads",
        value: stats.activeLeads.toLocaleString(),
        delta: "Live",
        description: "Open and active pipeline",
        icon: UserCheck,
        tone: "slate" as const,
      },
      {
        label: "Revenue",
        value: `$${Math.round(stats.totalRevenue).toLocaleString()}`,
        delta: "Live",
        description: "Total booked lead value",
        icon: BadgeDollarSign,
        tone: "blue" as const,
      },
      {
        label: "Followups",
        value: stats.followups.toLocaleString(),
        delta: "Live",
        description: "Leads requiring followup",
        icon: LoaderCircle,
        tone: "amber" as const,
      },
      {
        label: "Closed Leads",
        value: stats.closedLeads.toLocaleString(),
        delta: "Live",
        description: "Successfully closed leads",
        icon: BadgeCheck,
        tone: "slate" as const,
      },
      {
        label: "Pending Approval",
        value: stats.pendingLeads.toLocaleString(),
        delta: "Live",
        description: "Awaiting approval action",
        icon: ClipboardList,
        tone: "amber" as const,
      },
    ],
    [stats],
  );

  if (loading) {
    return (
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <StatsCard key={card.label} {...card} />
          ))}
        </section>
        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
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

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <DashboardCharts
          monthlyLeads={stats.charts.monthlyLeads}
          revenueTrends={stats.charts.revenueTrends}
          leadsByStatus={stats.charts.leadsByStatus}
          followupCounts={stats.charts.followupCounts}
        />
        <DashboardRightRail activities={stats.recentActivities} />
      </section>

      <DashboardTables rows={stats.recentLeads} />
    </div>
  );
}
