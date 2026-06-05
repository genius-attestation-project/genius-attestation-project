"use client";

import {
  CheckCheck,
  Clock3,
  PackageCheck,
  Search,
  Truck,
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
  ReadyForDeliveryStats,
} from "@/features/ready-for-delivery/types/ready-for-delivery.types";

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
    <div className="grid gap-1 rounded-2xl border border-(--border) bg-white/70 p-4">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-soft">{label}</span>
      <span className="break-words text-sm font-semibold text-slate-900">{value || "-"}</span>
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
      <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ReadyForDeliveryDetailView({ registration }: { registration: ReadyForDeliveryDetail }) {
  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_42%),linear-gradient(135deg,_#ffffff,_#eff6ff)] p-5 shadow-(--shadow-card)">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Ready For Delivery</p>
            <h2 className="mt-2 break-words text-2xl font-extrabold text-slate-900">{registration.trackingNumber}</h2>
            <p className="mt-2 text-sm text-slate-600">{registration.customerName}</p>
          </div>
          <div className="grid gap-2 text-right text-sm">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              {registration.approvalStatus}
            </span>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
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
        <Field label="Created By" value={registration.createdBy} />
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

  async function loadReadyForDelivery(overrides?: Partial<{
    search: string;
    service: string;
    country: string;
    officeLocation: string;
    date: string;
  }>) {
    if (!currentOfficeLocationName) {
      setItems([]);
      setStats(emptyStats);
      setFilters(emptyFilters);
      setLoading(false);
      return;
    }

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

      setItems(data.items ?? []);
      setStats(data.stats ?? emptyStats);
      setFilters(data.filters ?? emptyFilters);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load ready for delivery queue.",
      );
      setItems([]);
      setStats(emptyStats);
      setFilters(emptyFilters);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadyForDelivery();
  }, [currentOfficeLocationName]);

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

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_42%),linear-gradient(135deg,_#ffffff,_#eff6ff)] p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Ready For Delivery</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Accepted delivery queue</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Accepted BM documents from your office workflow appear here automatically from the revenue registration table.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white/90 px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Current Office</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{currentOfficeLocationName || "Unassigned"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search registration, client, mobile, office"
              />
            </div>
            <Button onClick={() => void handleSearch()}>
              <Search size={16} /> Search
            </Button>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold">Service</span>
            <SearchableSelect
              value={service}
              options={serviceOptions}
              onChange={(nextValue) => {
                setService(nextValue);
                void loadReadyForDelivery({ service: nextValue });
              }}
              placeholder="All services"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">Country</span>
            <SearchableSelect
              value={country}
              options={countryOptions}
              onChange={(nextValue) => {
                setCountry(nextValue);
                void loadReadyForDelivery({ country: nextValue });
              }}
              placeholder="All countries"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">Office Location</span>
            <SearchableSelect
              value={officeLocation}
              options={officeOptions}
              onChange={(nextValue) => {
                setOfficeLocation(nextValue);
                void loadReadyForDelivery({ officeLocation: nextValue });
              }}
              placeholder="All offices"
            />
          </label>

          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => void loadReadyForDelivery({ date })}
            >
              Apply
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => void clearFilters()}>
            Clear Filters
          </Button>
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card)">
            Loading ready for delivery queue...
          </div>
        ) : items.length ? (
          <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
            <div className="overflow-x-auto">
              <table className="min-w-[1680px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <tr>
                    <th className="px-5 py-4">Registration Number</th>
                    <th className="px-5 py-4">Client Name</th>
                    <th className="px-5 py-4">Mobile</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Country</th>
                    <th className="px-5 py-4">State</th>
                    <th className="px-5 py-4">Delivery Location</th>
                    <th className="px-5 py-4">Region Of Registration</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Working Days</th>
                    <th className="px-5 py-4">Source</th>
                    <th className="px-5 py-4">Lead Status</th>
                    <th className="px-5 py-4">Client Type</th>
                    <th className="px-5 py-4">Created By</th>
                    <th className="px-5 py-4">Accepted By</th>
                    <th className="px-5 py-4">Accepted Date</th>
                    <th className="px-5 py-4">Created Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white">
                  {items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-blue-50/70">
                      <td className="px-5 py-4 font-bold text-blue-700">{item.registrationNumber}</td>
                      <td className="px-5 py-4">{item.clientName}</td>
                      <td className="px-5 py-4">{item.mobile}</td>
                      <td className="px-5 py-4">{item.email}</td>
                      <td className="px-5 py-4">{item.service}</td>
                      <td className="px-5 py-4">{item.country}</td>
                      <td className="px-5 py-4">{item.state}</td>
                      <td className="px-5 py-4">{item.deliveryLocation}</td>
                      <td className="px-5 py-4">{item.regionOfRegistration}</td>
                      <td className="px-5 py-4">{item.amount.toFixed(2)}</td>
                      <td className="px-5 py-4">{item.workingDays}</td>
                      <td className="px-5 py-4">{item.source}</td>
                      <td className="px-5 py-4">{item.leadStatus}</td>
                      <td className="px-5 py-4">{item.clientType}</td>
                      <td className="px-5 py-4">{item.createdBy}</td>
                      <td className="px-5 py-4">{item.acceptedBy}</td>
                      <td className="px-5 py-4">{item.acceptedDate ?? "-"}</td>
                      <td className="px-5 py-4">{item.createdDate}</td>
                      <td className="px-5 py-4">
                        <Button variant="secondary" size="sm" onClick={() => void handleOpenDetails(item.id)}>
                          <UserRoundSearch size={16} /> View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Truck}
            title="No ready for delivery documents"
            description="Accepted BM documents for this office will appear here automatically."
          />
        )}
      </section>

      <FormDrawer
        open={drawerOpen}
        title="Ready for delivery details"
        description="Full registration and workflow details for the selected accepted document."
        onClose={() => setDrawerOpen(false)}
      >
        {detailLoading ? (
          <div className="rounded-2xl border border-(--border) p-6 text-center text-sm text-soft">
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
    </div>
  );
}
