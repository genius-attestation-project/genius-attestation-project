"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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
  ChevronRight,
  ArrowLeft,
  PieChart as PieChartIcon,
  Percent,
  Layers,
  X,
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
}

// Indian locale full currency formatting (e.g. ₹27,42,845.50)
function formatFullCurrency(amount: number): string {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Indian compact formatting for badges, charts, and center labels (e.g. ₹27.42L, ₹1.85Cr, 452)
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
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  // Count formatting (NEVER prefix currency symbol)
  if (abs >= 10000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString("en-IN");
}

// Modern financial palette with strong contrast and accessibility
const CHART_PALETTE = [
  "#2563eb", // Royal Blue
  "#0d9488", // Vibrant Teal
  "#8b5cf6", // Purple / Violet
  "#f59e0b", // Amber / Warm Orange
  "#10b981", // Emerald Green
  "#06b6d4", // Cyan
  "#f43f5e", // Rose Red
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#14b8a6", // Mint Teal
  "#e11d48", // Crimson
];

// Metric configurations with branding colors and icons
const METRICS: Array<{
  id: MetricType;
  label: string;
  shortLabel: string;
  color: string;
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

// Custom Interactive Tooltip for Donut Charts
function CustomDonutTooltip({ active, payload, activeMetric, scopeTitle }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 min-w-[240px] z-50">
      <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate block">
              {data.name}
            </span>
          </div>
          {data.country && (
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 ml-4.5">
              Country: <span className="font-bold text-slate-700 dark:text-slate-300">{data.country}</span>
            </span>
          )}
        </div>
        {data.percentage !== undefined && (
          <span className="text-[10px] font-black text-blue-700 bg-blue-50 dark:bg-blue-950/70 dark:text-blue-300 px-2 py-0.5 rounded-full shrink-0">
            {data.percentage}%
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5 text-xs">
        {/* Documents */}
        <div
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
            activeMetric === "documents"
              ? "bg-violet-50 dark:bg-violet-950/50 font-bold"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            Documents:
          </span>
          <span className="font-black text-slate-900 dark:text-white">
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
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Charges:
          </span>
          <span className="font-black text-blue-700 dark:text-blue-400">
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
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Paid:
          </span>
          <span className="font-black text-emerald-700 dark:text-emerald-400">
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
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Balance:
          </span>
          <span className="font-black text-amber-700 dark:text-amber-400">
            {formatFullCurrency(data.totalBalance || 0)}
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center font-medium">
        {data.country ? "Click to view office details" : "Click to view office breakdown"}
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
}: RevenueAnalyticsProps) {
  // Selected primary metric (one at a time to prevent scale collisions)
  const [activeMetric, setActiveMetric] = useState<MetricType>("charges");

  // Country drilldown selection: "all" or specific country name (e.g. "India", "UAE", "Qatar")
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

  // Office deep-dive selection: null or office name
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  const activeMetricConfig = useMemo(() => {
    return METRICS.find((m) => m.id === activeMetric) || METRICS[0];
  }, [activeMetric]);

  // Metric value extractor helper
  const getMetricValue = (item: {
    totalDocuments: number;
    totalCharges: number;
    totalPaid: number;
    totalBalance: number;
  }) => {
    if (activeMetric === "documents") return Number(item.totalDocuments || 0);
    if (activeMetric === "charges") return Number(item.totalCharges || 0);
    if (activeMetric === "paid") return Number(item.totalPaid || 0);
    return Number(item.totalBalance || 0);
  };

  // Structured country-office hierarchy
  const rawCountryOfficeData = useMemo<CountryOfficeAnalyticsItem[]>(() => {
    if (countryOfficeAnalytics && countryOfficeAnalytics.length > 0) {
      return countryOfficeAnalytics;
    }

    // Dynamic grouping fallback from officeAnalytics
    const countryMap = new Map<string, { country: string; offices: OfficeAnalyticsItem[] }>();
    for (const o of officeAnalytics) {
      const c = o.country || "India";
      if (!countryMap.has(c)) {
        countryMap.set(c, { country: c, offices: [] });
      }
      countryMap.get(c)!.offices.push(o);
    }

    return Array.from(countryMap.values()).map((g) => ({
      country: g.country,
      totalDocuments: g.offices.reduce((sum, o) => sum + Number(o.totalDocuments || 0), 0),
      totalCharges: g.offices.reduce((sum, o) => sum + Number(o.totalCharges || 0), 0),
      totalPaid: g.offices.reduce((sum, o) => sum + Number(o.totalPaid || 0), 0),
      totalBalance: g.offices.reduce((sum, o) => sum + Number(o.totalBalance || 0), 0),
      offices: g.offices,
    }));
  }, [countryOfficeAnalytics, officeAnalytics]);

  // Automatically default selectedCountry to the highest revenue country if not set or if available
  useEffect(() => {
    if (rawCountryOfficeData.length > 0 && selectedCountry === "all") {
      const sorted = [...rawCountryOfficeData].sort((a, b) => getMetricValue(b) - getMetricValue(a));
      if (sorted[0]?.country) {
        setSelectedCountry(sorted[0].country);
      }
    }
  }, [rawCountryOfficeData]);

  // Overall Global Metric Total
  const globalMetricTotal = useMemo(() => {
    if (activeMetric === "documents") return summary.totalDocuments;
    if (activeMetric === "charges") return summary.totalCharges;
    if (activeMetric === "paid") return summary.totalPaid;
    return summary.totalBalance;
  }, [summary, activeMetric]);

  // --- 1. COUNTRY DONUT CHART DATA ---
  const countryDonutData = useMemo(() => {
    if (!rawCountryOfficeData || rawCountryOfficeData.length === 0) return [];

    const sorted = [...rawCountryOfficeData].sort((a, b) => getMetricValue(b) - getMetricValue(a));

    return sorted.map((c, index) => {
      const val = getMetricValue(c);
      const pct =
        globalMetricTotal > 0
          ? ((val / globalMetricTotal) * 100).toFixed(1)
          : "0.0";

      return {
        name: c.country,
        value: val,
        color: CHART_PALETTE[index % CHART_PALETTE.length],
        percentage: pct,
        displayValue: formatCompact(val, activeMetricConfig.isCurrency),
        fullValue: activeMetricConfig.isCurrency ? formatFullCurrency(val) : val.toLocaleString("en-IN"),
        totalDocuments: c.totalDocuments,
        totalCharges: c.totalCharges,
        totalPaid: c.totalPaid,
        totalBalance: c.totalBalance,
        officeCount: c.offices.length,
      };
    });
  }, [rawCountryOfficeData, globalMetricTotal, activeMetric, activeMetricConfig.isCurrency]);

  // --- 2. OFFICE DONUT CHART DATA (FILTERED BY SELECTED COUNTRY) ---
  const activeCountryData = useMemo(() => {
    if (selectedCountry === "all") return null;
    return rawCountryOfficeData.find((c) => c.country.toLowerCase() === selectedCountry.toLowerCase()) || null;
  }, [rawCountryOfficeData, selectedCountry]);

  const officesForCurrentView = useMemo(() => {
    if (activeCountryData) {
      return activeCountryData.offices;
    }
    // "all" offices across all countries
    const list: OfficeAnalyticsItem[] = [];
    for (const c of rawCountryOfficeData) {
      list.push(...c.offices);
    }
    return list;
  }, [activeCountryData, rawCountryOfficeData]);

  const countryMetricSubtotal = useMemo(() => {
    if (activeCountryData) {
      return getMetricValue(activeCountryData);
    }
    return globalMetricTotal;
  }, [activeCountryData, globalMetricTotal, activeMetric]);

  const officeDonutData = useMemo(() => {
    if (!officesForCurrentView || officesForCurrentView.length === 0) return [];

    const sorted = [...officesForCurrentView].sort((a, b) => getMetricValue(b) - getMetricValue(a));

    return sorted.map((o, index) => {
      const val = getMetricValue(o);
      const pct =
        countryMetricSubtotal > 0
          ? ((val / countryMetricSubtotal) * 100).toFixed(1)
          : "0.0";

      return {
        name: o.office,
        country: o.country,
        value: val,
        color: CHART_PALETTE[index % CHART_PALETTE.length],
        percentage: pct,
        displayValue: formatCompact(val, activeMetricConfig.isCurrency),
        fullValue: activeMetricConfig.isCurrency ? formatFullCurrency(val) : val.toLocaleString("en-IN"),
        totalDocuments: o.totalDocuments,
        totalCharges: o.totalCharges,
        totalPaid: o.totalPaid,
        totalBalance: o.totalBalance,
        rank: index + 1,
      };
    });
  }, [officesForCurrentView, countryMetricSubtotal, activeMetric, activeMetricConfig.isCurrency]);

  // Deep-dive detail object (Selected Office > Selected Country > Overall Summary)
  const activeDetail = useMemo(() => {
    if (selectedOffice) {
      const off = officeDonutData.find((o) => o.name === selectedOffice);
      if (off) {
        return {
          title: off.name,
          subtitle: `Office in ${off.country}`,
          country: off.country,
          totalDocuments: off.totalDocuments,
          totalCharges: off.totalCharges,
          totalPaid: off.totalPaid,
          totalBalance: off.totalBalance,
          collectionRate:
            off.totalCharges > 0
              ? ((off.totalPaid / off.totalCharges) * 100).toFixed(1)
              : "0.0",
          outstandingRate:
            off.totalCharges > 0
              ? ((off.totalBalance / off.totalCharges) * 100).toFixed(1)
              : "0.0",
          shareOfTotal:
            summary.totalCharges > 0
              ? ((off.totalCharges / summary.totalCharges) * 100).toFixed(1)
              : "0.0",
          isOffice: true,
        };
      }
    }

    if (activeCountryData) {
      return {
        title: activeCountryData.country,
        subtitle: `Country Overview • ${activeCountryData.offices.length} registered ${
          activeCountryData.offices.length === 1 ? "office" : "offices"
        }`,
        country: activeCountryData.country,
        totalDocuments: activeCountryData.totalDocuments,
        totalCharges: activeCountryData.totalCharges,
        totalPaid: activeCountryData.totalPaid,
        totalBalance: activeCountryData.totalBalance,
        collectionRate:
          activeCountryData.totalCharges > 0
            ? ((activeCountryData.totalPaid / activeCountryData.totalCharges) * 100).toFixed(1)
            : "0.0",
        outstandingRate:
          activeCountryData.totalCharges > 0
            ? ((activeCountryData.totalBalance / activeCountryData.totalCharges) * 100).toFixed(1)
            : "0.0",
        shareOfTotal:
          summary.totalCharges > 0
            ? ((activeCountryData.totalCharges / summary.totalCharges) * 100).toFixed(1)
            : "0.0",
        isOffice: false,
      };
    }

    return {
      title: "All Territories",
      subtitle: `Overall Report Scope • Across ${countryDonutData.length} countries and ${officeAnalytics.length} offices`,
      country: "Global",
      totalDocuments: summary.totalDocuments,
      totalCharges: summary.totalCharges,
      totalPaid: summary.totalPaid,
      totalBalance: summary.totalBalance,
      collectionRate:
        summary.totalCharges > 0
          ? ((summary.totalPaid / summary.totalCharges) * 100).toFixed(1)
          : "0.0",
      outstandingRate:
        summary.totalCharges > 0
          ? ((summary.totalBalance / summary.totalCharges) * 100).toFixed(1)
          : "0.0",
      shareOfTotal: "100.0",
      isOffice: false,
    };
  }, [selectedOffice, officeDonutData, activeCountryData, summary, countryDonutData.length, officeAnalytics.length]);

  const hasData = summary.totalDocuments > 0 && countryDonutData.length > 0;

  // Country click handler (drills down into country's office chart)
  const handleCountryClick = (countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedOffice(null);
  };

  // Office click handler (selects office for deep-dive)
  const handleOfficeClick = (officeName: string) => {
    setSelectedOffice((prev) => (prev === officeName ? null : officeName));
  };

  // Metric selector summary badge formatter
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
            <div className="h-5 w-48 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-3 w-72 rounded-md bg-slate-100 dark:bg-slate-850 animate-pulse" />
          </div>
          <div className="h-9 w-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3">
          {[1, 2].map((g) => (
            <div key={g} className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-850/30 flex flex-col items-center justify-center min-h-[340px]">
              <div className="h-44 w-44 rounded-full border-8 border-slate-200 dark:border-slate-800 animate-pulse mb-4" />
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
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
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-white/10 dark:bg-slate-900 transition-all space-y-6">
      {/* 1. Header with Breadcrumb & Drilldown Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <PieChartIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Revenue Analytics Dashboard
            </h2>
          </div>

          {/* Interactive Drilldown Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedCountry("all");
                setSelectedOffice(null);
              }}
              className={`font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer ${
                selectedCountry === "all" ? "text-blue-600 dark:text-blue-400 font-bold" : ""
              }`}
            >
              All Countries
            </button>
            {selectedCountry !== "all" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => setSelectedOffice(null)}
                  className={`font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer ${
                    !selectedOffice ? "text-blue-600 dark:text-blue-400" : ""
                  }`}
                >
                  {selectedCountry}
                </button>
              </>
            )}
            {selectedOffice && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {selectedOffice}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Quick Country Switcher Tabs */}
        {countryDonutData.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl border border-slate-200/80 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/60 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedCountry("all");
                setSelectedOffice(null);
              }}
              className={`rounded-xl px-3 py-1 font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCountry === "all"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All ({countryDonutData.length})
            </button>
            {countryDonutData.map((c) => {
              const isSelected = selectedCountry.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(c.name);
                    setSelectedOffice(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Top Section: Revenue Overview Cards (Primary Metric Selectors) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Select Primary Analytics Metric
          </label>
          <span className="text-[11px] font-medium text-slate-400">
            Click metric card to reconfigure chart distributions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {METRICS.map((m) => {
            const isSelected = activeMetric === m.id;
            const Icon = m.icon;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMetric(m.id)}
                className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? `${m.activeBorder} ${m.activeBg} ${m.activeRing} shadow-sm scale-[1.01]`
                    : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850/40 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${m.iconBg} ${m.iconColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {isSelected && (
                    <span className={`h-2.5 w-2.5 rounded-full ${m.dotBg} animate-pulse`} />
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {m.label}
                  </span>
                  <span
                    className={`block text-lg font-black tracking-tight ${
                      isSelected ? m.activeText : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {getMetricSummaryValue(m.id)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Middle Section: Two-Column Donut Charts Dashboard */}
      {!hasData ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-850/40">
          <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            No revenue data available
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
            There are no documents matching the selected office(s) and date range. Try widening your search filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          {/* --- LEFT CARD: COUNTRY-WISE REVENUE DONUT --- */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-850/30 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                    <Globe2 className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Country-Wise Revenue
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click a country segment to drill down into its offices
                </p>
              </div>

              <span className="text-[11px] font-black text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-1 rounded-xl">
                {countryDonutData.length} {countryDonutData.length === 1 ? "Country" : "Countries"}
              </span>
            </div>

            {/* Donut Chart Visual with Center Metric */}
            <div className="relative h-64 sm:h-72 w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    animationDuration={400}
                    onClick={(entry: any) => handleCountryClick(entry.name)}
                    cursor="pointer"
                  >
                    {countryDonutData.map((entry) => {
                      const isHighlighted =
                        selectedCountry !== "all" &&
                        selectedCountry.toLowerCase() === entry.name.toLowerCase();

                      return (
                        <Cell
                          key={`country-slice-${entry.name}`}
                          fill={entry.color}
                          stroke={isHighlighted ? "#1e293b" : "transparent"}
                          strokeWidth={isHighlighted ? 3 : 1}
                          className="cursor-pointer transition-all duration-200 hover:opacity-80"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={
                      <CustomDonutTooltip
                        activeMetric={activeMetric}
                        scopeTitle="Country Share"
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Chart Center Value Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                  {activeMetricConfig.shortLabel} Total
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                  {formatCompact(globalMetricTotal, activeMetricConfig.isCurrency)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 block">
                  {countryDonutData.length} Territories
                </span>
              </div>
            </div>

            {/* Country Legend / Breakdown List */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Territory / Country</span>
                <span>{activeMetricConfig.shortLabel} & Share</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {countryDonutData.map((c) => {
                  const isSelected =
                    selectedCountry !== "all" &&
                    selectedCountry.toLowerCase() === c.name.toLowerCase();

                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleCountryClick(c.name)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/90 border border-blue-400/50 shadow-xs dark:bg-blue-950/40 dark:border-blue-600"
                          : "hover:bg-white dark:hover:bg-slate-800/60 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: c.color }}
                        />
                        <div className="truncate">
                          <span
                            className={`text-xs font-bold block truncate ${
                              isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {c.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {c.officeCount} {c.officeCount === 1 ? "office" : "offices"} • {c.totalDocuments} docs
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            {c.displayValue}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                            {c.percentage}%
                          </span>
                        </div>
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform ${
                            isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-300"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* --- RIGHT CARD: OFFICE-WISE REVENUE DONUT --- */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-850/30 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                    {selectedCountry === "all" ? "All Registered Offices" : `${selectedCountry} Offices`}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedCountry === "all"
                    ? "Ranked comparison across all active offices"
                    : `Showing only registered offices mapped to ${selectedCountry}`}
                </p>
              </div>

              {selectedCountry !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCountry("all");
                    setSelectedOffice(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="h-3 w-3" />
                  View All
                </button>
              )}
            </div>

            {/* Donut Chart Visual with Center Metric */}
            {officeDonutData.length === 0 ? (
              <div className="flex h-64 sm:h-72 flex-col items-center justify-center text-center p-6">
                <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No offices found
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  No office records registered under {selectedCountry} for the current filter.
                </p>
              </div>
            ) : (
              <div className="relative h-64 sm:h-72 w-full flex items-center justify-center my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={officeDonutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      animationDuration={400}
                      onClick={(entry: any) => handleOfficeClick(entry.name)}
                      cursor="pointer"
                    >
                      {officeDonutData.map((entry) => {
                        const isHighlighted = selectedOffice === entry.name;
                        return (
                          <Cell
                            key={`office-slice-${entry.name}`}
                            fill={entry.color}
                            stroke={isHighlighted ? "#1e293b" : "transparent"}
                            strokeWidth={isHighlighted ? 3 : 1}
                            className="cursor-pointer transition-all duration-200 hover:opacity-80"
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      content={
                        <CustomDonutTooltip
                          activeMetric={activeMetric}
                          scopeTitle="Office Share"
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Chart Center Value Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block truncate max-w-[140px]">
                    {selectedCountry === "all" ? "Offices Total" : selectedCountry}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                    {formatCompact(countryMetricSubtotal, activeMetricConfig.isCurrency)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 block">
                    {officeDonutData.length} {officeDonutData.length === 1 ? "Office" : "Offices"}
                  </span>
                </div>
              </div>
            )}

            {/* Office Legend / Breakdown List (Scrollable to prevent label overcrowding) */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Office Name</span>
                <span>{activeMetricConfig.shortLabel} & Share</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {officeDonutData.map((o) => {
                  const isSelected = selectedOffice === o.name;

                  return (
                    <button
                      key={o.name}
                      type="button"
                      onClick={() => handleOfficeClick(o.name)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-teal-50/90 border border-teal-400/50 shadow-xs dark:bg-teal-950/40 dark:border-teal-600"
                          : "hover:bg-white dark:hover:bg-slate-800/60 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: o.color }}
                        />
                        <div className="truncate">
                          <span
                            className={`text-xs font-bold block truncate ${
                              isSelected ? "text-teal-700 dark:text-teal-300" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {o.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {o.country} • {o.totalDocuments} docs
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                          {o.displayValue}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                          {o.percentage}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Section: Selected Entity Deep-Dive Breakdown */}
      {hasData && (
        <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-850/40 transition-all space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {activeDetail.isOffice ? "Office Deep-Dive" : "Detailed Breakdown"}:
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {activeDetail.title}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {activeDetail.shareOfTotal}% of Total Charges
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {activeDetail.subtitle}
              </p>
            </div>

            {selectedOffice && (
              <button
                type="button"
                onClick={() => setSelectedOffice(null)}
                className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Deselect Office
              </button>
            )}
          </div>

          {/* 4 Primary Financial & Volume Metrics in a responsive row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Charges */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-1.5 text-blue-600 dark:text-blue-400">
                <DollarSign className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Charges
                </span>
              </div>
              <span className="block text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {formatFullCurrency(activeDetail.totalCharges)}
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">
                Full billed amount
              </span>
            </div>

            {/* Total Paid */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Paid
                </span>
              </div>
              <span className="block text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 truncate">
                {formatFullCurrency(activeDetail.totalPaid)}
              </span>
              <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeDetail.collectionRate}% collection rate
              </span>
            </div>

            {/* Total Balance */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Balance
                </span>
              </div>
              <span className="block text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 truncate">
                {formatFullCurrency(activeDetail.totalBalance)}
              </span>
              <span className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                {activeDetail.outstandingRate}% outstanding balance
              </span>
            </div>

            {/* Total Documents */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-1.5 text-violet-600 dark:text-violet-400">
                <FileText className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Documents
                </span>
              </div>
              <span className="block text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {Number(activeDetail.totalDocuments).toLocaleString("en-IN")}
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">
                {activeDetail.totalDocuments > 0
                  ? `Avg: ${formatCompact(
                      activeDetail.totalCharges / activeDetail.totalDocuments,
                      true
                    )}/doc`
                  : "0 docs registered"}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
