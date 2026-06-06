"use client";

import {
  BadgeCheck,
  CheckCheck,
  MessageCircle,
  Phone,
  PhoneCall,
  RefreshCw,
  Search,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FormDrawer } from "@/components/ui/FormDrawer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatsCard } from "@/components/ui/StatsCard";
import type { WelcomeCallResponse, WelcomeCallItem } from "@/features/welcome-call/types/welcome-call.types";
import { welcomeCallStatuses } from "@/features/welcome-call/types/welcome-call.types";

type WelcomeCallDashboardProps = {
  currentOfficeLocationName: string;
};

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

function formatQueueDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusBadgeTone(status: string) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Not Reachable") return "bg-rose-50 text-rose-700";
  if (status === "Followup Required") return "bg-amber-50 text-amber-700";
  if (status === "Called") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-700";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeTone(status)}`}>
      {status}
    </span>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-(--border) bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-soft">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export function WelcomeCallDashboard({ currentOfficeLocationName }: WelcomeCallDashboardProps) {
  const [items, setItems] = useState<WelcomeCallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Today");
  const [queueDate, setQueueDate] = useState("");
  const [selected, setSelected] = useState<WelcomeCallItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<WelcomeCallResponse["stats"]>({
    totalWelcomeCallsToday: 0,
    completedCalls: 0,
    pendingCalls: 0,
    missedCalls: 0,
  });

  const cards = useMemo(
    () => [
      {
        label: "Total Welcome Calls Today",
        value: stats.totalWelcomeCallsToday.toLocaleString(),
        delta: "Queue",
        description: "Yesterday's registrations auto-loaded for follow-up today",
        icon: PhoneCall,
        tone: "blue" as const,
      },
      {
        label: "Completed Calls",
        value: stats.completedCalls.toLocaleString(),
        delta: "Done",
        description: "Customers whose welcome call has been closed",
        icon: CheckCheck,
        tone: "slate" as const,
      },
      {
        label: "Pending Calls",
        value: stats.pendingCalls.toLocaleString(),
        delta: "Open",
        description: "Pending, called, and follow-up cases still in progress",
        icon: BadgeCheck,
        tone: "amber" as const,
      },
      {
        label: "Missed Calls",
        value: stats.missedCalls.toLocaleString(),
        delta: "Retry",
        description: "Customers marked as not reachable",
        icon: UserRoundSearch,
        tone: "blue" as const,
      },
    ],
    [stats],
  );

  async function loadWelcomeCalls(nextSearch = search, nextStatus = selectedStatus) {
    if (!currentOfficeLocationName) {
      setItems([]);
      setStats({
        totalWelcomeCallsToday: 0,
        completedCalls: 0,
        pendingCalls: 0,
        missedCalls: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextStatus) params.set("status", nextStatus);

      const data = await parseResponse<WelcomeCallResponse>(
        await fetch(`/api/welcome-call?${params.toString()}`, { cache: "no-store" }),
      );

      setItems(data.items ?? []);
      setStats(data.stats);
      setQueueDate(data.queueDate);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load welcome calls.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWelcomeCalls("","Today");
  }, [currentOfficeLocationName]);

  async function updateStatus(item: WelcomeCallItem, status: string) {
    setUpdatingId(item.id);
    setError("");
    setSuccess("");

    try {
      const data = await parseResponse<{ item: WelcomeCallItem }>(
        await fetch(`/api/welcome-call/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      );

      setItems((current) => current.map((entry) => (entry.id === item.id ? data.item : entry)));
      setSelected((current) => (current?.id === item.id ? data.item : current));
      setSuccess(
        status === "Completed"
          ? `Welcome call completed for ${item.clientName}.`
          : `Welcome call status updated to ${status}.`,
      );
      await loadWelcomeCalls(search, selectedStatus);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update welcome call.");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleCall(item: WelcomeCallItem) {
    window.open(`tel:${item.mobile.replace(/\s+/g, "")}`, "_self");
    void updateStatus(item, item.welcomeCallStatus === "Pending" ? "Called" : item.welcomeCallStatus);
  }

  function handleWhatsApp(item: WelcomeCallItem) {
    const digits = item.mobile.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  }

  function openDetails(item: WelcomeCallItem) {
    setSelected(item);
    setDrawerOpen(true);
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_44%),linear-gradient(135deg,_#ffffff,_#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Welcome Call</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Daily client call desk</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Live registrations from yesterday land here automatically so your office can complete onboarding calls without duplicate entry.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white/90 px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Current Office</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{currentOfficeLocationName || "Unassigned"}</p>
            <p className="mt-1 text-xs text-slate-500">
              Queue date: {queueDate ? formatQueueDate(queueDate) : "-"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      {!currentOfficeLocationName ? (
        <EmptyState
          icon={PhoneCall}
          title="Office location required"
          description="Assign an office location to this user to load the welcome call queue for that office."
        />
      ) : (
        <section className="grid gap-4 rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-(--border) bg-white/80 px-4 text-sm">
              <Search size={17} className="text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void loadWelcomeCalls(search, selectedStatus);
                  }
                }}
                className="h-full min-w-0 flex-1 bg-transparent text-(--text) outline-none"
                placeholder="Search client, mobile, registration number, service"
              />
            </label>
            <select
              value={selectedStatus}
              onChange={(event) => {
                const nextStatus = event.target.value;
                setSelectedStatus(nextStatus);
                void loadWelcomeCalls(search, nextStatus);
              }}
              className="h-12 rounded-2xl border border-(--border) bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="Today">Today</option>
              {welcomeCallStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void loadWelcomeCalls(search, selectedStatus)}>
              <Search size={16} /> Search
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setSelectedStatus("Today");
                void loadWelcomeCalls("", "Today");
              }}
            >
              <RefreshCw size={16} /> Refresh
            </Button>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
              {success}
            </p>
          ) : null}

          {loading ? (
            <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card)">
              Loading welcome calls...
            </div>
          ) : items.length ? (
            <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
              <div className="overflow-x-auto">
                <table className="min-w-[1380px] text-left text-sm">
                  <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                    <tr>
                      <th className="px-5 py-4">Registration Number</th>
                      <th className="px-5 py-4">Client Name</th>
                      <th className="px-5 py-4">Mobile Number</th>
                      <th className="px-5 py-4">Process Type</th>
                      <th className="px-5 py-4">Total Charges</th>
                      <th className="px-5 py-4">Committed Duration</th>
                      <th className="px-5 py-4">Service</th>
                      <th className="px-5 py-4">Office Location</th>
                      <th className="px-5 py-4">Assigned User</th>
                      <th className="px-5 py-4">Registration Date</th>
                      <th className="px-5 py-4">Welcome Call Status</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border) bg-white">
                    {items.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70">
                        <td className="px-5 py-4 font-bold text-blue-700">{item.registrationNumber}</td>
                        <td className="px-5 py-4">{item.clientName}</td>
                        <td className="px-5 py-4">{item.mobile}</td>
                        <td className="px-5 py-4">{item.processType}</td>
                        <td className="px-5 py-4 font-semibold">{formatCurrency(item.totalCharges)}</td>
                        <td className="px-5 py-4">{item.committedDuration}</td>
                        <td className="px-5 py-4">{item.service}</td>
                        <td className="px-5 py-4">{item.officeLocation}</td>
                        <td className="px-5 py-4">{item.assignedUser}</td>
                        <td className="px-5 py-4">{item.registrationDate}</td>
                        <td className="px-5 py-4">
                          <div className="grid gap-2">
                            <StatusBadge status={item.welcomeCallStatus} />
                            <select
                              value={item.welcomeCallStatus}
                              onChange={(event) => void updateStatus(item, event.target.value)}
                              disabled={updatingId === item.id}
                              className="h-10 rounded-xl border border-(--border) bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                            >
                              {welcomeCallStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => handleCall(item)}>
                              <Phone size={15} /> Call
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleWhatsApp(item)}>
                              <MessageCircle size={15} /> WhatsApp
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openDetails(item)}>
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => void updateStatus(item, "Completed")}
                              disabled={updatingId === item.id || item.welcomeCallStatus === "Completed"}
                            >
                              Mark Completed
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={PhoneCall}
              title="No welcome calls found"
              description="Yesterday's registrations for this office will appear here automatically when they match the selected filter."
            />
          )}
        </section>
      )}

      <FormDrawer
        open={drawerOpen && Boolean(selected)}
        title="Welcome call details"
        description="Customer, document, service, and payment context for the selected registration."
        onClose={() => setDrawerOpen(false)}
      >
        {selected ? (
          <div className="grid gap-4">
            <section className="grid gap-4 md:grid-cols-2">
              <DetailField label="Customer Information" value={`${selected.clientName} | ${selected.mobile}`} />
              <DetailField label="Registration Details" value={`${selected.registrationNumber} | ${selected.registrationDate}`} />
              <DetailField label="Document Information" value={selected.documentType} />
              <DetailField label="Service Information" value={`${selected.processType} | ${selected.service}`} />
              <DetailField label="Charges" value={`${formatCurrency(selected.totalCharges)} | Advance ${formatCurrency(selected.advancePaid)}`} />
              <DetailField label="Committed Duration" value={selected.committedDuration} />
              <DetailField label="Office Location" value={selected.officeLocation} />
              <DetailField label="Assigned User" value={selected.assignedUser} />
              <DetailField label="Address" value={`${selected.address}, ${selected.city}, ${selected.state}, ${selected.country}`} />
              <DetailField label="Payment Status" value={`${selected.paymentStatus} | ${selected.paymentMode}`} />
              <DetailField label="Tracking Status" value={`${selected.trackingStatus} | ${selected.approvalStatus}`} />
              <DetailField
                label="Welcome Call"
                value={
                  selected.welcomeCalledAt
                    ? `${selected.welcomeCallStatus} by ${selected.welcomeCalledBy ?? "-"} on ${formatQueueDate(selected.welcomeCalledAt)}`
                    : selected.welcomeCallStatus
                }
              />
            </section>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => handleWhatsApp(selected)}>
                <MessageCircle size={16} /> WhatsApp
              </Button>
              <Button variant="ghost" onClick={() => handleCall(selected)}>
                <Phone size={16} /> Call
              </Button>
              <Button onClick={() => void updateStatus(selected, "Completed")}>
                <CheckCheck size={16} /> Mark Completed
              </Button>
            </div>
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
