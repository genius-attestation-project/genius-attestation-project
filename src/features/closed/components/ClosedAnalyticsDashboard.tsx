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
  RefreshCw,
  Search,
  TrendingUp,
  User,
} from "lucide-react";
import type { ElementType } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";

type DateRangeFilter = "today" | "week" | "month" | "all";
type TrendInterval = "daily" | "weekly" | "monthly";

type AnalyticsCards = {
  totalClosedLeads: number;
  todayClosedLeads: number;
  thisMonthClosedLeads: number;
  totalClosedRevenue: number;
  topClosingService: string;
  highestClosingCountry: string;
  filterOptions: {
    services: string[];
    assignedUsers: string[];
    countries: string[];
    previousStatuses: string[];
  };
};

type ClosedLeadRow = {
  id: string;
  leadCode: string;
  clientName: string;
  mobile: string;
  email: string;
  service: string;
  country: string;
  amount: number;
  assignedUser: string;
  closedDate: string;
  previousStatus: string | null;
  createdDate: string;
};

type TrendPoint = { date: string; label: string; count: number };
type RevenuePoint = { date: string; label: string; revenue: number };

type Charts = {
  statusToClosed: { name: string; count: number }[];
  serviceWise: { name: string; count: number }[];
};

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
};

type LeadsResponse = {
  items: ClosedLeadRow[];
  totalItems: number;
  totalPages: number;
  page: number;
};

const PALETTE = ["#0f766e", "#059669", "#10b981", "#14b8a6", "#0ea5e9", "#38bdf8", "#34d399"];
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
    <article className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-white/35" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">{label}</p>
          <strong className="mt-3 block break-words text-2xl font-bold tracking-tight sm:text-3xl">{value}</strong>
          <p className="mt-1 text-xs opacity-70">{sub}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
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
        className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
      {from} to Closed
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

