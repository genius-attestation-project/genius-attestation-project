"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Globe,
  Layers,
  RefreshCw,
  Search,
  TrendingDown,
  User,
} from "lucide-react";
import type { ElementType } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";

type AnalyticsCards = {
  totalLobLeads: number;
  todayLobLeads: number;
  thisMonthLobLeads: number;
  mostLostService: string;
  lobConversionRate: number;
  recoveryPotential: number;
  filterOptions: {
    services: string[];
    assignedUsers: string[];
    countries: string[];
    previousStatuses: string[];
  };
};

type LobLeadRow = {
  id: string;
  leadCode: string;
  clientName: string;
  mobile: string;
  email: string;
  service: string;
  country: string;
  source: string;
  amount: number;
  assignedUser: string;
  lobDate: string;
  previousStatus: string | null;
};

type ChartData = { name: string; count: number };

type Charts = {
  statusToLob: ChartData[];
  serviceWise: ChartData[];
  countryWise: ChartData[];
};

type TrendPoint = { date: string; label: string; count: number };

type HistoryEntry = {
  id: string;
  leadCode: string;
  clientName: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string | null;
  createdAt: string;
  service: string;
  assignedUser: string;
  country: string;
  source: string;
};

type LeadsResponse = {
  items: LobLeadRow[];
  totalItems: number;
  totalPages: number;
  page: number;
};

type DateRangeFilter = "today" | "week" | "month" | "all";
type TrendInterval = "daily" | "weekly" | "monthly";

