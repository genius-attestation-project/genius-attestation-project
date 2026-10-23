"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Globe2,
  Building2,
  FileText,
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type {
  CountryAnalyticsItem,
  OfficeAnalyticsItem,
  TrackingReportSummary,
} from "@/features/registration/server/tracking-report.service";

export type MetricType = "charges" | "paid" | "balance" | "documents";

interface RevenueAnalyticsProps {
  countryAnalytics: CountryAnalyticsItem[];
  officeAnalytics: OfficeAnalyticsItem[];
  summary: TrackingReportSummary;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

// Full currency formatting with Indian grouping and two decimal places (e.g. ₹27,42,845.50)
function formatFullCurrency(amount: number): string {
  const num = Number(amount || 0);
  return (
    "₹" +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Compact formatting for high-level badges and bar ends (e.g. ₹27.4L, ₹1.8L, 452)
function formatCompact(amount: number, isCurrency: boolean): string {
  const num = Number(amount || 0);
  const abs = Math.abs(num);

  if (isCurrency) {
    if (abs >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)}Cr`;
    }
    if (abs >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`;
    }
    if (abs >= 1000) {
      return `₹${(num / 1000).toFixed(1)}k`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  }

  // Count formatting
  if (abs >= 10000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString("en-IN");
}

// Metric configuration with branding colors and icons
const METRICS: Array<{
  id: MetricType;
  label: string;
  shortLabel: string;
  color: string;
  barColor: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  activeBorder: string;
  activeBg: string;
  activeRing: string;
  activeText: string;
  dotBg: string;
  isCurrency: boolean;
}> = [
  {
    id: "charges",
    label: "Total Charges",
    shortLabel: "Charges",
    color: "#2563eb",
    barColor: "#2563eb",
    icon: DollarSign,
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
    iconColor: "text-blue-600 dark:text-blue-400",
    activeBorder: "border-blue-500 dark:border-blue-500",
    activeBg: "bg-blue-50/70 dark:bg-blue-950/40",
    activeRing: "ring-2 ring-blue-500/20",
    activeText: "text-blue-700 dark:text-blue-300",
    dotBg: "bg-blue-600",
    isCurrency: true,
  },
  {
    id: "paid",
    label: "Total Paid",
    shortLabel: "Paid",
    color: "#10b981",
    barColor: "#10b981",
    icon: CheckCircle2,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    activeBorder: "border-emerald-500 dark:border-emerald-500",
    activeBg: "bg-emerald-50/70 dark:bg-emerald-950/40",
    activeRing: "ring-2 ring-emerald-500/20",
    activeText: "text-emerald-700 dark:text-emerald-300",
    dotBg: "bg-emerald-600",
    isCurrency: true,
  },
  {
    id: "balance",
    label: "Total Balance",
    shortLabel: "Balance",
    color: "#f59e0b",
    barColor: "#f59e0b",
    icon: Clock,
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
    activeBorder: "border-amber-500 dark:border-amber-500",
    activeBg: "bg-amber-50/70 dark:bg-amber-950/40",
    activeRing: "ring-2 ring-amber-500/20",
    activeText: "text-amber-700 dark:text-amber-300",
    dotBg: "bg-amber-600",
    isCurrency: true,
  },
  {
    id: "documents",
    label: "Total Documents",
    shortLabel: "Documents",
    color: "#8b5cf6",
    barColor: "#8b5cf6",
    icon: FileText,
    iconBg: "bg-violet-100 dark:bg-violet-950/60",
    iconColor: "text-violet-600 dark:text-violet-400",
    activeBorder: "border-violet-500 dark:border-violet-500",
    activeBg: "bg-violet-50/70 dark:bg-violet-950/40",
    activeRing: "ring-2 ring-violet-500/20",
    activeText: "text-violet-700 dark:text-violet-300",
    dotBg: "bg-violet-600",
    isCurrency: false,
  },
];

// Custom Tooltip providing comprehensive context (all 4 metrics)
function CustomAnalyticsTooltip({ active, payload, activeMetric }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 min-w-[240px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
          {data.name}
        </span>
        {data.rank && (
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
            #{data.rank}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-2 text-xs">
        {/* Documents */}
        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
            activeMetric === "documents"
              ? "bg-violet-50 dark:bg-violet-950/50 font-bold"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Documents:
          </span>
          <span className="font-extrabold text-slate-900 dark:text-white">
            {Number(data.totalDocuments || 0).toLocaleString("en-IN")}
          </span>
        </div>

        {/* Charges */}
        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
            activeMetric === "charges"
              ? "bg-blue-50 dark:bg-blue-950/50 font-bold text-blue-700 dark:text-blue-300"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Charges:
          </span>
          <span className="font-extrabold text-blue-700 dark:text-blue-400">
            {formatFullCurrency(data.totalCharges || 0)}
          </span>
        </div>

        {/* Paid */}
        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
            activeMetric === "paid"
              ? "bg-emerald-50 dark:bg-emerald-950/50 font-bold text-emerald-700 dark:text-emerald-300"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Paid:
          </span>
          <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
            {formatFullCurrency(data.totalPaid || 0)}
          </span>
        </div>

        {/* Balance */}
        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
            activeMetric === "balance"
              ? "bg-amber-50 dark:bg-amber-950/50 font-bold text-amber-700 dark:text-amber-300"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Balance:
          </span>
          <span className="font-extrabold text-amber-700 dark:text-amber-400">
            {formatFullCurrency(data.totalBalance || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RevenueAnalytics({
  countryAnalytics = [],
  officeAnalytics = [],
  summary,
  loading = false,
  error,
  onRetry,
}: RevenueAnalyticsProps) {
  // Navigation view: Country Analytics vs Office Analytics
  const [activeTab, setActiveTab] = useState<"country" | "office">("country");

  // Selected primary metric (one at a time to prevent scale collisions)
  const [activeMetric, setActiveMetric] = useState<MetricType>("charges");

  // Display limit: Top 5, Top 10, Top 15, or All
  const [topLimit, setTopLimit] = useState<"5" | "10" | "15" | "all">("10");

  const currentMetricConfig = useMemo(() => {
    return METRICS.find((m) => m.id === activeMetric) || METRICS[0];
  }, [activeMetric]);

  // Sort categories descending by the currently selected metric
  const sortedRawData = useMemo(() => {
    const source = activeTab === "country" ? countryAnalytics : officeAnalytics;
    if (!source || source.length === 0) return [];

    return [...source].sort((a, b) => {
      if (activeMetric === "documents") return b.totalDocuments - a.totalDocuments;
      if (activeMetric === "charges") return b.totalCharges - a.totalCharges;
      if (activeMetric === "paid") return b.totalPaid - a.totalPaid;
      return b.totalBalance - a.totalBalance;
    });
  }, [activeTab, activeMetric, countryAnalytics, officeAnalytics]);

  // Apply topLimit slice and format items for the horizontal bar chart
  const visibleData = useMemo(() => {
    const limit = topLimit === "all" ? sortedRawData.length : parseInt(topLimit, 10);
    const sliced = sortedRawData.slice(0, limit);

    return sliced.map((item: any, index: number) => {
      const name = activeTab === "country" ? item.country : item.office;
      let val = 0;
      if (activeMetric === "documents") val = item.totalDocuments;
      else if (activeMetric === "charges") val = item.totalCharges;
      else if (activeMetric === "paid") val = item.totalPaid;
      else val = item.totalBalance;

      return {
        rank: index + 1,
        name: name || "Unassigned",
        value: val,
        displayValue: formatCompact(val, currentMetricConfig.isCurrency),
        totalDocuments: item.totalDocuments || 0,
        totalCharges: item.totalCharges || 0,
        totalPaid: item.totalPaid || 0,
        totalBalance: item.totalBalance || 0,
      };
    });
  }, [sortedRawData, topLimit, activeMetric, activeTab, currentMetricConfig.isCurrency]);

  const hasData = visibleData.length > 0 && summary.totalDocuments > 0;

  // Responsive chart height based on the number of bars rendered
  const chartHeight = useMemo(() => {
    const count = visibleData.length;
    if (count <= 3) return 180;
    if (count <= 5) return 260;
    if (count <= 10) return 400;
    if (count <= 15) return 560;
    return Math.max(300, count * 36 + 60);
  }, [visibleData.length]);

  // Contextual summary text above the graph
  const contextualSummary = useMemo(() => {
    const entityCount = sortedRawData.length;
    const entityLabel = activeTab === "country" ? (entityCount === 1 ? "country" : "countries") : (entityCount === 1 ? "office" : "offices");

    if (activeMetric === "charges") {
      return {
        title: "Total Charges",
        value: formatCompact(summary.totalCharges, true),
        subtitle: `Across ${summary.totalDocuments.toLocaleString("en-IN")} documents in ${entityCount} ${entityLabel}`,
      };
    }
    if (activeMetric === "paid") {
      const pct = summary.totalCharges > 0 ? ((summary.totalPaid / summary.totalCharges) * 100).toFixed(1) : "0";
      return {
        title: "Total Paid",
        value: formatCompact(summary.totalPaid, true),
        subtitle: `Collection rate: ${pct}% • Total billed: ${formatCompact(summary.totalCharges, true)}`,
      };
    }
    if (activeMetric === "balance") {
      return {
        title: "Total Balance",
        value: formatCompact(summary.totalBalance, true),
        subtitle: `Pending collection across ${summary.totalDocuments.toLocaleString("en-IN")} documents`,
      };
    }
    return {
      title: "Total Documents",
      value: summary.totalDocuments.toLocaleString("en-IN"),
      subtitle: `Registered across ${entityCount} ${entityLabel}`,
    };
  }, [activeMetric, summary, sortedRawData.length, activeTab]);

  // Helper to format metric values for selector badges
  const getMetricSummaryValue = (metricId: MetricType) => {
    if (metricId === "charges") return formatCompact(summary.totalCharges, true);
    if (metricId === "paid") return formatCompact(summary.totalPaid, true);
    if (metricId === "balance") return formatCompact(summary.totalBalance, true);
    return summary.totalDocuments.toLocaleString("en-IN");
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-slate-900 transition-all">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-3 w-64 rounded-md bg-slate-100 dark:bg-slate-850 animate-pulse" />
          </div>
          <div className="h-9 w-56 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>

        <div className="space-y-3 pt-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-28 rounded-md bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
              <div
                className="h-7 rounded-r-xl bg-slate-100 dark:bg-slate-850 animate-pulse"
                style={{ width: `${90 - i * 14}%` }}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // 2. Error State
  if (error && !hasData) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50/50 p-8 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/20 text-center">
        <div className="flex flex-col items-center justify-center gap-2.5">
          <AlertCircle className="h-9 w-9 text-rose-500" />
          <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200">
            Unable to load revenue analytics
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-300 max-w-md">
            {error || "An error occurred while aggregating revenue data. Please try again."}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Analytics
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900 transition-all">
      {/* 1. Header with View Toggle (Country Analytics vs Office Analytics) */}
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
              ? "Country-level performance: Ranked comparison across registered territories"
              : "Office-level performance: Ranked comparison across active branches"}
          </p>
        </div>

        {/* Segmented View Switcher */}
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

      {/* 2. Interactive Metric Selectors (Separates scales visually and shows totals) */}
      <div className="pt-4 pb-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Select Primary Metric
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {METRICS.map((m) => {
            const isSelected = activeMetric === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMetric(m.id)}
                className={`flex items-center justify-between gap-2.5 rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? `${m.activeBorder} ${m.activeBg} ${m.activeRing} shadow-xs`
                    : "border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${m.iconBg} ${m.iconColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {m.label}
                    </span>
                    <span
                      className={`block truncate text-sm font-extrabold ${
                        isSelected ? m.activeText : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {getMetricSummaryValue(m.id)}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className={`h-2 w-2 rounded-full ${m.dotBg} shrink-0`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Smart Graph Header & Top Limit Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 pb-2 border-t border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {contextualSummary.title}:
            </span>
            <span
              className={`text-sm font-black ${currentMetricConfig.activeText}`}
            >
              {contextualSummary.value}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {contextualSummary.subtitle}
          </p>
        </div>

        {/* Top N Filter (Top 5, Top 10, Top 15, All) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Show:
          </span>
          <select
            value={topLimit}
            onChange={(e) => setTopLimit(e.target.value as "5" | "10" | "15" | "all")}
            className="h-8 rounded-xl border border-slate-200/80 bg-slate-50/60 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="15">Top 15</option>
            <option value="all">All ({sortedRawData.length})</option>
          </select>
        </div>
      </div>

      {/* 4. Main Ranked Horizontal Bar Chart Area */}
      {!hasData ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-850/40 mt-3">
          <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            No revenue data available
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            There are no records matching the selected offices and date range.
          </p>
        </div>
      ) : (
        <div className="mt-2 max-h-[500px] overflow-y-auto pr-1">
          <div style={{ height: `${chartHeight}px`, minHeight: "220px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={visibleData}
                layout="vertical"
                margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
                barSize={20}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#94a3b8"
                  opacity={0.15}
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCompact(v, currentMetricConfig.isCurrency)}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomAnalyticsTooltip activeMetric={activeMetric} />}
                />
                <Bar
                  dataKey="value"
                  fill={currentMetricConfig.barColor}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={true}
                  animationDuration={350}
                  background={{ fill: "rgba(148, 163, 184, 0.08)", radius: 6 }}
                >
                  <LabelList
                    dataKey="displayValue"
                    position="right"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      fill: "#475569",
                    }}
                    offset={8}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Helpful hover hint at bottom */}
      {hasData && (
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Hover over any bar to view complete revenue & document details</span>
          <span className="font-semibold text-slate-500">
            Sorted by {currentMetricConfig.shortLabel} (Highest first)
          </span>
        </div>
      )}
    </section>
  );
}
