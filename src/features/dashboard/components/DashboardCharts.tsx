"use client";

import { motion } from "framer-motion";

import { DashboardCard } from "@/components/ui/DashboardCard";

type DashboardChartsProps = {
  monthlyLeads: Array<{
    month: string;
    value: number;
  }>;
  revenueTrends: Array<{
    month: string;
    value: number;
  }>;
  leadsByStatus: Array<{
    label: string;
    value: number;
    rate: string;
  }>;
  followupCounts: Array<{
    label: string;
    value: number;
  }>;
};

export function DashboardCharts({
  monthlyLeads,
  revenueTrends,
  leadsByStatus,
  followupCounts,
}: DashboardChartsProps) {
  const maxLeadCount = Math.max(...monthlyLeads.map((point) => point.value), 1);
  const maxRevenue = Math.max(...revenueTrends.map((point) => point.value), 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <DashboardCard
        title="Analytics Overview"
        description="Live lead volume, revenue trend, and followup activity."
      >
        <div className="grid gap-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-semibold tracking-tight">Monthly Leads</p>
              <div className="flex h-72 items-end gap-3">
                {monthlyLeads.map((point, index) => (
                  <motion.div
                    key={point.month}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-1 flex-col items-center gap-3"
                  >
                    <div className="flex h-60 w-full items-end rounded-xl bg-blue-50 p-2 dark:bg-blue-500/10">
                      <div
                        className="w-full rounded-lg bg-linear-to-t from-blue-700 via-blue-600 to-sky-400"
                        style={{ height: `${(point.value / maxLeadCount) * 100}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-soft">
                        {point.month}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{point.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold tracking-tight">Revenue Trend</p>
              <div className="grid gap-3">
                {revenueTrends.map((item, index) => (
                  <motion.div
                    key={item.month}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-soft">
                        {item.month}
                      </p>
                      <p className="text-sm font-semibold">${Math.round(item.value).toLocaleString()}</p>
                    </div>
                    <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-500/10">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-blue-600 to-sky-400"
                        style={{ width: `${(item.value / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {followupCounts.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-blue-500/10"
              >
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-soft">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold">{item.value}</p>
                <p className="text-sm text-soft">Scheduled followups</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Status Distribution"
        description="How current lead volume is distributed by stage."
      >
        <div className="grid gap-4">
          {leadsByStatus.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold tracking-tight">{item.label}</p>
                  <p className="text-sm text-soft">{item.value.toLocaleString()} records</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10">
                  {item.rate}
                </span>
              </div>
              <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-500/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-600 to-sky-400"
                  style={{ width: item.rate }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
