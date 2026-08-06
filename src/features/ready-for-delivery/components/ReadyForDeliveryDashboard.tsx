"use client";

import {
  Building2,
  CheckCheck,
  Clock3,
  FileSearch,
  MapPin,
  PackageCheck,
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
import { Input } from "@/components/ui/Input";
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
import { PriorityBadge } from "@/components/ui/PriorityBadge";
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

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-(--border) bg-white/70 p-4 dark:bg-white/5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-soft">{label}</span>
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
      <section className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_42%),linear-gradient(135deg,#ffffff,#eff6ff)] p-5 shadow-(--shadow-card) dark:border-blue-900/40 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Ready For Delivery</p>
            <div className="flex items-center gap-2 mt-2">
              <h2 className="wrap-break-word text-2xl font-extrabold text-slate-900 dark:text-white">{registration.trackingNumber}</h2>
              <PriorityBadge priority={(registration as any).priority} />
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
      </DetailSection>

      <DetailSection title="Document Information">
        <Field label="Doctype" value={registration.documentType} />
        <Field label="Number Of Documents" value="-" />
        <Field label="Service" value={registration.serviceLabel} />
      </DetailSection>

      <DetailSection title="Location Information">
        <Field label="Country" value={registration.country} />
        <Field label="State" value={registration.state} />
        <Field label="Document Issued Country" value={registration.documentIssuedCountry} />
        <Field label="Region Of Registration" value={registration.regionOfRegistration} />
        <Field label="Delivery Location" value={registration.deliveryLocation} />
      </DetailSection>

      <DetailSection title="Business Information">
        <Field label="Amount" value={registration.amountLabel} />
        <Field label="Working Days" value={registration.workingDaysLabel} />
        <Field label="Source" value={registration.sourceLabel} />
        <Field label="Lead Status" value={registration.leadStatusLabel} />
        <Field label="Client Type" value={registration.clientTypeLabel} />
      </DetailSection>

      <DetailSection title="Workflow Information">
        <Field label="Created By" value={registration.createdBy?.name || "Unknown"} />
        <Field label="Office Location" value={registration.officeLocationLabel} />
        <Field label="Accepted By" value={registration.acceptedByName} />
        <Field label="Accepted Date" value={registration.acceptedAt ? new Date(registration.acceptedAt).toLocaleString() : "-"} />
        <Field label="Approval Status" value={registration.approvalStatus} />
        <Field label="BM Status" value={registration.bmStatus} />
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
        // Fallback grouping by Region of Registration
        const secMap = new Map<string, ReadyForDeliveryItem[]>();
        for (const item of fetchedItems) {
          const loc = item.regionOfRegistration && item.regionOfRegistration !== "-" ? item.regionOfRegistration.trim() : "Unassigned";
          if (!secMap.has(loc)) secMap.set(loc, []);
          secMap.get(loc)!.push(item);
        }
        setSections(
          Array.from(secMap.entries()).map(([locationName, items]) => ({
            locationName,
            items,
          }))
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
      description: "Accepted documents waiting in this office queue",
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

  const totalDocCount = sections.reduce((acc, sec) => acc + (sec.items?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner - Matching BM Location Tracking Style */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <PackageCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Ready For Delivery
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Accepted delivery queue grouped by registration office location
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="md:col-span-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Registration Office
          </label>
          <SearchableSelect
            value={officeLocation}
            options={officeOptions}
            onChange={(nextValue) => {
              setOfficeLocation(nextValue);
              void loadReadyForDelivery({ officeLocation: nextValue });
            }}
            placeholder="All Registration Offices"
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
                placeholder="Search tracking #, client, mobile..."
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

      {/* Grouped Location Sections */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-500">Loading ready for delivery queue...</p>
          </div>
        </div>
      ) : sections.length === 0 || totalDocCount === 0 ? (
        <EmptyState
          icon={Truck}
          title="No ready for delivery documents"
          description="Accepted BM documents matching your selected filters will appear here."
        />
      ) : (
        <div className="space-y-6">
          {sections.map((sec) => {
            if (!sec.items || sec.items.length === 0) return null;
            return (
              <div
                key={sec.locationName}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Section Header Bar - Matching BM Report Section Styling */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {sec.locationName}
                    </h2>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {sec.items.length} {sec.items.length === 1 ? "Document" : "Documents"}
                  </span>
                </div>

                {/* Structured Document Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-100/60 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-center">SL No</th>
                        <th className="px-4 py-3">Tracking Number</th>
                        <th className="px-4 py-3">Client Name</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Country</th>
                        <th className="px-4 py-3">Delivery Location</th>
                        <th className="px-4 py-3">Region Of Registration</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Working Days</th>
                        <th className="px-4 py-3">Created By</th>
                        <th className="px-4 py-3">Accepted By</th>
                        <th className="px-4 py-3">Accepted Date</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-200">
                      {sec.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/40 transition-colors dark:hover:bg-blue-950/20"
                        >
                          <td className="px-4 py-3.5 text-center font-semibold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3.5 font-bold">
                            <div className="flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400">
                              <span>{item.registrationNumber}</span>
                              <PriorityBadge priority={(item as any).priority} />
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                            {item.clientName}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.mobile}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.service}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.country}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.deliveryLocation}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.regionOfRegistration}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                            ₹{item.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {item.workingDays}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.createdBy}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.acceptedBy}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {item.acceptedDate ?? "-"}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.trackingStatus !== "Delivered" && item.trackingStatus !== "Pending Approval" && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setDeliverItem(item);
                                    setDeliverModalOpen(true);
                                  }}
                                  className="rounded-xl px-2.5 py-1 text-xs"
                                >
                                  <Truck size={13} className="mr-1" /> Deliver
                                </Button>
                              )}
                              {item.trackingStatus !== "Delivered" && Boolean((item as any).deliveryType || (item as any).deliveryStatus || item.trackingStatus === "Pending Approval") && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={undoLoadingId === item.id}
                                  onClick={() => void handleUndoDelivery(item.id)}
                                  className="rounded-xl px-2.5 py-1 text-xs"
                                >
                                  <Undo2 size={13} className="mr-1" /> {undoLoadingId === item.id ? "Undoing..." : "Undo"}
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleOpenDetails(item.id)}
                                className="rounded-xl px-2.5 py-1 text-xs"
                              >
                                <UserRoundSearch size={14} className="mr-1" /> Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
          currentApprovedAdvance={0}
          currentBalance={advanceItem.amount}
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
