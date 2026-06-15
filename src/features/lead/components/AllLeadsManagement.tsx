"use client";

import { AlertCircle, Eye, FilterX, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { LeadForm } from "@/features/lead/components/LeadForm";
import { defaultLeadValues, leadStatuses, type LeadFormValues } from "@/features/lead/data/lead.data";
import type { LeadFilterOptionsResponse, LeadListResponse, LeadRow } from "@/features/lead/types/lead.types";

type AllLeadsManagementProps = {
  title?: string;
  description?: string;
  endpoint?: string;
  showAddLead?: boolean;
  allowStatusFilter?: boolean;
};

function toLocalDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AllLeadsManagement({
  title = "All Leads",
  description = "Manage every lead record from one clean CRM workspace with fast filtering, structured details, and a modern lead creation form.",
  endpoint = "/api/leads",
  showAddLead = true,
  allowStatusFilter = true,
}: AllLeadsManagementProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [followupDateFilter, setFollowupDateFilter] = useState("");
  const [createdFromFilter, setCreatedFromFilter] = useState("");
  const [createdToFilter, setCreatedToFilter] = useState("");
  const [officeLocationFilter, setOfficeLocationFilter] = useState("all");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);
  const [leadData, setLeadData] = useState<LeadListResponse>({
    items: [],
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    },
  });
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<LeadFilterOptionsResponse>({
    createdBy: [],
    assignedTo: [],
    countries: [],
    states: [],
    services: [],
    sources: [],
    officeLocations: [],
  });
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const isServerFilteredEndpoint = endpoint === "/api/leads";

  const filteredLeads = useMemo(() => {
    if (isServerFilteredEndpoint) {
      return leadData.items;
    }

    return leadData.items.filter((lead) => {
      const matchesQuery =
        !query ||
        [
          lead.leadCode,
          lead.clientName,
          lead.mobile,
          lead.email,
          lead.service,
          lead.country,
          lead.assignedUser,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [isServerFilteredEndpoint, leadData.items, query, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    statusFilter,
    createdByFilter,
    assignedToFilter,
    countryFilter,
    stateFilter,
    serviceFilter,
    sourceFilter,
    followupDateFilter,
    createdFromFilter,
    createdToFilter,
    officeLocationFilter,
    endpoint,
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadFilterOptions() {
      try {
        const response = await fetch("/api/leads/filters", { cache: "no-store" });
        const payload = (await response.json()) as LeadFilterOptionsResponse & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load lead filters.");
        }

        if (!ignore) {
          setFilterOptions(payload);
        }
      } catch (filterError) {
        console.error("Failed to load lead filters", filterError);
      }
    }

    if (isServerFilteredEndpoint) {
      void loadFilterOptions();
    }

    return () => {
      ignore = true;
    };
  }, [isServerFilteredEndpoint]);

  useEffect(() => {
    if (!isServerFilteredEndpoint || typeof window === "undefined") {
      return;
    }

    const editLeadId = new URLSearchParams(window.location.search).get("editLeadId");
    if (!editLeadId) {
      return;
    }

    let ignore = false;
    const leadIdToEdit = editLeadId;

    async function loadLeadForEdit() {
      try {
        const response = await fetch(`/api/leads/${encodeURIComponent(leadIdToEdit)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { lead?: LeadRow; message?: string }
          | null;

        if (!response.ok || !payload?.lead) {
          throw new Error(payload?.message ?? "Unable to open lead.");
        }

        if (!ignore) {
          setEditingLead(payload.lead);
        }
      } catch (openError) {
        console.error("Failed to open lead for editing", openError);
        if (!ignore) {
          setError(openError instanceof Error ? openError.message : "Unable to open lead.");
        }
      }
    }

    void loadLeadForEdit();

    return () => {
      ignore = true;
    };
  }, [isServerFilteredEndpoint]);

  useEffect(() => {
    let ignore = false;

    async function loadLeads() {
      setLoading(true);
      setError("");

      try {
        const searchParams = new URLSearchParams();

        if (isServerFilteredEndpoint) {
          searchParams.set("page", String(page));
          searchParams.set("pageSize", "10");

          if (query.trim()) {
            searchParams.set("query", query.trim());
          }

          if (allowStatusFilter && statusFilter !== "all") {
            searchParams.set("status", statusFilter);
          }

          if (createdByFilter !== "all") searchParams.set("createdById", createdByFilter);
          if (assignedToFilter !== "all") searchParams.set("assignedUserId", assignedToFilter);
          if (countryFilter !== "all") searchParams.set("country", countryFilter);
          if (stateFilter !== "all") searchParams.set("state", stateFilter);
          if (serviceFilter !== "all") searchParams.set("service", serviceFilter);
          if (sourceFilter !== "all") searchParams.set("source", sourceFilter);
          if (followupDateFilter) searchParams.set("followupDate", followupDateFilter);
          if (createdFromFilter) searchParams.set("fromDate", createdFromFilter);
          if (createdToFilter) searchParams.set("toDate", createdToFilter);
          if (officeLocationFilter !== "all") searchParams.set("officeLocationId", officeLocationFilter);
        }

        const url = searchParams.size > 0 ? `${endpoint}?${searchParams.toString()}` : endpoint;
        const response = await fetch(url, { cache: "no-store" });
        const payload = (await response.json()) as LeadListResponse & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load leads.");
        }

        if (!ignore) {
          setLeadData(payload);
        }
      } catch (fetchError) {
        console.error("Failed to load leads", fetchError);

        if (!ignore) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load leads.");
          setLeadData({
            items: [],
            pagination: {
              page: 1,
              pageSize: 10,
              totalItems: 0,
              totalPages: 1,
            },
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadLeads();

    return () => {
      ignore = true;
    };
  }, [
    allowStatusFilter,
    endpoint,
    isServerFilteredEndpoint,
    page,
    query,
    statusFilter,
    createdByFilter,
    assignedToFilter,
    countryFilter,
    stateFilter,
    serviceFilter,
    sourceFilter,
    followupDateFilter,
    createdFromFilter,
    createdToFilter,
    officeLocationFilter,
  ]);

  async function refreshLeads() {
    const searchParams = buildLeadSearchParams();
    const response = await fetch(searchParams.size > 0 ? `${endpoint}?${searchParams.toString()}` : endpoint, {
      cache: "no-store",
    });
    const payload = (await response.json()) as LeadListResponse & { message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Unable to refresh leads.");
    }

    setLeadData(payload);
  }

  function buildLeadSearchParams() {
    const searchParams = new URLSearchParams();

    if (!isServerFilteredEndpoint) {
      return searchParams;
    }

    searchParams.set("page", String(page));
    searchParams.set("pageSize", "10");
    if (query.trim()) searchParams.set("query", query.trim());
    if (allowStatusFilter && statusFilter !== "all") searchParams.set("status", statusFilter);
    if (createdByFilter !== "all") searchParams.set("createdById", createdByFilter);
    if (assignedToFilter !== "all") searchParams.set("assignedUserId", assignedToFilter);
    if (countryFilter !== "all") searchParams.set("country", countryFilter);
    if (stateFilter !== "all") searchParams.set("state", stateFilter);
    if (serviceFilter !== "all") searchParams.set("service", serviceFilter);
    if (sourceFilter !== "all") searchParams.set("source", sourceFilter);
    if (followupDateFilter) searchParams.set("followupDate", followupDateFilter);
    if (createdFromFilter) searchParams.set("fromDate", createdFromFilter);
    if (createdToFilter) searchParams.set("toDate", createdToFilter);
    if (officeLocationFilter !== "all") searchParams.set("officeLocationId", officeLocationFilter);

    return searchParams;
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setCreatedByFilter("all");
    setAssignedToFilter("all");
    setCountryFilter("all");
    setStateFilter("all");
    setServiceFilter("all");
    setSourceFilter("all");
    setFollowupDateFilter("");
    setCreatedFromFilter("");
    setCreatedToFilter("");
    setOfficeLocationFilter("all");
  }

  async function handleDelete(lead: LeadRow) {
    const shouldDelete = window.confirm(`Delete ${lead.leadCode} permanently?`);

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to delete lead.");
      }

      await refreshLeads();
    } catch (deleteError) {
      console.error("Failed to delete lead", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete lead.");
    }
  }

  function toFormValues(lead: LeadRow): LeadFormValues {
    const followupDate = toLocalDateTimeInput(lead.nextFollowupAt);

    return {
      firstName: lead.firstName,
      lastName: lead.lastName,
      countryCode: lead.countryCode,
      mobileNumber: lead.mobileNumber,
      email: lead.email,
      docType: lead.docType,
      noOfDocuments: lead.noOfDocuments,
      country: lead.country,
      state: lead.state,
      documentIssuedCountry: lead.documentIssuedCountry,
      service: lead.service,
      source: lead.source,
      leadStatus: lead.status,
      clientType: lead.clientType,
      amount: lead.rawAmount ? String(lead.rawAmount) : "",
      workingDays: lead.workingDays,
      remark: lead.remark,
      assignedUserId: lead.assignedUserId,
      assignedUser: lead.assignedUser,
      nextFollowupAt: followupDate,
    };
  }

  const showingCount = isServerFilteredEndpoint ? leadData.items.length : filteredLeads.length;
  const totalCount = isServerFilteredEndpoint ? leadData.pagination.totalItems : leadData.items.length;
  const assignedToOptions = useMemo(
    () =>
      officeLocationFilter === "all"
        ? filterOptions.assignedTo
        : filterOptions.assignedTo.filter(
            (option) => option.officeLocationId === officeLocationFilter,
          ),
    [filterOptions.assignedTo, officeLocationFilter],
  );

  useEffect(() => {
    if (
      officeLocationFilter !== "all" &&
      assignedToFilter !== "all" &&
      assignedToFilter !== "unassigned" &&
      !assignedToOptions.some((option) => option.value === assignedToFilter)
    ) {
      setAssignedToFilter("all");
    }
  }, [assignedToFilter, assignedToOptions, officeLocationFilter]);

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Lead Management"
        title={title}
        description={description}
        actions={
          showAddLead ? (
            <Button onClick={() => setIsDrawerOpen(true)}>
              <Plus size={16} />
              Add Lead
            </Button>
          ) : undefined
        }
      />

      <DashboardCard>
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row">
            <SearchBar
              placeholder="Search by lead id, client, email, service, or assigned user"
              className="w-full md:max-w-xl"
              onSearch={setQuery}
            />
            {allowStatusFilter ? (
              <FilterDropdown
                key={`status-${statusFilter}`}
                label="Status"
                defaultValue={statusFilter}
                options={[
                  { label: "All", value: "all" },
                  ...leadStatuses.map((status) => ({ label: status, value: status })),
                ]}
                onChange={setStatusFilter}
              />
            ) : null}
            </div>
            <p className="text-sm font-medium text-soft">
              Showing {showingCount} of {totalCount} leads
            </p>
          </div>

          {isServerFilteredEndpoint ? (
            <div className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-slate-50/70 p-3 sm:p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <FilterDropdown
                  key={`created-${createdByFilter}`}
                  label="Created By"
                  defaultValue={createdByFilter}
                  options={[{ label: "All", value: "all" }, ...filterOptions.createdBy]}
                  onChange={setCreatedByFilter}
                />
                <FilterDropdown
                  key={`assigned-${assignedToFilter}`}
                  label="Assigned To"
                  defaultValue={assignedToFilter}
                  options={[
                    { label: "All", value: "all" },
                    { label: "Unassigned", value: "unassigned" },
                    ...assignedToOptions,
                  ]}
                  onChange={setAssignedToFilter}
                />
                <FilterDropdown
                  key={`country-${countryFilter}`}
                  label="Country"
                  defaultValue={countryFilter}
                  options={[{ label: "All", value: "all" }, ...filterOptions.countries]}
                  onChange={setCountryFilter}
                />
                <FilterDropdown
                  key={`state-${stateFilter}`}
                  label="State"
                  defaultValue={stateFilter}
                  options={[{ label: "All", value: "all" }, ...filterOptions.states]}
                  onChange={setStateFilter}
                />
                <FilterDropdown
                  key={`service-${serviceFilter}`}
                  label="Service"
                  defaultValue={serviceFilter}
                  options={[{ label: "All", value: "all" }, ...filterOptions.services]}
                  onChange={setServiceFilter}
                />
                <FilterDropdown
                  key={`source-${sourceFilter}`}
                  label="Source"
                  defaultValue={sourceFilter}
                  options={[{ label: "All", value: "all" }, ...filterOptions.sources]}
                  onChange={setSourceFilter}
                />
                <FilterDropdown
                  key={`office-${officeLocationFilter}`}
                  label="Office"
                  defaultValue={officeLocationFilter}
                  options={[{ label: "All", value: "all" }, ...filterOptions.officeLocations]}
                  onChange={setOfficeLocationFilter}
                />
                <DateFilter label="Followup Date" value={followupDateFilter} onChange={setFollowupDateFilter} />
                <DateFilter label="Created From" value={createdFromFilter} onChange={setCreatedFromFilter} />
                <DateFilter label="Created To" value={createdToFilter} onChange={setCreatedToFilter} />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <FilterX size={16} />
                  Clear Filters
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Lead Directory"
        description="All created leads with service, ownership, status, and business value."
      >
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load leads"
            description={error}
            action={<Button onClick={() => void refreshLeads()}>Retry</Button>}
          />
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Leads Found"
            description="There are no lead records matching the current filters."
            action={
              showAddLead ? <Button onClick={() => setIsDrawerOpen(true)}>Create Lead</Button> : null
            }
          />
        ) : (
          <>
            <DataTable
              keyField="id"
              rows={filteredLeads}
              columns={[
                { key: "clientName", label: "Lead Name" },
                { key: "mobile", label: "Mobile" },
                { key: "service", label: "Service" },
                {
                  key: "status",
                  label: "Lead Status",
                  render: (row) => <StatusBadge status={String(row.status)} />,
                },
                {
                  key: "assignedUser",
                  label: "Assigned To",
                  render: (row) => String(row.assignedUser || "-"),
                },
                {
                  key: "createdByName",
                  label: "Created By",
                  render: (row) => {
                    const lead = row as LeadRow;
                    return (
                      <div className="grid min-w-0 gap-0.5">
                        <span>{lead.createdByName || "-"}</span>
                        {lead.createdByEmail ? (
                          <span className="truncate text-xs text-soft">{lead.createdByEmail}</span>
                        ) : null}
                      </div>
                    );
                  },
                },
                {
                  key: "nextFollowupAt",
                  label: "Followup Date",
                  render: (row) =>
                    row.nextFollowupAt ? new Date(String(row.nextFollowupAt)).toLocaleString("en-IN") : "-",
                },
                { key: "createdDate", label: "Created Date" },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => {
                    const lead = row as LeadRow;

                    return (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}>
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => setEditingLead(lead)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button variant="danger" size="icon" onClick={() => void handleDelete(lead)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
            />

            {isServerFilteredEndpoint ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-soft">
                <p>
                  Pagination: {leadData.pagination.page} of {leadData.pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={leadData.pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={leadData.pagination.page >= leadData.pagination.totalPages}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(leadData.pagination.totalPages, current + 1),
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </DashboardCard>

      <FormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add Lead"
        description="Create a lead with the current CRM field structure in a cleaner modern SaaS form."
      >
        <LeadForm
          onCancel={() => setIsDrawerOpen(false)}
          onSuccess={async () => {
            await refreshLeads();
            setIsDrawerOpen(false);
          }}
        />
      </FormDrawer>

      <FormDrawer
        open={Boolean(editingLead)}
        onClose={() => setEditingLead(null)}
        title="Edit Lead"
        description="Update the selected lead and keep the dashboard synced with live database data."
      >
        {editingLead ? (
          <LeadForm
            leadId={editingLead.id}
            initialValues={toFormValues(editingLead)}
            submitLabel="Update Lead"
            onCancel={() => setEditingLead(null)}
            onSuccess={async () => {
              await refreshLeads();
              setEditingLead(null);
            }}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        title="Lead Details"
        description="Review lead information and metadata in a structured panel."
      >
        {selectedLead ? (
          <div className="grid gap-4">
            {[
              ["Lead ID", selectedLead.leadCode],
              ["Client Name", selectedLead.clientName],
              ["Mobile", selectedLead.mobile],
              ["Email", selectedLead.email],
              ["Service", selectedLead.service],
              ["Status", selectedLead.status],
              ["Assigned User", selectedLead.assignedUser || "-"],
              ["Created By", selectedLead.createdByName || "-"],
              ["Followup Date", selectedLead.nextFollowupAt ? new Date(selectedLead.nextFollowupAt).toLocaleString("en-IN") : "-"],
              ["Created Date", selectedLead.createdDate],
              ["Remark", selectedLead.remark || "-"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-sm shadow-sm dark:bg-white/5">
      <span className="shrink-0 font-semibold text-soft">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    New: "bg-blue-50 text-blue-600 dark:bg-blue-500/10",
    Followup: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
    Assigned: "bg-sky-50 text-sky-600 dark:bg-sky-500/10",
    "Pending Approval": "bg-violet-50 text-violet-600 dark:bg-violet-500/10",
    Closed: "bg-slate-100 text-slate-600 dark:bg-slate-500/10",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? styles.New}`}>
      {status}
    </span>
  );
}
