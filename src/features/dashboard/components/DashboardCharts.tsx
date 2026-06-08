"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";

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
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <DashboardCard
        title="Analytics Overview"
        description="Monthly lead volume and revenue movement."
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
            <TrendingUp size={14} />
            Live metrics
          </span>
        }
        className="shadow-sm shadow-blue-950/5"
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">Monthly Leads</p>
                <p className="mt-1 text-xs text-soft">Lead intake by month</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                <BarChart3 size={18} />
              </span>
            </div>
            <div className="min-w-0 overflow-x-auto">
              <div className="flex h-64 min-w-[360px] items-end justify-center gap-3">
                {monthlyLeads.map((point, index) => (
                  <motion.div
                    key={point.month}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-48 w-full items-end rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
                      <div
                        className="w-full rounded-lg bg-linear-to-t from-blue-700 via-blue-500 to-sky-300 shadow-sm shadow-blue-500/20"
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
          </div>

          <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">Revenue Trend</p>
                <p className="mt-1 text-xs text-soft">Approved revenue by month</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                <TrendingUp size={18} />
              </span>
            </div>
            <div className="grid gap-3">
              {revenueTrends.map((item, index) => (
                <motion.div
                  key={item.month}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 transition hover:border-blue-100 hover:bg-blue-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-blue-500/10"
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-soft">
                      {item.month}
                    </p>
                    <p className="text-sm font-semibold">${Math.round(item.value).toLocaleString()}</p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-500/10">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-700 via-blue-500 to-sky-300"
                      style={{ width: `${(item.value / maxRevenue) * 100}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {followupCounts.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-500/15 dark:bg-blue-500/10"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold">{item.value}</p>
              <p className="text-sm text-soft">Scheduled followups</p>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Status Distribution"
        description="How current lead volume is distributed by stage."
        className="shadow-sm shadow-blue-950/5"
      >
        <div className="grid gap-3">
          {leadsByStatus.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md dark:border-white/10 dark:bg-white/5"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">{item.label}</p>
                  <p className="mt-1 text-sm text-soft">{item.value.toLocaleString()} Leads</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                  {item.rate}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-700 via-blue-500 to-sky-300"
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
