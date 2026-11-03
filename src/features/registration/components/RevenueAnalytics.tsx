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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Globe2,
  Building2,
  FileText,
  DollarSign,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  Layers,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import type {
  CountryAnalyticsItem,
  OfficeAnalyticsItem,
  CountryOfficeAnalyticsItem,
  TrackingReportSummary,
} from "@/features/registration/server/tracking-report.service";

export type MetricType = "charges" | "paid" | "balance" | "documents";

interface RevenueAnalyticsProps {
  countryAnalytics: CountryAnalyticsItem[];
  officeAnalytics: OfficeAnalyticsItem[];
  countryOfficeAnalytics?: CountryOfficeAnalyticsItem[];
  summary: TrackingReportSummary;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  fromDate?: string;
  toDate?: string;
}

// Full currency formatting with Indian grouping (e.g. ₹22,52,000.00)
function formatFullCurrency(amount: number): string {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Compact formatting for high-level badges and bar ends (e.g. 22.52L, 9.37L, 401)
function formatCompact(amount: number, isCurrency: boolean): string {
  const num = Number(amount || 0);
  const abs = Math.abs(num);

  if (isCurrency) {
    if (abs >= 10000000) {
      return `${(num / 10000000).toFixed(2)}Cr`;
    }
    if (abs >= 100000) {
      return `${(num / 100000).toFixed(2)}L`;
    }
    if (abs >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString("en-IN");
  }

  // Count formatting (Documents)
  if (abs >= 100000) {
    return `${(num / 100000).toFixed(2)}L`;
  }
  if (abs >= 10000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString("en-IN");
}

// Color palette for territory visualizations matching the dark theme reference
const DONUT_COLORS: Record<string, string> = {
  India: "#3b82f6", // Electric Blue
  UAE: "#14b8a6", // Teal
  Qatar: "#fb923c", // Warm Coral / Orange
  Kuwait: "#8b5cf6", // Violet
  Bahrain: "#ec4899", // Rose / Pink
  Oman: "#f59e0b", // Amber
  "Saudi Arabia": "#10b981", // Emerald
};

const FALLBACK_PALETTE = [
  "#3b82f6",
  "#14b8a6",
  "#fb923c",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
];

function getCountryColor(countryName: string, index: number): string {
  return DONUT_COLORS[countryName] || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

// Metric configuration with dark-theme styling
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
  activeGlow: string;
  activeText: string;
  dotBg: string;
  isCurrency: boolean;
}> = [
  {
    id: "charges",
    label: "Total Charges",
    shortLabel: "Charges",
    color: "#3b82f6",
    barColor: "#3b82f6",
    icon: DollarSign,
    iconBg: "bg-blue-500/15 border border-blue-500/30",
    iconColor: "text-blue-400",
    activeBorder: "border-blue-500",
    activeBg: "bg-blue-950/40",
    activeGlow: "shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/50",
    activeText: "text-blue-400",
    dotBg: "bg-blue-500",
    isCurrency: true,
  },
  {
    id: "paid",
    label: "Total Paid",
    shortLabel: "Paid",
    color: "#10b981",
    barColor: "#10b981",
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/15 border border-emerald-500/30",
    iconColor: "text-emerald-400",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-950/40",
    activeGlow: "shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50",
    activeText: "text-emerald-400",
    dotBg: "bg-emerald-500",
    isCurrency: true,
  },
  {
    id: "balance",
    label: "Total Balance",
    shortLabel: "Balance",
    color: "#f59e0b",
    barColor: "#f59e0b",
    icon: Clock,
    iconBg: "bg-amber-500/15 border border-amber-500/30",
    iconColor: "text-amber-400",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-950/40",
    activeGlow: "shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/50",
    activeText: "text-amber-400",
    dotBg: "bg-amber-500",
    isCurrency: true,
  },
  {
    id: "documents",
    label: "Total Documents",
    shortLabel: "Documents",
    color: "#8b5cf6",
    barColor: "#8b5cf6",
    icon: FileText,
    iconBg: "bg-violet-500/15 border border-violet-500/30",
    iconColor: "text-violet-400",
    activeBorder: "border-violet-500",
    activeBg: "bg-violet-950/40",
    activeGlow: "shadow-[0_0_20px_rgba(139,92,246,0.25)] ring-1 ring-violet-500/50",
    activeText: "text-violet-400",
    dotBg: "bg-violet-500",
    isCurrency: false,
  },
];

// Custom Dark Tooltip for Charts
function CustomDarkTooltip({ active, payload, activeMetric }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0f172a]/95 p-3.5 shadow-2xl backdrop-blur-md text-white min-w-[240px]">
      <div className="flex items-start justify-between border-b border-slate-800 pb-2 gap-2">
        <div>
          <span className="font-bold text-xs text-slate-100 truncate max-w-[190px] block">
            {data.name || data.country || data.office}
          </span>
          {data.country && data.country !== data.name && (
            <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
              Country: <span className="font-semibold text-slate-200">{data.country}</span>
            </span>
          )}
        </div>
        {data.rank && (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
            #{data.rank}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5 text-xs">
        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded transition-colors ${
            activeMetric === "documents"
              ? "bg-violet-950/60 font-bold text-violet-300"
              : "text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Documents:
          </span>
          <span className="font-bold text-white">
            {Number(data.totalDocuments || 0).toLocaleString("en-IN")}
          </span>
        </div>

        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded transition-colors ${
            activeMetric === "charges"
              ? "bg-blue-950/60 font-bold text-blue-300"
              : "text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Charges:
          </span>
          <span className="font-bold text-blue-400">
            {formatFullCurrency(data.totalCharges || 0)}
          </span>
        </div>

        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded transition-colors ${
            activeMetric === "paid"
              ? "bg-emerald-950/60 font-bold text-emerald-300"
              : "text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Paid:
          </span>
          <span className="font-bold text-emerald-400">
            {formatFullCurrency(data.totalPaid || 0)}
          </span>
        </div>

        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded transition-colors ${
            activeMetric === "balance"
              ? "bg-amber-950/60 font-bold text-amber-300"
              : "text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Balance:
          </span>
          <span className="font-bold text-amber-400">
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
  countryOfficeAnalytics = [],
  summary,
  loading = false,
  error,
  onRetry,
  fromDate,
  toDate,
}: RevenueAnalyticsProps) {
  // Selected primary metric (charges, paid, balance, documents)
  const [activeMetric, setActiveMetric] = useState<MetricType>("charges");

  // Country Drill-Down state: "all" or specific country name (e.g. "India", "UAE", "Qatar")
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

  // Focused Office (Level 3 of drill-down): null or office name
  const [focusedOffice, setFocusedOffice] = useState<string | null>(null);

  // Office search query
  const [officeSearch, setOfficeSearch] = useState<string>("");

  // Top limit for offices: "5" | "10" | "15" | "all"
  const [officeTopLimit, setOfficeTopLimit] = useState<"5" | "10" | "15" | "all">("all");

  const currentMetricConfig = useMemo(() => {
    return METRICS.find((m) => m.id === activeMetric) || METRICS[0];
  }, [activeMetric]);

  // Metric value extractor helper
  const getMetricValue = (item: {
    totalDocuments: number;
    totalCharges: number;
    totalPaid: number;
    totalBalance: number;
  }) => {
    if (activeMetric === "documents") return item.totalDocuments;
    if (activeMetric === "charges") return item.totalCharges;
    if (activeMetric === "paid") return item.totalPaid;
    return item.totalBalance;
  };

  // Helper to format metric values for selector badges
  const getMetricSummaryValue = (metricId: MetricType) => {
    if (metricId === "charges") return formatCompact(summary.totalCharges, true);
    if (metricId === "paid") return formatCompact(summary.totalPaid, true);
    if (metricId === "balance") return formatCompact(summary.totalBalance, true);
    return summary.totalDocuments.toLocaleString("en-IN");
  };

  // --- 1. CONSTRUCT STRUCTURED COUNTRY-OFFICE HIERARCHY ---
  const structuredCountryOfficeData = useMemo<CountryOfficeAnalyticsItem[]>(() => {
    if (countryOfficeAnalytics && countryOfficeAnalytics.length > 0) {
      return countryOfficeAnalytics;
    }

    // Dynamic fallback grouping from officeAnalytics if countryOfficeAnalytics is empty
    const countryMap = new Map<string, { country: string; offices: OfficeAnalyticsItem[] }>();
    for (const o of officeAnalytics) {
      const c = o.country || "India";
      if (!countryMap.has(c)) {
        countryMap.set(c, { country: c, offices: [] });
      }
      countryMap.get(c)!.offices.push(o);
    }

    return Array.from(countryMap.values()).map((g) => {
      const offices = g.offices.sort((a, b) => getMetricValue(b) - getMetricValue(a));
      return {
        country: g.country,
        totalDocuments: offices.reduce((sum, o) => sum + o.totalDocuments, 0),
        totalCharges: offices.reduce((sum, o) => sum + o.totalCharges, 0),
        totalPaid: offices.reduce((sum, o) => sum + o.totalPaid, 0),
        totalBalance: offices.reduce((sum, o) => sum + o.totalBalance, 0),
        totalOffices: offices.length,
        offices,
      };
    });
  }, [countryOfficeAnalytics, officeAnalytics, activeMetric]);

  // --- 2. COUNTRY ANALYTICS DATA (Sorted by selected metric) ---
  const sortedCountryList = useMemo(() => {
    const list =
      countryAnalytics && countryAnalytics.length > 0
        ? [...countryAnalytics]
        : structuredCountryOfficeData.map((c) => ({
            country: c.country,
            totalDocuments: c.totalDocuments,
            totalCharges: c.totalCharges,
            totalPaid: c.totalPaid,
            totalBalance: c.totalBalance,
            totalOffices: c.offices.length,
          }));

    return list.sort((a, b) => getMetricValue(b) - getMetricValue(a));
  }, [countryAnalytics, structuredCountryOfficeData, activeMetric]);

  // Total metric value across all countries for percentage share calculation
  const totalMetricSum = useMemo(() => {
    return sortedCountryList.reduce((sum, c) => sum + getMetricValue(c), 0);
  }, [sortedCountryList, activeMetric]);

  // Donut Chart Data (Distribution across countries)
  const donutChartData = useMemo(() => {
    return sortedCountryList.map((item, idx) => {
      const val = getMetricValue(item);
      const percentage = totalMetricSum > 0 ? (val / totalMetricSum) * 100 : 0;
      return {
        name: item.country,
        value: val,
        percentage: Number(percentage.toFixed(1)),
        color: getCountryColor(item.country, idx),
        displayValue: formatCompact(val, currentMetricConfig.isCurrency),
        totalDocuments: item.totalDocuments || 0,
        totalCharges: item.totalCharges || 0,
        totalPaid: item.totalPaid || 0,
        totalBalance: item.totalBalance || 0,
        totalOffices: item.totalOffices || 1,
      };
    });
  }, [sortedCountryList, totalMetricSum, activeMetric, currentMetricConfig.isCurrency]);

  // Country Comparison Bar Chart Data
  const countryBarData = useMemo(() => {
    return sortedCountryList.map((item, index) => {
      const val = getMetricValue(item);
      return {
        rank: index + 1,
        name: item.country,
        value: val,
        displayValue: formatCompact(val, currentMetricConfig.isCurrency),
        color: getCountryColor(item.country, index),
        totalDocuments: item.totalDocuments || 0,
        totalCharges: item.totalCharges || 0,
        totalPaid: item.totalPaid || 0,
        totalBalance: item.totalBalance || 0,
        totalOffices: item.totalOffices || 1,
      };
    });
  }, [sortedCountryList, activeMetric, currentMetricConfig.isCurrency]);

  // Max value for country bar chart to ensure headroom for labels
  const maxCountryValue = useMemo(() => {
    const max = Math.max(...countryBarData.map((d) => d.value), 0);
    return max > 0 ? max * 1.15 : 100;
  }, [countryBarData]);

  // Collection Efficiency Calculation
  const collectionEfficiency = useMemo(() => {
    if (!summary || summary.totalCharges <= 0) return 0;
    return Math.min(100, Math.round((summary.totalPaid / summary.totalCharges) * 100));
  }, [summary]);

  // Available Countries with Office Counts for Quick Pills
  const availableCountries = useMemo(() => {
    return structuredCountryOfficeData.map((c) => ({
      country: c.country,
      officeCount: c.offices.length,
      metricValue: getMetricValue(c),
    }));
  }, [structuredCountryOfficeData, activeMetric]);

  // --- 3. FILTERED OFFICES FOR OFFICE-WISE BREAKDOWN ---
  const currentOfficesList = useMemo(() => {
    let offices: OfficeAnalyticsItem[] = [];

    if (selectedCountry === "all") {
      for (const c of structuredCountryOfficeData) {
        offices.push(...c.offices);
      }
    } else {
      const matched = structuredCountryOfficeData.find((c) => c.country === selectedCountry);
      if (matched) {
        offices = [...matched.offices];
      }
    }

    // Apply office name text search if user typed a search query
    if (officeSearch.trim()) {
      const q = officeSearch.trim().toLowerCase();
      offices = offices.filter((o) => o.office.toLowerCase().includes(q));
    }

    // Sort descending by active metric
    offices.sort((a, b) => getMetricValue(b) - getMetricValue(a));

    // Apply officeTopLimit if not "all"
    if (officeTopLimit !== "all") {
      const limit = parseInt(officeTopLimit, 10);
      offices = offices.slice(0, limit);
    }

    return offices;
  }, [structuredCountryOfficeData, selectedCountry, officeSearch, officeTopLimit, activeMetric]);

  // Office Horizontal Bar Chart formatted data
  const officeChartData = useMemo(() => {
    return currentOfficesList.map((item, index) => {
      const val = getMetricValue(item);
      return {
        rank: index + 1,
        name: item.office,
        country: item.country,
        value: val,
        displayValue: formatCompact(val, currentMetricConfig.isCurrency),
        totalDocuments: item.totalDocuments || 0,
        totalCharges: item.totalCharges || 0,
        totalPaid: item.totalPaid || 0,
        totalBalance: item.totalBalance || 0,
      };
    });
  }, [currentOfficesList, activeMetric, currentMetricConfig.isCurrency]);

  const maxOfficeValue = useMemo(() => {
    const max = Math.max(...officeChartData.map((d) => d.value), 0);
    return max > 0 ? max * 1.15 : 100;
  }, [officeChartData]);

  // Dynamic Height for Office Horizontal Bar Chart
  const officeChartHeight = useMemo(() => {
    const count = officeChartData.length;
    if (count <= 3) return 170;
    if (count <= 6) return 260;
    if (count <= 10) return 380;
    if (count <= 15) return 520;
    return Math.min(800, count * 34 + 60);
  }, [officeChartData.length]);

  // Focused Office details (Level 3 of drill-down)
  const focusedOfficeData = useMemo(() => {
    if (!focusedOffice) return null;
    return currentOfficesList.find((o) => o.office === focusedOffice) || null;
  }, [focusedOffice, currentOfficesList]);

  // Contextual Title for Dashboard
  const activeCountryGroup = useMemo(() => {
    if (selectedCountry === "all") return null;
    return structuredCountryOfficeData.find((c) => c.country === selectedCountry) || null;
  }, [selectedCountry, structuredCountryOfficeData]);

  // Has data indicator
  const hasData = summary.totalDocuments > 0;

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-[#0B132B] p-6 sm:p-7 shadow-2xl text-slate-100 animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg bg-[#1E293B]" />
            <div className="h-3.5 w-72 rounded bg-[#131D31]" />
          </div>
          <div className="h-8 w-44 rounded-xl bg-[#1E293B]" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#131D31] border border-slate-800/60" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2">
          <div className="h-64 rounded-2xl bg-[#131D31] border border-slate-800/60" />
          <div className="h-64 rounded-2xl bg-[#131D31] border border-slate-800/60" />
          <div className="h-64 rounded-2xl bg-[#131D31] border border-slate-800/60" />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error && !hasData) {
    return (
      <div className="rounded-3xl border border-rose-900/50 bg-[#0B132B] p-8 shadow-2xl text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <h3 className="text-base font-bold text-rose-200">
            Unable to load revenue analytics
          </h3>
          <p className="text-xs text-rose-400 max-w-md">
            {error || "An error occurred while aggregating revenue data. Please try again."}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-rose-500 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Analytics
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#1E2A47] bg-[#0B132B] p-5 sm:p-7 shadow-2xl text-slate-100 space-y-6">
      {/* =========================================================================
          TOP HEADER: DASHBOARD TITLE & INTERACTIVE DRILL-DOWN BREADCRUMB
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h1 className="text-lg font-black tracking-wide text-white uppercase">
              Revenue Analytics
            </h1>
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
              Live Overview
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Ranked performance, territory distribution, and office-level drill-down
            {fromDate && toDate && (
              <span className="ml-2 font-medium text-slate-300">
                • Scope: {fromDate} to {toDate}
              </span>
            )}
          </p>
        </div>

        {/* Drill-Down Hierarchy Navigation (All Countries -> Selected Country -> Selected Office) */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="h-3 w-3 text-blue-400" />
            Drill-Down:
          </span>

          {/* Level 1: All Countries Pill */}
          <button
            type="button"
            onClick={() => {
              setSelectedCountry("all");
              setFocusedOffice(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
              selectedCountry === "all"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-[#131D31] text-slate-300 hover:bg-[#1E293B] hover:text-white border border-slate-800"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            All Countries ({sortedCountryList.length})
          </button>

          {/* Level 2: Selected Country (if selected) */}
          {selectedCountry !== "all" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <button
                type="button"
                onClick={() => setFocusedOffice(null)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
                  !focusedOffice
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-[#131D31] text-slate-300 hover:bg-[#1E293B] hover:text-white border border-slate-800"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getCountryColor(selectedCountry, 0) }}
                />
                {selectedCountry} ({activeCountryGroup?.offices.length || 0} offices)
              </button>
            </>
          )}

          {/* Level 3: Focused Office (if selected) */}
          {focusedOffice && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-lg shadow-emerald-600/30">
                <Building2 className="h-3.5 w-3.5" />
                {focusedOffice}
                <button
                  type="button"
                  onClick={() => setFocusedOffice(null)}
                  className="ml-1 text-emerald-200 hover:text-white cursor-pointer"
                  title="Clear office focus"
                >
                  ✕
                </button>
              </div>
            </>
          )}

          {/* Reset View Button (if drilled down) */}
          {(selectedCountry !== "all" || focusedOffice) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCountry("all");
                setFocusedOffice(null);
              }}
              className="ml-1 inline-flex items-center gap-1 rounded-xl bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
              title="Reset view to All Countries"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          ROW 1: REVENUE OVERVIEW SUMMARY CARDS & PRIMARY METRIC SELECTORS
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            Revenue Overview Summary Metrics (Click any card to change primary metric)
          </label>
          <span className="text-[11px] font-medium text-slate-400 hidden sm:inline-block">
            Active Metric:{" "}
            <span className={`font-bold uppercase ${currentMetricConfig.activeText}`}>
              {currentMetricConfig.label}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {METRICS.map((m) => {
            const isSelected = activeMetric === m.id;
            const Icon = m.icon;
            const summaryVal = getMetricSummaryValue(m.id);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMetric(m.id)}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  isSelected
                    ? `${m.activeBorder} ${m.activeBg} ${m.activeGlow}`
                    : "border-[#1E2A47] bg-[#121C33] hover:border-slate-700 hover:bg-[#15233E]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      {m.label}
                    </span>
                    <span className="block text-2xl font-black text-white tracking-tight truncate">
                      {summaryVal}
                    </span>
                  </div>
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${m.iconBg} ${m.iconColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="truncate">
                    {m.id === "charges" && `Across ${summary.totalDocuments} documents`}
                    {m.id === "paid" && `Collection: ${collectionEfficiency}%`}
                    {m.id === "balance" && `Pending collection`}
                    {m.id === "documents" && `In registered offices`}
                  </span>
                  {isSelected ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.activeText} bg-white/5`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${m.dotBg}`} />
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 hover:text-slate-400">
                      Select
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          ROW 2: VISUALIZATION GRID (DONUT CHART, BAR COMPARISON, EFFICIENCY GAUGE)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* A. COUNTRY REVENUE DISTRIBUTION (Donut Chart - matches Image 3 Headcount by Dept) */}
        <div className="lg:col-span-4 rounded-2xl border border-[#1E2A47] bg-[#121C33] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Revenue Distribution
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Territory share by {currentMetricConfig.shortLabel}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                Donut View
              </span>
            </div>

            {/* Donut Chart with Legend on Right */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Donut Graphic */}
              <div className="relative h-44 w-44 shrink-0 mx-auto sm:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      cornerRadius={4}
                      stroke="#0B132B"
                      strokeWidth={2}
                    >
                      {donutChartData.map((entry) => (
                        <Cell
                          key={`donut-${entry.name}`}
                          fill={entry.color}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          onClick={() => setSelectedCountry(entry.name)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDarkTooltip activeMetric={activeMetric} />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Central Donut Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total
                  </span>
                  <span className="text-xs font-black text-white">
                    {formatCompact(totalMetricSum, currentMetricConfig.isCurrency)}
                  </span>
                </div>
              </div>

              {/* Legend List on Right (Matching Image 3 layout) */}
              <div className="flex-1 space-y-2 w-full text-xs">
                {donutChartData.map((c) => {
                  const isCountrySelected = selectedCountry === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() =>
                        setSelectedCountry(selectedCountry === c.name ? "all" : c.name)
                      }
                      className={`flex w-full items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer ${
                        isCountrySelected
                          ? "bg-slate-800/90 ring-1 ring-blue-500/50"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-bold text-slate-200 text-xs truncate">
                          {c.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-white text-xs">
                          {c.percentage}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {c.displayValue}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Click any territory to drill down</span>
            <span className="font-semibold text-blue-400">
              {donutChartData.length} Territories active
            </span>
          </div>
        </div>

        {/* B. COUNTRY REVENUE COMPARISON (Bar Chart - matches Image 3 Attendance Overview) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#1E2A47] bg-[#121C33] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Country Revenue Comparison
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ranked by {currentMetricConfig.label}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                Bar View
              </span>
            </div>

            {/* Vertical or Horizontal Bar Chart */}
            <div className="h-52 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={countryBarData}
                  layout="horizontal"
                  margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
                  barSize={32}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#1E293B"
                    opacity={0.8}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompact(v, currentMetricConfig.isCurrency)}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    domain={[0, maxCountryValue]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomDarkTooltip activeMetric={activeMetric} />} />
                  <Bar
                    dataKey="value"
                    fill={currentMetricConfig.barColor}
                    radius={[6, 6, 0, 0]}
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(data: any) => {
                      if (data?.name) setSelectedCountry(data.name);
                    }}
                  >
                    <LabelList
                      dataKey="displayValue"
                      position="top"
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        fill: "#cbd5e1",
                      }}
                      offset={6}
                    />
                    {countryBarData.map((entry) => (
                      <Cell
                        key={`country-cell-${entry.name}`}
                        fill={entry.color}
                        opacity={
                          selectedCountry === "all" || selectedCountry === entry.name
                            ? 1
                            : 0.35
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Hover or click bars to focus territory</span>
            <span className="font-semibold text-slate-300">
              Top: {sortedCountryList[0]?.country || "N/A"} (
              {formatCompact(
                getMetricValue(sortedCountryList[0] || { totalDocuments: 0, totalCharges: 0, totalPaid: 0, totalBalance: 0 }),
                currentMetricConfig.isCurrency
              )}
              )
            </span>
          </div>
        </div>

        {/* C. COLLECTION EFFICIENCY & SUMMARY (Mirrors Compliance Rate & Expirations in Image 3) */}
        <div className="lg:col-span-3 rounded-2xl border border-[#1E2A47] bg-[#121C33] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Collection Efficiency
              </h3>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>

            {/* Circular Gauge Meter (Directly matching Compliance Rate in Reference Image 3) */}
            <div className="pt-4 flex flex-col items-center justify-center relative">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#1E293B"
                    strokeWidth="8"
                  />
                  {/* Progress Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * collectionEfficiency) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white">
                    {collectionEfficiency}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Paid Ratio
                  </span>
                </div>
              </div>

              {/* Glowing Wave graphic accent (matching bottom of Compliance Rate card in Image 3) */}
              <div className="w-full h-8 mt-2 overflow-hidden relative opacity-70">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/30 to-blue-500/20 blur-sm rounded-full" />
              </div>
            </div>

            {/* High-Level Territory Summary Stats */}
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Total Offices:</span>
                <span className="font-bold text-white">
                  {structuredCountryOfficeData.reduce((sum, c) => sum + c.offices.length, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Average Charge / Doc:</span>
                <span className="font-bold text-blue-400">
                  {summary.totalDocuments > 0
                    ? formatCompact(summary.totalCharges / summary.totalDocuments, true)
                    : "₹0"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 text-center">
            Calculated from verified financial records
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: OFFICE-WISE REVENUE PERFORMANCE & DRILL-DOWN LEVEL
         ========================================================================= */}
      <div className="rounded-2xl border border-[#1E2A47] bg-[#121C33] p-5 shadow-lg space-y-4">
        {/* Office Level Section Header & Territory Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Office-Wise Revenue Performance
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Showing registered offices for{" "}
              <span className="font-bold text-white">
                {selectedCountry === "all" ? "All Territories" : selectedCountry}
              </span>{" "}
              • Ranked by {currentMetricConfig.label}
            </p>
          </div>

          {/* Territory Pills Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Filter:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCountry("all");
                setFocusedOffice(null);
              }}
              className={`rounded-xl px-2.5 py-1 font-bold text-xs shrink-0 transition-all cursor-pointer ${
                selectedCountry === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              All Territories ({availableCountries.length})
            </button>

            {availableCountries.map((c) => {
              const isSelected = selectedCountry === c.country;
              return (
                <button
                  key={c.country}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(c.country);
                    setFocusedOffice(null);
                  }}
                  className={`rounded-xl px-2.5 py-1 font-bold text-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getCountryColor(c.country, 0) }}
                  />
                  {c.country} ({c.officeCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Office Search and Top Limit Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search office by name..."
              value={officeSearch}
              onChange={(e) => setOfficeSearch(e.target.value)}
              className="h-8 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none transition-colors hover:border-slate-600 focus:border-blue-500"
            />
            {officeSearch && (
              <button
                type="button"
                onClick={() => setOfficeSearch("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Top N Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-400 self-end sm:self-auto">
            <span>Show:</span>
            <select
              value={officeTopLimit}
              onChange={(e) => setOfficeTopLimit(e.target.value as any)}
              className="h-8 rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-slate-200 outline-none hover:border-slate-600 transition-colors cursor-pointer"
            >
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
              <option value="15">Top 15</option>
              <option value="all">All ({currentOfficesList.length})</option>
            </select>
          </div>
        </div>

        {/* Focused Office Card (Level 3 of drill-down if user clicked an office) */}
        {focusedOfficeData && (
          <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/20 p-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-900/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-white">{focusedOfficeData.office}</h4>
                  <span className="text-[11px] text-emerald-300">
                    Country: {focusedOfficeData.country}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tableEl = document.querySelector("table");
                    if (tableEl) {
                      tableEl.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  View in Records Table ↓
                </button>
                <button
                  type="button"
                  onClick={() => setFocusedOffice(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Close Focus
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Documents
                </span>
                <span className="text-sm font-black text-white">
                  {focusedOfficeData.totalDocuments.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-blue-400 block">
                  Total Charges
                </span>
                <span className="text-sm font-black text-blue-400">
                  {formatFullCurrency(focusedOfficeData.totalCharges)}
                </span>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                  Total Paid
                </span>
                <span className="text-sm font-black text-emerald-400">
                  {formatFullCurrency(focusedOfficeData.totalPaid)}
                </span>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">
                  Total Balance
                </span>
                <span className="text-sm font-black text-amber-400">
                  {formatFullCurrency(focusedOfficeData.totalBalance)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Office Horizontal Bar Chart */}
        {officeChartData.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-center p-6">
            <Building2 className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-300">No offices found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No registered offices match the selected country or search filter.
            </p>
          </div>
        ) : (
          <div className="pt-2">
            <div style={{ height: `${officeChartHeight}px`, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={officeChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 80, left: 15, bottom: 10 }}
                  barSize={18}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#1E293B"
                    opacity={0.8}
                  />
                  <XAxis
                    type="number"
                    domain={[0, maxOfficeValue]}
                    tickFormatter={(v) => formatCompact(v, currentMetricConfig.isCurrency)}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11, fill: "#cbd5e1", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomDarkTooltip activeMetric={activeMetric} />} />
                  <Bar
                    dataKey="value"
                    fill={currentMetricConfig.barColor}
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={true}
                    animationDuration={350}
                    className="cursor-pointer"
                    onClick={(data: any) => {
                      if (data?.name) setFocusedOffice(data.name);
                    }}
                  >
                    <LabelList
                      dataKey="displayValue"
                      position="right"
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        fill: "#cbd5e1",
                      }}
                      offset={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Office Status Overview Table (Directly matching Employee Status Overview in Reference Image 3) */}
        {officeChartData.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Office Status Overview
              </h3>
              <span className="text-[11px] text-slate-400">
                {currentOfficesList.length} offices listed
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#15233E] text-slate-300 text-[11px] font-bold border-b border-slate-800">
                    <th className="px-3.5 py-2.5">Office Name</th>
                    <th className="px-3.5 py-2.5">Country</th>
                    <th className="px-3.5 py-2.5 text-center">Documents</th>
                    <th className="px-3.5 py-2.5 text-right">Charges</th>
                    <th className="px-3.5 py-2.5 text-right">Paid</th>
                    <th className="px-3.5 py-2.5 text-right">Balance</th>
                    <th className="px-3.5 py-2.5 text-center">Collection</th>
                    <th className="px-3.5 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-[11px]">
                  {currentOfficesList.map((office) => {
                    const collectionRate =
                      office.totalCharges > 0
                        ? Math.min(100, Math.round((office.totalPaid / office.totalCharges) * 100))
                        : 0;

                    const isFocused = focusedOffice === office.office;

                    return (
                      <tr
                        key={office.office}
                        className={`transition-colors ${
                          isFocused
                            ? "bg-blue-950/40 font-bold"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="px-3.5 py-2.5 font-bold text-white flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-blue-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{office.office}</span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: getCountryColor(office.country, 0),
                              }}
                            />
                            {office.country}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-bold text-slate-200">
                          {office.totalDocuments.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-blue-400">
                          {formatCompact(office.totalCharges, true)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-emerald-400">
                          {formatCompact(office.totalPaid, true)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-amber-400">
                          {formatCompact(office.totalBalance, true)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              collectionRate >= 75
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : collectionRate >= 40
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {collectionRate}%
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setFocusedOffice(
                                focusedOffice === office.office ? null : office.office
                              )
                            }
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                              isFocused
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                          >
                            {isFocused ? "Focused" : "Focus"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800">
          <span>Click any bar or table button to focus on that office</span>
          <span className="font-semibold text-slate-300">
            Selected Metric: {currentMetricConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
}
