import { BadgeCheck, BadgeDollarSign, ClipboardList, LoaderCircle, UserCheck, Users } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { StatsCard } from "@/components/ui/StatsCard";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";
import { DashboardRightRail } from "@/features/dashboard/components/DashboardRightRail";
import { DashboardTables } from "@/features/dashboard/components/DashboardTables";
import type { DashboardStat } from "@/features/dashboard/data/dashboard.data";
import { getDashboardStats } from "@/features/lead/server/lead.service";

type DashboardOverviewProps = {
  ownerAdminId: string;
  permissions: string[];
  isSuperAdmin: boolean;
  role: string;
};

function canAccess(
  permissions: string[],
  isSuperAdmin: boolean,
  required: string[],
) {
  return isSuperAdmin || required.some((permission) => permissions.includes(permission));
}

export async function DashboardOverview({
  ownerAdminId,
  permissions,
  isSuperAdmin,
  role,
}: DashboardOverviewProps) {
  let stats;
  try {
    stats = await getDashboardStats(ownerAdminId);
  } catch (error) {
    console.error("Failed to load dashboard stats", error);
    return (
      <EmptyState
        icon={LoaderCircle}
        title="Unable to load dashboard"
        description="An error occurred while loading dashboard statistics."
      />
    );
  }

  const cards: DashboardStat[] = [];

  if (canAccess(permissions, isSuperAdmin, ["leads.view", "dashboard.view"])) {
    cards.push({
      label: "Total Leads",
      value: stats.totalLeads.toLocaleString(),
      delta: "Live",
      description: "All leads",
      icon: Users,
      tone: "blue",
      href: "/dashboard/lead-management/all-leads",
    });
    cards.push({
      label: "Active Leads",
      value: stats.activeLeads.toLocaleString(),
      delta: "Live",
      description: "Open pipeline",
      icon: UserCheck,
      tone: "slate",
      href: "/dashboard/lead-management/all-leads?status=ACTIVE",
    });
  }

  if (canAccess(permissions, isSuperAdmin, ["revenue_registration.view", "account_update.view"])) {
    cards.push({
      label: "Revenue",
      value: `$${Math.round(stats.totalRevenue).toLocaleString()}`,
      delta: "Live",
      description: "Approved revenue",
      icon: BadgeDollarSign,
      tone: "blue",
      href: "/dashboard/revenue-registration",
    });
  }

  if (canAccess(permissions, isSuperAdmin, ["followups.view"])) {
    cards.push({
      label: "Followups",
      value: stats.followups.toLocaleString(),
      delta: "Live",
      description: "Due followups",
      icon: LoaderCircle,
      tone: "amber",
      href: "/dashboard/lead-management/followups",
    });
  }

  if (canAccess(permissions, isSuperAdmin, ["closed_leads.view"])) {
    cards.push({
      label: "Closed Leads",
      value: stats.closedLeads.toLocaleString(),
      delta: "Live",
      description: "Completed leads",
      icon: BadgeCheck,
      tone: "slate",
      href: "/dashboard/lead-management/closed",
    });
  }

  if (canAccess(permissions, isSuperAdmin, ["pending_approval.view", "advance_payment_approval.view"])) {
    cards.push({
      label: "Pending Approval",
      value: stats.pendingLeads.toLocaleString(),
      delta: "Live",
      description: "Awaiting review",
      icon: ClipboardList,
      tone: "amber",
      href: "/dashboard/pending-approval",
    });

    if (stats.pendingAdvanceApprovals !== undefined) {
      cards.push({
        label: "Pending Advance Approvals",
        value: (stats.pendingAdvanceApprovals ?? 0).toLocaleString(),
        delta: "Live",
        description: "Advance payments awaiting review",
        icon: ClipboardList,
        tone: "amber",
        href: "/dashboard/pending-approval",
      });
      cards.push({
        label: "Approved Advances",
        value: (stats.approvedAdvances ?? 0).toLocaleString(),
        delta: "Live",
        description: "Confirmed advance payments",
        icon: BadgeCheck,
        tone: "emerald",
        href: "/dashboard/pending-approval",
      });
      cards.push({
        label: "Rejected Advances",
        value: (stats.rejectedAdvances ?? 0).toLocaleString(),
        delta: "Live",
        description: "Rejected advance requests",
        icon: BadgeCheck,
        tone: "rose",
        href: "/dashboard/pending-approval",
      });
      cards.push({
        label: "Total Advance Amount",
        value: `₹${(stats.totalAdvanceAmount ?? 0).toLocaleString()}`,
        delta: "Live",
        description: "Total advances requested",
        icon: BadgeDollarSign,
        tone: "blue",
        href: "/dashboard/revenue-registration",
      });
      cards.push({
        label: "Approved Advance Amount",
        value: `₹${(stats.approvedAdvanceAmount ?? 0).toLocaleString()}`,
        delta: "Live",
        description: "Total approved advances",
        icon: BadgeDollarSign,
        tone: "emerald",
        href: "/dashboard/revenue-registration",
      });
    }
  }

  const showRecentLeads = canAccess(permissions, isSuperAdmin, ["leads.view"]);
  const showCharts = canAccess(permissions, isSuperAdmin, [
    "leads.view",
    "followups.view",
    "closed_leads.view",
    "revenue_registration.view",
  ]);
  const showRecentActivity = canAccess(permissions, isSuperAdmin, ["dashboard.view", "leads.view"]);

  if (cards.length === 0 && !showCharts && !showRecentActivity && !showRecentLeads) {
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
        <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
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
              title="Analytics hidden"
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
