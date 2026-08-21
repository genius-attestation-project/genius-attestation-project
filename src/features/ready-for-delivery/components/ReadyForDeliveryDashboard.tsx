"use client";

import {
  CheckCheck,
  Clock3,
  Download,
  MapPin,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Truck,
  Undo2,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { StatsCard } from "@/components/ui/StatsCard";
import type {
  ReadyForDeliveryDetail,
  ReadyForDeliveryFilters,
  ReadyForDeliveryItem,
  ReadyForDeliveryResponse,
  ReadyForDeliverySection,
  ReadyForDeliveryStats,
} from "@/features/ready-for-delivery/types/ready-for-delivery.types";
import { PriorityIndicator } from "@/components/ui/PriorityIndicator";
import { DeliverModal } from "@/features/ready-for-delivery/components/DeliverModal";
import { AddAdvanceModal } from "@/features/revenue/components/AddAdvanceModal";

type ReadyForDeliveryDashboardProps = {
  currentOfficeLocationName: string;
};

const emptyStats: ReadyForDeliveryStats = {
  totalReadyForDelivery: 0,
  acceptedToday: 0,
  pendingDelivery: 0,
  delivered: 0,
};

const emptyFilters: ReadyForDeliveryFilters = {
  services: [],
  countries: [],
  officeLocations: [],
};

function toSelectOptions(options: string[]): SelectOption[] {
  return options.map((option) => ({ label: option, value: option }));
}

function toTitleCase(str: string | null | undefined): string {
  if (!str || str === "-") return "-";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

function DaysBadge({ days }: { days: string | number | null | undefined }) {
  if (!days || days === "-") {
    return <span className="text-slate-500 font-medium">-</span>;
  }

  const num = parseInt(String(days), 10);
  if (isNaN(num)) {
    return <span className="text-slate-700 font-medium">{days}</span>;
  }

  let badgeStyle = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
  if (num > 15) {
    badgeStyle = "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
  } else if (num > 7) {
    badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeStyle}`}>
      {days}
    </span>
  );
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-white/5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="wrap-break-word text-sm font-semibold text-slate-900 dark:text-white">{value || "-"}</span>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ReadyForDeliveryDetailView({ registration }: { registration: ReadyForDeliveryDetail }) {
  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_42%),linear-gradient(135deg,#ffffff,#eff6ff)] p-5 shadow-sm dark:border-blue-900/40 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Ready For Delivery</p>
            <div className="flex items-center gap-2 mt-2">
              <PriorityIndicator priority={(registration as any).priority} />
              <h2 className="wrap-break-word text-2xl font-extrabold text-slate-900 dark:text-white">{registration.trackingNumber}</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{registration.customerName}</p>
          </div>
          <div className="grid gap-2 text-right text-sm">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {registration.approvalStatus}
            </span>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {registration.bmStatus}
            </span>
          </div>
        </div>
      </section>

      <DetailSection title="Customer Information">
        <Field label="Client Name" value={registration.customerName} />
        <Field label="Mobile" value={registration.mobile} />
        <Field label="Email" value={registration.email} />
        <Field label="Collected Person" value={(registration as any).collectedPerson || (registration as any).collected_person} />
      </DetailSection>

      <DetailSection title="Document Information">
        <Field label="Doctype" value={registration.documentType} />
        <Field label="Service" value={registration.serviceLabel} />
      </DetailSection>

      <DetailSection title="Location Information">
        <Field label="Country" value={registration.country} />
        <Field label="State" value={registration.state} />
        <Field label="Document Issued Country" value={registration.documentIssuedCountry} />
        <Field label="Registered Office" value={registration.regionOfRegistration} />
        <Field label="Delivery Location" value={registration.deliveryLocation} />
      </DetailSection>

      <DetailSection title="Financial Information">
        <Field label="Total Amount" value={`₹${registration.totalCharges ? Number(registration.totalCharges).toFixed(2) : "0.00"}`} />
        <Field label="Advance Paid" value={`₹${registration.advancePaid ? Number(registration.advancePaid).toFixed(2) : "0.00"}`} />
        <Field label="Balance Amount" value={`₹${registration.balanceAmount ? Number(registration.balanceAmount).toFixed(2) : "0.00"}`} />
        <Field label="Working Days" value={registration.workingDaysLabel} />
      </DetailSection>

      <DetailSection title="Workflow Information">
        <Field label="Created By" value={registration.createdBy?.name || "Unknown"} />
        <Field label="Registered Office" value={registration.officeLocationLabel} />
        <Field label="Accepted By" value={registration.acceptedByName} />
        <Field label="Accepted Date" value={registration.acceptedAt ? new Date(registration.acceptedAt).toLocaleString() : "-"} />
      </DetailSection>
    </div>
  );
}

export function ReadyForDeliveryDashboard({
  currentOfficeLocationName,
}: ReadyForDeliveryDashboardProps) {
  const [items, setItems] = useState<ReadyForDeliveryItem[]>([]);
  const [sections, setSections] = useState<ReadyForDeliverySection[]>([]);
  const [stats, setStats] = useState<ReadyForDeliveryStats>(emptyStats);
  const [filters, setFilters] = useState<ReadyForDeliveryFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<ReadyForDeliveryDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [service, setService] = useState("");
  const [country, setCountry] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [date, setDate] = useState("");

  const [deliverItem, setDeliverItem] = useState<ReadyForDeliveryItem | null>(null);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);

  const [advanceItem, setAdvanceItem] = useState<ReadyForDeliveryItem | null>(null);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [undoLoadingId, setUndoLoadingId] = useState<string | null>(null);

  async function handleUndoDelivery(id: string) {
    if (!confirm("Are you sure you want to undo delivery details for this document?")) return;
    setUndoLoadingId(id);
    try {
      const res = await fetch(`/api/ready-for-delivery/${id}/undo`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to undo delivery.");
      await loadReadyForDelivery();
    } catch (err: any) {
      alert(err.message || "Failed to undo delivery.");
    } finally {
      setUndoLoadingId(null);
    }
  }

  async function loadReadyForDelivery(overrides?: Partial<{
    search: string;
    service: string;
    country: string;
    officeLocation: string;
    date: string;
  }>) {
    const next = {
      search: overrides?.search ?? activeSearch,
      service: overrides?.service ?? service,
      country: overrides?.country ?? country,
      officeLocation: overrides?.officeLocation ?? officeLocation,
      date: overrides?.date ?? date,
    };

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (next.search.trim()) params.set("search", next.search.trim());
      if (next.service) params.set("service", next.service);
      if (next.country) params.set("country", next.country);
      if (next.officeLocation) params.set("officeLocation", next.officeLocation);
      if (next.date) params.set("date", next.date);

      const data = await parseResponse<ReadyForDeliveryResponse>(
        await fetch(`/api/ready-for-delivery?${params.toString()}`, { cache: "no-store" }),
      );

      const fetchedItems = data.items ?? [];
      setItems(fetchedItems);

      if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
        setSections(data.sections);
      } else {
        const secMap = new Map<string, ReadyForDeliveryItem[]>();
        for (const item of fetchedItems) {
          const loc =
            item.deliveryLocation && item.deliveryLocation !== "-"
              ? item.deliveryLocation.trim()
              : "Unassigned";
          if (!secMap.has(loc)) secMap.set(loc, []);
          secMap.get(loc)!.push(item);
        }
        setSections(
          Array.from(secMap.entries()).map(([locationName, items]) => ({
            locationName,
            items,
          })),
        );
      }

      setStats(data.stats ?? emptyStats);
      setFilters(data.filters ?? emptyFilters);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load ready for delivery queue.",
      );
      setItems([]);
      setSections([]);
      setStats(emptyStats);
      setFilters(emptyFilters);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadyForDelivery();
  }, []);

  const cards = [
    {
      label: "Total Ready For Delivery",
      value: stats.totalReadyForDelivery.toLocaleString(),
      delta: "Live",
      description: "Accepted documents waiting in queue",
      icon: PackageCheck,
      tone: "blue" as const,
    },
    {
      label: "Accepted Today",
      value: stats.acceptedToday.toLocaleString(),
      delta: "Today",
      description: "Documents accepted into ready for delivery today",
      icon: CheckCheck,
      tone: "blue" as const,
    },
    {
      label: "Pending Delivery",
      value: stats.pendingDelivery.toLocaleString(),
      delta: "Queue",
      description: "Accepted documents not yet marked delivered",
      icon: Clock3,
      tone: "amber" as const,
    },
    {
      label: "Delivered",
      value: stats.delivered.toLocaleString(),
      delta: "Done",
      description: "Documents already marked delivered",
      icon: Truck,
      tone: "slate" as const,
    },
  ];

  const serviceOptions = useMemo(() => toSelectOptions(filters.services), [filters.services]);
  const countryOptions = useMemo(() => toSelectOptions(filters.countries), [filters.countries]);
  const officeOptions = useMemo(() => toSelectOptions(filters.officeLocations), [filters.officeLocations]);

  async function handleSearch() {
    setActiveSearch(search);
    await loadReadyForDelivery({ search });
  }

  async function handleOpenDetails(id: string) {
    setDrawerOpen(true);
    setDetailLoading(true);
    setSelected(null);
    setError("");

    try {
      const data = await parseResponse<{ registration: ReadyForDeliveryDetail }>(
        await fetch(`/api/ready-for-delivery/${id}`, { cache: "no-store" }),
      );
      setSelected(data.registration);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load document details.",
      );
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function clearFilters() {
    setSearch("");
    setActiveSearch("");
    setService("");
    setCountry("");
    setOfficeLocation("");
    setDate("");
    await loadReadyForDelivery({
      search: "",
      service: "",
      country: "",
      officeLocation: "",
      date: "",
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleExportCSV() {
    if (items.length === 0) return;
    const headers = [
      "SL No",
      "Tracking Number",
      "Registered Date",
      "Customer Name",
      "Registered Office",
      "Collected Person",
      "Created By",
      "Amount",
      "Advance",
      "Balance",
      "Working Days",
      "Mobile",
      "Priority",
    ];

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

    let sl = 1;
    sections.forEach((sec) => {
      sec.items.forEach((item) => {
        const row = [
          sl++,
          `"${item.compactTrackingNumber || item.registrationNumber}"`,
          `"${item.registeredDate || "-"}"`,
          `"${(item.clientName || "-").replace(/"/g, '""')}"`,
          `"${(item.regionOfRegistration || "-").replace(/"/g, '""')}"`,
          `"${(item.collectedPerson || "-").replace(/"/g, '""')}"`,
          `"${(item.createdBy || "-").replace(/"/g, '""')}"`,
          item.amount || 0,
          item.advancePaid || 0,
          item.balanceAmount || 0,
          `"${item.workingDays || "-"}"`,
          `"${item.mobile || "-"}"`,
          `"${item.priority || "Normal"}"`,
        ];
        csvContent += row.join(",") + "\n";
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ready_for_delivery_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const totalDocCount = sections.reduce((acc, sec) => acc + (sec.items?.length || 0), 0);

  const displayCountryBanner = country ? country : "India";

  return (
    <div className="space-y-6">
      {/* Module Title Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs dark:border-emerald-900/40 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <PackageCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
              READY FOR DELIVERY LIST!!
            </h1>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Office-wise Grouped Document Delivery Queue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            title="Print Report"
            className="rounded-xl border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Printer className="h-4 w-4 mr-1.5 text-slate-600 dark:text-slate-300" />
            Print
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            title="Export CSV"
            className="rounded-xl border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-4 w-4 mr-1.5 text-slate-600 dark:text-slate-300" />
            Export
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadReadyForDelivery()}
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      {/* Filter Controls Bar */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="md:col-span-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Delivery Location
          </label>
          <SearchableSelect
            value={officeLocation}
            options={officeOptions}
            onChange={(nextValue) => {
              setOfficeLocation(nextValue);
              void loadReadyForDelivery({ officeLocation: nextValue });
            }}
            placeholder="All Delivery Locations"
          />
        </div>

        <div className="md:col-span-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Search Documents
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
                placeholder="Type to search (tracking #, client, mobile...)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
              />
            </div>
            <Button size="sm" onClick={() => void handleSearch()} className="rounded-xl">
              Search
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Service
          </label>
          <SearchableSelect
            value={service}
            options={serviceOptions}
            onChange={(nextValue) => {
              setService(nextValue);
              void loadReadyForDelivery({ service: nextValue });
            }}
            placeholder="All Services"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Country
          </label>
          <SearchableSelect
            value={country}
            options={countryOptions}
            onChange={(nextValue) => {
              setCountry(nextValue);
              void loadReadyForDelivery({ country: nextValue });
            }}
            placeholder="All Countries"
          />
        </div>

        <div className="md:col-span-1 flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void clearFilters()}
            className="w-full rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Clear
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      {/* Main Region/Country Header Banner */}
      {!loading && sections.length > 0 && totalDocCount > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-[#6ee7b7] px-4 py-2.5 shadow-2xs dark:border-emerald-800 dark:bg-emerald-950/80">
          <h2 className="text-base font-extrabold tracking-wide text-slate-900 dark:text-emerald-100">
            {displayCountryBanner}
          </h2>
        </div>
      )}

      {/* Grouped Office Sections */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-slate-500">Loading ready for delivery queue...</p>
          </div>
        </div>
      ) : sections.length === 0 || totalDocCount === 0 ? (
        <EmptyState
          icon={Truck}
          title="No ready for delivery documents"
          description="Accepted documents matching your selected filters will appear here."
        />
      ) : (
        <div className="space-y-6">
          {sections.map((sec) => {
            if (!sec.items || sec.items.length === 0) return null;

            // Office-wise Financial Totals Calculation
            const officeTotalAmount = sec.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
            const officeTotalAdvance = sec.items.reduce((acc, item) => acc + (Number(item.advancePaid) || 0), 0);
            const officeTotalBalance = sec.items.reduce((acc, item) => acc + (Number(item.balanceAmount) || 0), 0);

            return (
              <div
                key={sec.locationName}
                className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-900"
              >
                {/* Office Section Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/90 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {sec.locationName}
                    </h3>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {sec.items.length} {sec.items.length === 1 ? "Record" : "Records"}
                  </span>
                </div>

                {/* Report Style Office Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300">
                      <tr>
                        <th className="border-r border-slate-200 px-3 py-2.5 text-center font-bold dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">Sl No</th>
                        <th className="border-r border-slate-200 px-3 py-2.5 font-bold dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">Track Number</th>
                        <th className="border-r border-slate-200 px-3 py-2.5 font-bold dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">Registered Date</th>
                        <th className="border-r border-slate-200 px-3 py-2.5 font-bold dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">Name</th>
                        <th className="border-r border-slate-200 px-3 py-2.5 font-bold dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">Registered Office</th>
                        <th className="border-r border-indigo-100 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-2.5 font-bold text-indigo-950 dark:text-indigo-200 dark:border-slate-700">Colln.Of</th>
                        <th className="border-r border-slate-200 px-3 py-2.5 font-bold dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">Submitted by</th>
                        <th className="border-r border-blue-100 bg-blue-100/70 dark:bg-blue-950/50 px-3 py-2.5 text-right font-extrabold text-blue-950 dark:text-blue-200 dark:border-slate-700">Amount</th>
                        <th className="border-r border-emerald-100 bg-emerald-100/70 dark:bg-emerald-950/50 px-3 py-2.5 text-right font-extrabold text-emerald-950 dark:text-emerald-200 dark:border-slate-700">Advance</th>
                        <th className="border-r border-amber-100 bg-amber-100/70 dark:bg-amber-950/50 px-3 py-2.5 text-right font-extrabold text-amber-950 dark:text-amber-200 dark:border-slate-700">Balance</th>
                        <th className="border-r border-sky-100 bg-sky-50/70 dark:bg-sky-950/40 px-3 py-2.5 text-center font-bold text-sky-950 dark:text-sky-200 dark:border-slate-700">Days</th>
                        <th className="border-r border-slate-200 px-3 py-2.5 font-bold dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">Contact No</th>
                        <th className="px-3 py-2.5 text-center font-bold bg-slate-100/70 dark:bg-slate-800/60">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 dark:divide-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                      {sec.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/90 transition-colors dark:hover:bg-slate-800/60"
                        >
                          <td className="border-r border-slate-200 bg-slate-50/50 dark:bg-slate-900/40 px-3 py-2.5 text-center font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {idx + 1}
                          </td>
                          <td className="border-r border-slate-200 bg-white dark:bg-slate-900 px-3 py-2.5 font-bold dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <PriorityIndicator priority={item.priority} />
                              <button
                                type="button"
                                onClick={() => void handleOpenDetails(item.id)}
                                className="font-mono text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {item.compactTrackingNumber || item.registrationNumber}
                              </button>
                            </div>
                          </td>
                          <td className="border-r border-slate-200 bg-slate-50/30 dark:bg-slate-900/30 px-3 py-2.5 whitespace-nowrap text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {item.registeredDate || "-"}
                          </td>
                          <td className="border-r border-slate-200 bg-white dark:bg-slate-900 px-3 py-2.5 font-bold text-slate-900 dark:border-slate-800 dark:text-white capitalize">
                            {toTitleCase(item.clientName)}
                          </td>
                          <td className="border-r border-slate-200 bg-slate-50/30 dark:bg-slate-900/30 px-3 py-2.5 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {item.regionOfRegistration}
                          </td>
                          <td className="border-r border-indigo-100 bg-indigo-50/20 dark:bg-indigo-950/10 px-3 py-2.5 font-semibold text-indigo-950 dark:border-slate-800 dark:text-indigo-300">
                            {item.collectedPerson || "-"}
                          </td>
                          <td className="border-r border-slate-200 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {item.createdBy}
                          </td>
                          <td className="border-r border-blue-100 bg-blue-50/40 dark:bg-blue-950/20 px-3 py-2.5 text-right font-extrabold text-blue-950 dark:border-slate-800 dark:text-blue-100">
                            {item.amount || 0}
                          </td>
                          <td className="border-r border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/20 px-3 py-2.5 text-right font-bold text-emerald-600 dark:border-slate-800 dark:text-emerald-400">
                            {item.advancePaid || 0}
                          </td>
                          <td className="border-r border-amber-100 bg-amber-50/40 dark:bg-amber-950/20 px-3 py-2.5 text-right font-extrabold text-amber-800 dark:border-slate-800 dark:text-amber-400">
                            {item.balanceAmount || 0}
                          </td>
                          <td className="border-r border-sky-100 bg-sky-50/20 dark:bg-sky-950/10 px-3 py-2.5 text-center dark:border-slate-800">
                            <DaysBadge days={item.workingDays} />
                          </td>
                          <td className="border-r border-slate-200 bg-slate-50/30 dark:bg-slate-900/30 px-3 py-2.5 whitespace-nowrap text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            {item.mobile}
                          </td>
                          <td className="px-3 py-2.5 text-center bg-white dark:bg-slate-900">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.trackingStatus !== "Delivered" && item.trackingStatus !== "Pending Approval" && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setDeliverItem(item);
                                    setDeliverModalOpen(true);
                                  }}
                                  className="rounded-lg px-2 py-0.5 text-[11px] font-bold"
                                >
                                  <Truck size={12} className="mr-1" /> Deliver
                                </Button>
                              )}
                              {item.trackingStatus !== "Delivered" && Boolean((item as any).deliveryType || (item as any).deliveryStatus || item.trackingStatus === "Pending Approval") && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={undoLoadingId === item.id}
                                  onClick={() => void handleUndoDelivery(item.id)}
                                  className="rounded-lg px-2 py-0.5 text-[11px] font-bold"
                                >
                                  <Undo2 size={12} className="mr-1" /> {undoLoadingId === item.id ? "..." : "Undo"}
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleOpenDetails(item.id)}
                                className="rounded-lg px-2 py-0.5 text-[11px] font-bold border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                              >
                                <UserRoundSearch size={12} className="mr-1" /> Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Office Financial Totals Summary Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-300 bg-slate-100/90 px-4 py-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <div className="flex items-center gap-1.5">
                    <span className="uppercase tracking-wider font-extrabold text-slate-800 dark:text-slate-200">{sec.locationName} TOTAL</span>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">({sec.items.length} {sec.items.length === 1 ? "record" : "records"})</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-semibold mr-1.5">Total Amount:</span>
                      <span className="font-extrabold text-blue-900 dark:text-blue-300">₹{officeTotalAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-semibold mr-1.5">Total Advance:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{officeTotalAdvance.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-semibold mr-1.5">Total Balance:</span>
                      <span className="font-extrabold text-amber-700 dark:text-amber-400">₹{officeTotalBalance.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Drawer */}
      <FormDrawer
        open={drawerOpen}
        title="Ready for delivery details"
        description="Full registration and workflow details for the selected accepted document."
        onClose={() => setDrawerOpen(false)}
      >
        {detailLoading ? (
          <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            Loading document details...
          </div>
        ) : selected ? (
          <ReadyForDeliveryDetailView registration={selected} />
        ) : (
          <EmptyState
            icon={Truck}
            title="No document selected"
            description="Choose a ready for delivery document to view its full details."
          />
        )}
      </FormDrawer>

      {/* Deliver Details Submission Modal */}
      {deliverItem && (
        <DeliverModal
          isOpen={deliverModalOpen}
          onClose={() => {
            setDeliverModalOpen(false);
            setDeliverItem(null);
          }}
          registrationId={deliverItem.id}
          trackingNumber={deliverItem.registrationNumber}
          customerName={deliverItem.clientName}
          onSuccess={(result) => {
            if (result.isDelivered || result.isPendingApproval) {
              void loadReadyForDelivery();
            } else if (result.requiresAdvancePayment && deliverItem) {
              setAdvanceItem(deliverItem);
              setAdvanceModalOpen(true);
            }
          }}
        />
      )}

      {/* Add Advance Payment Approval Modal for Pending Balance */}
      {advanceItem && (
        <AddAdvanceModal
          isOpen={advanceModalOpen}
          onClose={() => {
            setAdvanceModalOpen(false);
            setAdvanceItem(null);
            void loadReadyForDelivery();
          }}
          registrationId={advanceItem.id}
          trackingNumber={advanceItem.registrationNumber}
          customerName={advanceItem.clientName}
          totalCharges={advanceItem.amount}
          currentApprovedAdvance={advanceItem.advancePaid || 0}
          currentBalance={advanceItem.balanceAmount || advanceItem.amount}
          onSuccess={() => {
            setAdvanceModalOpen(false);
            setAdvanceItem(null);
            void loadReadyForDelivery();
          }}
        />
      )}
    </div>
  );
}