const PALETTE = ["#4f46e5", "#7c3aed", "#9333ea", "#ec4899", "#06b6d4", "#0ea5e9", "#8b5cf6"];
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function tooltipCountFormatter(
  value: number | string | readonly (number | string)[] | undefined,
  label: string,
) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return [Number(normalized ?? 0), label] as [number, string];
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function buildParams(filters: Record<string, string>) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: ElementType;
  accent: string;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-white/40" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">{label}</p>
          <strong className="mt-3 block break-words text-2xl font-bold tracking-tight sm:text-3xl">{value}</strong>
          <p className="mt-1 text-xs opacity-70">{sub}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25 shadow-sm">
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-soft">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TransitionBadge({ from }: { from: string | null }) {
  if (!from) {
    return <span className="text-xs text-soft">No history</span>;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
      {from} to LOB
    </span>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <LoadingSkeleton key={index} className="h-12 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function LobAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [trendInterval, setTrendInterval] = useState<TrendInterval>("daily");
  const [serviceFilter, setServiceFilter] = useState("");
  const [assignedUserFilter, setAssignedUserFilter] = useState("");
  const [previousStatusFilter, setPreviousStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);

  const [cards, setCards] = useState<AnalyticsCards | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [leads, setLeads] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const getDateParams = useCallback((): Record<string, string> => {
    const now = new Date();

    if (dateRange === "today") {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
    }

    if (dateRange === "week") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { dateFrom: from.toISOString() };
    }

    if (dateRange === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: from.toISOString() };
    }

    return {};
  }, [dateRange]);

  const sharedFilters = useMemo(() => {
    return {
      ...getDateParams(),
      ...(serviceFilter ? { service: serviceFilter } : {}),
      ...(assignedUserFilter ? { assignedUser: assignedUserFilter } : {}),
      ...(previousStatusFilter ? { previousStatus: previousStatusFilter } : {}),
      ...(countryFilter ? { country: countryFilter } : {}),
      ...(deferredSearch.trim() ? { query: deferredSearch.trim() } : {}),
    };
  }, [
    assignedUserFilter,
    countryFilter,
    deferredSearch,
    getDateParams,
    previousStatusFilter,
    serviceFilter,
  ]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const leadsParams = {
        ...sharedFilters,
        page: String(page),
      };
      const trendParams = {
        ...sharedFilters,
        interval: trendInterval,
      };

      const requests = [
        { label: "analytics", url: `/api/lob/analytics${buildParams(sharedFilters)}` },
        { label: "charts", url: `/api/lob/charts${buildParams(sharedFilters)}` },
        { label: "trends", url: `/api/lob/trends${buildParams(trendParams)}` },
        { label: "status history", url: `/api/lob/status-history${buildParams(sharedFilters)}` },
        { label: "LOB leads", url: `/api/lob/leads${buildParams(leadsParams)}` },
      ] as const;

      const [cardsRes, chartsRes, trendsRes, historyRes, leadsRes] = await Promise.all(
        requests.map((request) => fetch(request.url, { cache: "no-store" })),
      );

      const responses = [cardsRes, chartsRes, trendsRes, historyRes, leadsRes];
      const failedIndex = responses.findIndex((response) => !response.ok);

      if (failedIndex >= 0) {
        const failedResponse = responses[failedIndex];
        const responseBody = await failedResponse.json().catch(() => null) as { message?: string } | null;
        const responseMessage = responseBody?.message ? ` ${responseBody.message}` : "";
        throw new Error(
          `Failed to fetch LOB ${requests[failedIndex].label} endpoint (${failedResponse.status}).${responseMessage}`,
        );
      }

      const [cardsData, chartsData, trendsData, historyData, leadsData] = await Promise.all([
        cardsRes.json() as Promise<AnalyticsCards>,
        chartsRes.json() as Promise<Charts>,
        trendsRes.json() as Promise<{ items: TrendPoint[] }>,
        historyRes.json() as Promise<{ items: HistoryEntry[] }>,
        leadsRes.json() as Promise<LeadsResponse>,
      ]);

      setCards(cardsData);
      setCharts(chartsData);
      setTrends(trendsData.items ?? []);
      setHistory(historyData.items ?? []);
      setLeads(leadsData);
      setLastUpdatedAt(new Date().toISOString());
    } catch (fetchError) {
      console.error("Failed to load LOB analytics", fetchError);
      setError("Failed to load LOB analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, sharedFilters, trendInterval]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, serviceFilter, assignedUserFilter, previousStatusFilter, countryFilter, deferredSearch]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchAll();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchAll();
      }
    };

    const handleFocus = () => {
      void fetchAll();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchAll]);

  const filterOptions = cards?.filterOptions ?? {
    services: [],
    assignedUsers: [],
    countries: [],
    previousStatuses: [],
  };

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Lead Management"
        title="LOB Analytics"
        description="Enterprise-style visibility into leads that moved into Loss of Business, including transition sources, service impact, geographic trends, and recovery potential."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
              Auto-refresh every 30s
            </div>
            <Button onClick={() => void fetchAll()} variant="secondary">
              <RefreshCw size={15} />
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : null}

      <DashboardCard className="overflow-hidden rounded-3xl border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-sky-50/70 dark:border-violet-500/20 dark:from-slate-950 dark:via-violet-950/20 dark:to-slate-950">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-1">
              <div className="flex h-full items-center gap-3 rounded-3xl border border-violet-200/70 bg-white/80 p-4 shadow-sm dark:border-violet-500/20 dark:bg-slate-950/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                  <Filter size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-soft">Active View</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {dateRange === "all"
                      ? "All time"
                      : dateRange === "week"
                        ? "This week"
                        : dateRange === "month"
                          ? "This month"
                          : "Today"}
                  </p>
                  <p className="text-xs text-soft">
                    {lastUpdatedAt ? `Updated ${formatDateTime(lastUpdatedAt)}` : "Waiting for first sync"}
                  </p>
                </div>
              </div>
            </div>

            <FilterSelect
              label="Service"
              value={serviceFilter}
              onChange={setServiceFilter}
              options={filterOptions.services}
              placeholder="All services"
            />
            <FilterSelect
              label="Assigned User"
              value={assignedUserFilter}
              onChange={setAssignedUserFilter}
              options={filterOptions.assignedUsers}
              placeholder="All owners"
            />
            <FilterSelect
              label="Previous Status"
              value={previousStatusFilter}
              onChange={setPreviousStatusFilter}
              options={filterOptions.previousStatuses}
              placeholder="All previous statuses"
            />
            <FilterSelect
              label="Country"
              value={countryFilter}
              onChange={setCountryFilter}
              options={filterOptions.countries}
              placeholder="All countries"
            />

            <label className="grid min-w-0 gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-soft sm:col-span-2 xl:col-span-2">
              Search
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
                <Search size={15} className="text-soft" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Lead name, mobile, email, service, assigned user"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </label>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              {(["today", "week", "month", "all"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setDateRange(value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    dateRange === value
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  {value === "all"
                    ? "All Time"
                    : value === "week"
                      ? "This Week"
                      : value === "month"
                        ? "This Month"
                        : "Today"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              {(["daily", "weekly", "monthly"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setTrendInterval(value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold capitalize transition ${
                    trendInterval === value
                      ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashboardCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-32 rounded-3xl" />
          ))
        ) : cards ? (
          <>
            <MetricCard
              label="Total LOB Leads"
              value={cards.totalLobLeads}
              sub="Current leads inside the LOB bucket"
              icon={TrendingDown}
              accent="border-violet-200 bg-gradient-to-br from-violet-500/95 via-violet-400 to-indigo-400 text-white"
            />
            <MetricCard
              label="Today's LOB"
              value={cards.todayLobLeads}
              sub="Leads moved to LOB today"
              icon={Calendar}
              accent="border-sky-200 bg-gradient-to-br from-sky-500/95 via-cyan-400 to-blue-400 text-white"
            />
            <MetricCard
              label="This Month"
              value={cards.thisMonthLobLeads}
              sub="Current LOB leads added this month"
              icon={Layers}
              accent="border-fuchsia-200 bg-gradient-to-br from-fuchsia-500/95 via-pink-400 to-rose-400 text-white"
            />
            <MetricCard
              label="Most Lost Service"
              value={cards.mostLostService}
              sub="Highest-impact service in LOB"
              icon={AlertCircle}
              accent="border-rose-200 bg-gradient-to-br from-rose-500/95 via-orange-400 to-amber-300 text-white"
            />
            <MetricCard
              label="LOB Rate"
              value={`${cards.lobConversionRate}%`}
              sub="LOB share within the filtered lead base"
              icon={TrendingDown}
              accent="border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white"
            />
            <MetricCard
              label="Recovery Potential"
              value={cards.recoveryPotential}
              sub="LOB leads with a future follow-up"
              icon={RefreshCw}
              accent="border-emerald-200 bg-gradient-to-br from-emerald-500/95 via-teal-400 to-cyan-300 text-white"
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard
          title={`LOB Trend (${trendInterval.charAt(0).toUpperCase()}${trendInterval.slice(1)})`}
          description="Transition count into LOB over time"
          className="lg:col-span-2"
        >
          {loading ? (
            <SectionSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as TrendPoint | undefined;
                    return point?.label ?? "";
                  }}
                  formatter={(value) => tooltipCountFormatter(value, "LOB Leads")}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>

        <DashboardCard
          title="Status to LOB Analysis"
          description="Which stages most often convert into LOB"
        >
          {loading ? (
            <SectionSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={charts?.statusToLob ?? []}
                layout="vertical"
                margin={{ top: 6, right: 10, left: 12, bottom: 6 }}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => tooltipCountFormatter(value, "Leads")}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                  {(charts?.statusToLob ?? []).map((_, index) => (
                    <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard
          title="Service-wise LOB Analysis"
          description="Services with the highest loss-of-business load"
        >
          {loading ? (
            <SectionSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={charts?.serviceWise ?? []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={92}
                  innerRadius={56}
                  paddingAngle={2}
                >
                  {(charts?.serviceWise ?? []).map((_, index) => (
                    <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => tooltipCountFormatter(value, "LOB Leads")}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>

        <DashboardCard
          title="Country-wise LOB Analysis"
          description="Top countries contributing to LOB"
        >
          {loading ? (
            <SectionSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts?.countryWise ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 24 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-18} textAnchor="end" height={56} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => tooltipCountFormatter(value, "LOB Leads")}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {(charts?.countryWise ?? []).map((_, index) => (
                    <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard
          title="LOB Leads"
          description="All leads currently marked as LOB with their latest transition source"
          className="lg:col-span-2"
        >
          {loading ? (
            <SectionSkeleton />
          ) : !leads?.items.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <TrendingDown size={36} className="text-violet-300" />
              <p className="text-sm text-soft">No LOB leads match the current filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/10">
                      {[
                        "Lead Name",
                        "Mobile",
                        "Service",
                        "Amount",
                        "Previous Status",
                        "Changed To LOB",
                        "Assigned User",
                        "Country",
                        "Source",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-soft"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.items.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-slate-50 transition hover:bg-violet-50/40 dark:border-white/5 dark:hover:bg-violet-500/5"
                      >
                        <td className="py-3 pr-4">
                          <div className="font-semibold">{lead.clientName}</div>
                          <div className="text-xs text-soft">{lead.email}</div>
                          <div className="text-[11px] text-soft">{lead.leadCode}</div>
                        </td>
                        <td className="py-3 pr-4 text-soft">{lead.mobile}</td>
                        <td className="py-3 pr-4">{lead.service}</td>
                        <td className="py-3 pr-4 font-semibold">{currencyFormatter.format(lead.amount)}</td>
                        <td className="py-3 pr-4">
                          <TransitionBadge from={lead.previousStatus} />
                        </td>
                        <td className="py-3 pr-4 text-soft">{formatDateTime(lead.lobDate)}</td>
                        <td className="py-3 pr-4 text-soft">{lead.assignedUser || "Unassigned"}</td>
                        <td className="py-3 pr-4 text-soft">{lead.country}</td>
                        <td className="py-3 pr-4 text-soft">{lead.source || "Direct"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leads.totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-soft">
                  <span>
                    Page {leads.page} of {leads.totalPages} with {leads.totalItems} LOB leads
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={leads.page <= 1}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={leads.page >= leads.totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="LOB Timeline"
          description="Recent status transitions that moved leads into LOB"
        >
          {loading ? (
            <SectionSkeleton />
          ) : !history.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Clock size={28} className="text-violet-200" />
              <p className="text-xs text-soft">No status transitions recorded yet.</p>
            </div>
          ) : (
            <ol className="relative ml-3 border-l border-violet-200 dark:border-violet-500/30">
              {history.slice(0, 20).map((entry) => (
                <li key={entry.id} className="mb-6 ml-4">
                  <span className="absolute -left-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-500 dark:border-slate-900" />
                  <time className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">
                    {formatDateTime(entry.createdAt)}
                  </time>
                  <p className="mt-1 text-sm font-semibold">{entry.clientName}</p>
                  <p className="text-xs text-soft">{entry.leadCode}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                    {entry.previousStatus} to {entry.newStatus}
                  </span>
                  <div className="mt-2 grid gap-1 text-[11px] text-soft">
                    <p>{entry.service}</p>
                    <p>{entry.country}</p>
                    {entry.assignedUser ? (
                      <p className="flex items-center gap-1">
                        <User size={10} />
                        {entry.assignedUser}
                      </p>
                    ) : null}
                    {entry.changedBy ? (
                      <p className="flex items-center gap-1">
                        <Globe size={10} />
                        Updated by {entry.changedBy}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
