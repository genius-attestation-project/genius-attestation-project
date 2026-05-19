import { BellDot } from "lucide-react";

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
      className="h-full"
    >
      {activities.length === 0 ? (
        <EmptyState
          icon={BellDot}
          title="No Leads Found"
          description="Activity updates will appear here as the database receives new lead actions."
        />
      ) : (
        <div className="grid gap-4">
          {activities.map((activity) => (
            <div
              key={`${activity.title}-${activity.time}`}
              className="relative rounded-xl border border-slate-100 bg-slate-50/80 p-4 pl-5 dark:border-white/10 dark:bg-white/5"
            >
              <span className="absolute left-4 top-5 h-2 w-2 rounded-full bg-blue-600" />
              <div className="pl-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold tracking-tight">{activity.title}</p>
                  <p className="text-xs font-medium text-slate-500">{activity.time}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-soft">{activity.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