export function ClosedAnalyticsDashboard() {
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
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [charts, setCharts] = useState<Charts | null>(null);
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

  const sharedFilters = useMemo(() => ({
    ...getDateParams(),
    ...(serviceFilter ? { service: serviceFilter } : {}),
    ...(assignedUserFilter ? { assignedUser: assignedUserFilter } : {}),
    ...(previousStatusFilter ? { previousStatus: previousStatusFilter } : {}),
    ...(countryFilter ? { country: countryFilter } : {}),
    ...(deferredSearch.trim() ? { query: deferredSearch.trim() } : {}),
  }), [
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
      const leadsParams = { ...sharedFilters, page: String(page) };
      const intervalParams = { ...sharedFilters, interval: trendInterval };

      const requests = [
        { label: "analytics", url: `/api/closed/analytics${buildParams(sharedFilters)}` },
        { label: "trends", url: `/api/closed/trends${buildParams(intervalParams)}` },
        { label: "revenue", url: `/api/closed/revenue${buildParams({ ...sharedFilters, interval: "monthly" })}` },
        { label: "charts", url: `/api/closed/charts${buildParams(sharedFilters)}` },
        { label: "status history", url: `/api/closed/status-history${buildParams(sharedFilters)}` },
        { label: "closed leads", url: `/api/leads/closed${buildParams(leadsParams)}` },
      ] as const;

      const [cardsRes, trendsRes, revenueRes, chartsRes, historyRes, leadsRes] = await Promise.all(
        requests.map((request) => fetch(request.url, { cache: "no-store" })),
      );

      const failedRequest = requests.find((_, index) => {
        return ![cardsRes, trendsRes, revenueRes, chartsRes, historyRes, leadsRes][index].ok;
      });

      if (failedRequest) {
        const failedResponse = [cardsRes, trendsRes, revenueRes, chartsRes, historyRes, leadsRes][
          requests.indexOf(failedRequest)
        ];
        const responseBody = await failedResponse.json().catch(() => null) as { message?: string } | null;
        const responseMessage = responseBody?.message ? ` ${responseBody.message}` : "";
        throw new Error(
          `Failed to fetch Closed ${failedRequest.label} endpoint (${failedResponse.status}).${responseMessage}`,
        );
      }

      const [cardsData, trendsData, revenueData, chartsData, historyData, leadsData] = await Promise.all([
        cardsRes.json() as Promise<AnalyticsCards>,
        trendsRes.json() as Promise<{ items: TrendPoint[] }>,
        revenueRes.json() as Promise<{ items: RevenuePoint[] }>,
        chartsRes.json() as Promise<Charts>,
        historyRes.json() as Promise<{ items: HistoryEntry[] }>,
        leadsRes.json() as Promise<LeadsResponse>,
      ]);

      setCards(cardsData);
      setTrends(trendsData.items ?? []);
      setRevenue(revenueData.items ?? []);
      setCharts(chartsData);
      setHistory(historyData.items ?? []);
      setLeads(leadsData);
      setLastUpdatedAt(new Date().toISOString());
    } catch (fetchError) {
      console.error("Failed to load Closed analytics", fetchError);
      setError("Failed to load Closed analytics. Please try again.");
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
        title="Closed Leads Analytics"
        description="Track closed lead performance with revenue, trend visibility, transition analysis, and timeline activity from the live CRM database."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
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

      <DashboardCard className="overflow-hidden rounded-3xl border-emerald-100 bg-linear-to-br from-white via-emerald-50/70 to-sky-50/70 dark:border-emerald-500/20 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-1">
              <div className="flex h-full items-center gap-3 rounded-3xl border border-emerald-200/70 bg-white/80 p-4 shadow-sm dark:border-emerald-500/20 dark:bg-slate-950/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <Filter size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-soft">Active View</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {dateRange === "all" ? "All time" : dateRange === "week" ? "This week" : dateRange === "month" ? "This month" : "Today"}
                  </p>
                  <p className="text-xs text-soft">
                    {lastUpdatedAt ? `Updated ${formatDateTime(lastUpdatedAt)}` : "Waiting for first sync"}
                  </p>
                </div>
              </div>
            </div>

            <FilterSelect label="Service" value={serviceFilter} onChange={setServiceFilter} options={filterOptions.services} placeholder="All services" />
            <FilterSelect label="Assigned User" value={assignedUserFilter} onChange={setAssignedUserFilter} options={filterOptions.assignedUsers} placeholder="All owners" />
            <FilterSelect label="Previous Status" value={previousStatusFilter} onChange={setPreviousStatusFilter} options={filterOptions.previousStatuses} placeholder="All previous statuses" />
            <FilterSelect label="Country" value={countryFilter} onChange={setCountryFilter} options={filterOptions.countries} placeholder="All countries" />

            <label className="grid min-w-0 gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-soft sm:col-span-2 xl:col-span-2">
              Search
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
                <Search size={15} className="text-soft" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Lead name, mobile, email, service"
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
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  {value === "all" ? "All Time" : value === "week" ? "This Week" : value === "month" ? "This Month" : "Today"}
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
          Array.from({ length: 6 }).map((_, index) => <LoadingSkeleton key={index} className="h-32 rounded-3xl" />)
        ) : cards ? (
          <>
            <MetricCard label="Total Closed Leads" value={cards.totalClosedLeads} sub="Current leads in Closed status" icon={TrendingUp} accent="border-emerald-200 bg-linear-to-br from-emerald-500/95 via-teal-400 to-cyan-400 text-white" />
            <MetricCard label="Today's Closed" value={cards.todayClosedLeads} sub="Leads closed today" icon={Calendar} accent="border-sky-200 bg-linear-to-br from-sky-500/95 via-blue-400 to-cyan-300 text-white" />
            <MetricCard label="This Month" value={cards.thisMonthClosedLeads} sub="Leads closed this month" icon={Clock} accent="border-teal-200 bg-linear-to-br from-teal-500/95 via-emerald-400 to-lime-300 text-white" />
            <MetricCard label="Closed Revenue" value={currencyFormatter.format(cards.totalClosedRevenue)} sub="Revenue from currently closed leads" icon={TrendingUp} accent="border-blue-200 bg-linear-to-br from-blue-600/95 via-sky-500 to-cyan-400 text-white" />
            <MetricCard label="Top Service" value={cards.topClosingService} sub="Best-performing closing service" icon={AlertCircle} accent="border-cyan-200 bg-linear-to-br from-cyan-500/95 via-teal-400 to-emerald-300 text-white" />
            <MetricCard label="Top Country" value={cards.highestClosingCountry} sub="Country with the most closed leads" icon={Globe} accent="border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 text-white" />
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard title={`Closed Leads Trend (${trendInterval.charAt(0).toUpperCase()}${trendInterval.slice(1)})`} description="Closure volume over time" className="lg:col-span-2">
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
                  formatter={(value) => tooltipCountFormatter(value, "Closed Leads")}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>

        <DashboardCard title="Revenue Analysis" description="Revenue generated from closed leads">
          {loading ? (
            <SectionSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [currencyFormatter.format(Number(Array.isArray(value) ? value[0] : value ?? 0)), "Revenue"] as [string, string]}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
                  {revenue.map((_, index) => (
                    <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Status to Closed Analysis" description="Which stages convert into Closed most often">
          {loading ? (
            <SectionSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={charts?.statusToClosed ?? []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={92}
                  innerRadius={56}
                  paddingAngle={2}
                >
                  {(charts?.statusToClosed ?? []).map((_, index) => (
                    <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => tooltipCountFormatter(value, "Leads")}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>

        <DashboardCard title="Service-wise Closed Leads" description="Services with the strongest close volume">
          {loading ? (
            <SectionSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts?.serviceWise ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 24 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-18} textAnchor="end" height={56} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => tooltipCountFormatter(value, "Closed Leads")}
                  contentStyle={{ borderRadius: "16px", fontSize: "12px" }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {(charts?.serviceWise ?? []).map((_, index) => (
                    <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard title="Closed Leads" description="All leads currently in Closed status with transition details" className="lg:col-span-2">
          {loading ? (
            <SectionSkeleton />
          ) : !leads?.items.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <TrendingUp size={36} className="text-emerald-300" />
              <p className="text-sm text-soft">No Closed leads match the current filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/10">
                      {["Lead Name", "Mobile", "Email", "Service", "Country", "Amount", "Assigned User", "Closed Date", "Previous Status", "Created Date"].map((heading) => (
                        <th key={heading} className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.items.map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-50 transition hover:bg-emerald-50/40 dark:border-white/5 dark:hover:bg-emerald-500/5">
                        <td className="py-3 pr-4">
                          <div className="font-semibold">{lead.clientName}</div>
                          <div className="text-[11px] text-soft">{lead.leadCode}</div>
                        </td>
                        <td className="py-3 pr-4 text-soft">{lead.mobile}</td>
                        <td className="py-3 pr-4 text-soft">{lead.email}</td>
                        <td className="py-3 pr-4">{lead.service}</td>
                        <td className="py-3 pr-4 text-soft">{lead.country}</td>
                        <td className="py-3 pr-4 font-semibold">{currencyFormatter.format(lead.amount)}</td>
                        <td className="py-3 pr-4 text-soft">{lead.assignedUser || "Unassigned"}</td>
                        <td className="py-3 pr-4 text-soft">{formatDateTime(lead.closedDate)}</td>
                        <td className="py-3 pr-4"><TransitionBadge from={lead.previousStatus} /></td>
                        <td className="py-3 pr-4 text-soft">{formatDate(lead.createdDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leads.totalPages > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-soft">
                  <span>Page {leads.page} of {leads.totalPages} with {leads.totalItems} closed leads</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" disabled={leads.page <= 1} onClick={() => setPage((current) => current - 1)}>
                      <ChevronLeft size={14} />
                      Prev
                    </Button>
                    <Button variant="secondary" size="sm" disabled={leads.page >= leads.totalPages} onClick={() => setPage((current) => current + 1)}>
                      Next
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DashboardCard>

        <DashboardCard title="Closed Timeline" description="Recent transitions that moved leads into Closed">
          {loading ? (
            <SectionSkeleton />
          ) : !history.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Clock size={28} className="text-emerald-200" />
              <p className="text-xs text-soft">No Closed status transitions recorded yet.</p>
            </div>
          ) : (
            <ol className="relative ml-3 border-l border-emerald-200 dark:border-emerald-500/30">
              {history.slice(0, 20).map((entry) => (
                <li key={entry.id} className="mb-6 ml-4">
                  <span className="absolute -left-1.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                  <time className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">
                    {formatDateTime(entry.createdAt)}
                  </time>
                  <p className="mt-1 text-sm font-semibold">{entry.clientName}</p>
                  <p className="text-xs text-soft">{entry.leadCode}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
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
