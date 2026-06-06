"use client";

import { CheckCheck, RefreshCw, UserRoundPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { StatsCard } from "@/components/ui/StatsCard";
import { services } from "@/features/lead/data/lead.data";
import type {
  LeadAssignableUser,
  LeadListResponse,
  LeadRow,
} from "@/features/lead/types/lead.types";

const leadStatuses = [
  "New",
  "Qualified",
  "Potential Qualified",
  "Followup",
  "Assigned",
  "Pending Approval",
  "Closed",
  "LOB",
];

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

function formatAssignableUser(user: LeadAssignableUser) {
  return {
    label: user.name,
    value: user.id,
    description: user.email,
  };
}

export function AssignLeadsManagement() {
  const [users, setUsers] = useState<LeadAssignableUser[]>([]);
  const [items, setItems] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    assignedUserId: "",
    status: "",
    service: "",
  });
  const [reassignTo, setReassignTo] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const userOptions = useMemo(
    () => users.map(formatAssignableUser),
    [users],
  );

  const assignedFilterOptions = useMemo(
    () => [{ label: "Unassigned", value: "unassigned" }, ...userOptions],
    [userOptions],
  );

  async function loadUsers() {
    const data = await parseResponse<{ users: LeadAssignableUser[] }>(
      await fetch("/api/leads/assignable-users", { cache: "no-store" }),
    );
    setUsers(data.users ?? []);
  }

  async function loadLeads(nextFilters = filters) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ pageSize: "5000" });
      if (nextFilters.fromDate) params.set("fromDate", nextFilters.fromDate);
      if (nextFilters.toDate) params.set("toDate", nextFilters.toDate);
      if (nextFilters.assignedUserId) params.set("assignedUserId", nextFilters.assignedUserId);
      if (nextFilters.status) params.set("status", nextFilters.status);
      if (nextFilters.service) params.set("service", nextFilters.service);

      const data = await parseResponse<LeadListResponse>(
        await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" }),
      );

      setItems(data.items ?? []);
      setSelectedLeadIds((current) =>
        current.filter((leadId) => (data.items ?? []).some((lead) => lead.id === leadId)),
      );
    } catch (requestError) {
      setItems([]);
      setSelectedLeadIds([]);
      setError(requestError instanceof Error ? requestError.message : "Unable to load leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      try {
        await Promise.all([loadUsers(), loadLeads()]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load assignment data.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  function toggleLead(leadId: string) {
    setSelectedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId],
    );
  }

  function selectAllVisible() {
    setSelectedLeadIds(items.map((lead) => lead.id));
  }

  function clearSelection() {
    setSelectedLeadIds([]);
  }

  async function assignSelectedLeads() {
    if (!reassignTo || selectedLeadIds.length === 0) {
      setError("Choose a user and select at least one lead.");
      return;
    }

    setAssigning(true);
    setError("");
    setSuccess("");

    try {
      const data = await parseResponse<{ message: string }>(
        await fetch("/api/leads/bulk-assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadIds: selectedLeadIds,
            assignedUserId: reassignTo,
          }),
        }),
      );

      setSuccess(data.message);
      setSelectedLeadIds([]);
      await loadLeads();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to assign leads.");
    } finally {
      setAssigning(false);
    }
  }

  const totalLeads = items.length;
  const assignedLeads = items.filter((lead) => Boolean(lead.assignedUserId)).length;
  const unassignedLeads = totalLeads - assignedLeads;
  const allVisibleSelected = items.length > 0 && selectedLeadIds.length === items.length;

  const cards = [
    {
      label: "Total Leads",
      value: totalLeads.toLocaleString(),
      delta: "Filtered",
      description: "Leads matching the current assignment filters",
      icon: Users,
      tone: "blue" as const,
    },
    {
      label: "Assigned Leads",
      value: assignedLeads.toLocaleString(),
      delta: "Active",
      description: "Leads already mapped to a workspace user",
      icon: UserRoundPlus,
      tone: "slate" as const,
    },
    {
      label: "Unassigned Leads",
      value: unassignedLeads.toLocaleString(),
      delta: "Pending",
      description: "Leads that still need an owner",
      icon: RefreshCw,
      tone: "amber" as const,
    },
    {
      label: "Selected Leads",
      value: selectedLeadIds.length.toLocaleString(),
      delta: "Ready",
      description: "Leads queued for bulk reassignment",
      icon: CheckCheck,
      tone: "blue" as const,
    },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_42%),linear-gradient(135deg,_#ffffff,_#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Lead Management</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Assign Leads</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Reassign leads in bulk using live database users, scoped filters, and a single efficient update flow backed by assignment history.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input
            label="From Date"
            type="date"
            value={filters.fromDate}
            onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
          />
          <Input
            label="To Date"
            type="date"
            value={filters.toDate}
            onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
          />
          <SearchableSelect
            label="Assigned To"
            value={filters.assignedUserId}
            onChange={(value) => setFilters((current) => ({ ...current, assignedUserId: value }))}
            options={assignedFilterOptions}
            placeholder="All users"
          />
          <SearchableSelect
            label="Lead Status"
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
            options={leadStatuses.map((status) => ({ label: status, value: status }))}
            placeholder="All statuses"
          />
          <SearchableSelect
            label="Service"
            value={filters.service}
            onChange={(value) => setFilters((current) => ({ ...current, service: value }))}
            options={services.map((service) => ({ label: service, value: service }))}
            placeholder="All services"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void loadLeads()}>
            <RefreshCw size={16} /> Apply Filters
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const resetFilters = {
                fromDate: "",
                toDate: "",
                assignedUserId: "",
                status: "",
                service: "",
              };
              setFilters(resetFilters);
              void loadLeads(resetFilters);
            }}
          >
            Reset Filters
          </Button>
        </div>
      </section>

      <section className="grid gap-4 rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <SearchableSelect
              label="Reassign To"
              value={reassignTo}
              onChange={setReassignTo}
              options={userOptions}
              placeholder="Select new owner"
            />
          </div>
          <Button onClick={() => void assignSelectedLeads()} disabled={assigning || selectedLeadIds.length === 0 || !reassignTo}>
            <UserRoundPlus size={16} /> {assigning ? "Assigning..." : "Assign Selected Leads"}
          </Button>
          <Button variant="secondary" onClick={selectAllVisible} disabled={items.length === 0 || allVisibleSelected}>
            Select All
          </Button>
          <Button variant="ghost" onClick={clearSelection} disabled={selectedLeadIds.length === 0}>
            Unselect All
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
            Loading assignable leads...
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={UserRoundPlus}
            title="No leads found"
            description="Adjust the date, assigned user, status, or service filters to find leads for reassignment."
          />
        ) : (
          <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <tr>
                    <th className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            selectAllVisible();
                          } else {
                            clearSelection();
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="px-5 py-4">Lead ID</th>
                    <th className="px-5 py-4">Lead Name</th>
                    <th className="px-5 py-4">Mobile</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Lead Status</th>
                    <th className="px-5 py-4">Assigned User</th>
                    <th className="px-5 py-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white">
                  {items.map((lead) => (
                    <tr key={lead.id} className="transition hover:bg-blue-50/70">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-5 py-4 font-bold text-blue-700">{lead.leadCode}</td>
                      <td className="px-5 py-4">{lead.clientName}</td>
                      <td className="px-5 py-4">{lead.mobile}</td>
                      <td className="px-5 py-4">{lead.service}</td>
                      <td className="px-5 py-4">{lead.status}</td>
                      <td className="px-5 py-4">{lead.assignedUser || "Unassigned"}</td>
                      <td className="px-5 py-4">{lead.createdDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
