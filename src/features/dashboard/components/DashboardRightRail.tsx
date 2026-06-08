import { BellDot, UserCircle } from "lucide-react";

import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";

type ActivityItem = {
  title: string;
  time: string;
  detail: string;
};

export function DashboardRightRail({ activities }: { activities: ActivityItem[] }) {
  return (
    <DashboardCard
      title="Recent Activity"
      description="Latest updates across leads, reports, and internal operations."
      action={
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10">
          <BellDot size={14} />
          Live
        </span>
      }
      className="h-full shadow-sm shadow-blue-950/5"
    >
      {activities.length === 0 ? (
        <EmptyState
          icon={BellDot}
          title="No Leads Found"
          description="Activity updates will appear here as the database receives new lead actions."
        />
      ) : (
        <div className="relative grid gap-1">
          <span className="absolute bottom-5 left-5 top-5 w-px bg-blue-100 dark:bg-blue-500/20" />
          {activities.map((activity) => {
            const displayName = activity.title.replace(/\s+followup$/i, "") || "Workspace User";

            return (
            <div
              key={`${activity.title}-${activity.time}`}
              className="group relative pl-12"
            >
              <span className="absolute left-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-600 shadow-sm dark:border-blue-500/20 dark:bg-[var(--bg-sidebar)]">
                <UserCircle size={21} />
              </span>
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:bg-blue-50/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-blue-500/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight">{displayName}</p>
                    <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-200">
                      {activity.title}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-slate-500">{activity.time}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-soft">{activity.detail}</p>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
