"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Globe2,
  Building2,
  FileText,
  DollarSign,
  TrendingUp,
  BarChart3,
  Loader2,
} from "lucide-react";
import type {
  CountryAnalyticsItem,
  OfficeAnalyticsItem,
  TrackingReportSummary,
} from "@/features/registration/server/tracking-report.service";

interface RevenueAnalyticsProps {
  countryAnalytics: CountryAnalyticsItem[];
  officeAnalytics: OfficeAnalyticsItem[];
  summary: TrackingReportSummary;
  loading?: boolean;
}

function formatCurrency(amount: number): string {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function formatShortCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}k`;
  }
  return `₹${amount}`;
}

// Custom Tooltip displaying exact values
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 min-w-[200px]">
      <p className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:border-slate-800 dark:text-slate-100">
        {data.name}
      </p>

      <div className="mt-2 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Documents:
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {Number(data.totalDocuments || 0).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Charges:
          </span>
          <span className="font-bold text-blue-700 dark:text-blue-400">
            {formatCurrency(data.totalCharges || 0)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Paid:
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(data.totalPaid || 0)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Balance:
          </span>
          <span className="font-bold text-amber-700 dark:text-amber-400">
            {formatCurrency(data.totalBalance || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RevenueAnalytics({
  countryAnalytics,
  officeAnalytics,
  summary,
  loading = false,
}: RevenueAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<"country" | "office">("country");

  // Transform data for charting
  const chartData = useMemo(() => {
    if (activeTab === "country") {
      return (countryAnalytics || []).map((item) => ({
        name: item.country,
        totalDocuments: item.totalDocuments,
        totalCharges: item.totalCharges,
        totalPaid: item.totalPaid,
        totalBalance: item.totalBalance,
      }));
    }
    return (officeAnalytics || []).map((item) => ({
      name: item.office,
      totalDocuments: item.totalDocuments,
      totalCharges: item.totalCharges,
      totalPaid: item.totalPaid,
      totalBalance: item.totalBalance,
    }));
  }, [activeTab, countryAnalytics, officeAnalytics]);

  const hasData = chartData.length > 0 && summary.totalDocuments > 0;

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex h-72 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Loading Revenue Analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900 transition-all">
      {/* Header with Title and View Navigation Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              Revenue Overview
            </h2>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {activeTab === "country"
              ? "Country-level performance: Document counts and revenue breakdown"
              : "Office-level comparison across selected branch operations"}
          </p>
        </div>

        {/* View Switcher: Country Analytics vs Office Analytics */}
        <div className="inline-flex rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => setActiveTab("country")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "country"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            Country Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("office")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "office"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Office Analytics
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Documents
            </p>
            <p className="truncate text-base font-extrabold text-slate-900 dark:text-white">
              {summary.totalDocuments.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Charges
            </p>
            <p className="truncate text-base font-extrabold text-blue-700 dark:text-blue-400">
              {formatCurrency(summary.totalCharges)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Paid
            </p>
            <p className="truncate text-base font-extrabold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(summary.totalPaid)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Balance
            </p>
            <p className="truncate text-base font-extrabold text-amber-700 dark:text-amber-400">
              {formatCurrency(summary.totalBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      {!hasData ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-850/40">
          <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            No revenue data available
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Try changing the selected offices or date range.
          </p>
        </div>
      ) : (
        <div className="mt-2 h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 30, left: 10, bottom: 25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94a3b8"
                opacity={0.2}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
                interval={0}
                angle={chartData.length > 5 ? -20 : 0}
                textAnchor={chartData.length > 5 ? "end" : "middle"}
                height={chartData.length > 5 ? 50 : 30}
              />
              {/* Left Y-Axis for Currency */}
              <YAxis
                yAxisId="currency"
                orientation="left"
                tickFormatter={formatShortCurrency}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              {/* Right Y-Axis for Document Count */}
              <YAxis
                yAxisId="count"
                orientation="right"
                tickFormatter={(v) => Number(v).toLocaleString("en-IN")}
                tick={{ fontSize: 10, fill: "#8b5cf6" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{
                  paddingBottom: "12px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              />
              {/* Currency Metric Bars on Left Axis */}
              <Bar
                yAxisId="currency"
                dataKey="totalCharges"
                name="Total Charges"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                yAxisId="currency"
                dataKey="totalPaid"
                name="Total Paid"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                yAxisId="currency"
                dataKey="totalBalance"
                name="Total Balance"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              {/* Document Count Bar on Right Axis */}
              <Bar
                yAxisId="count"
                dataKey="totalDocuments"
                name="Total Documents"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
