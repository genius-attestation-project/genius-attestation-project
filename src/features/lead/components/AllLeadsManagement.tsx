"use client";

import { AlertCircle, Eye, FilterX, Pencil, Plus, Trash2, Users, Download, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApprovalTimeline } from "./ApprovalTimeline";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { SearchBar } from "@/components/ui/SearchBar";
import { TablePagination } from "@/components/ui/TablePagination";
import { LeadForm } from "@/features/lead/components/LeadForm";
import { defaultLeadValues, leadStatuses, type LeadFormValues } from "@/features/lead/data/lead.data";
import type { LeadFilterOptionsResponse, LeadListResponse, LeadRow } from "@/features/lead/types/lead.types";
import { useAuth } from "@/features/auth/hooks/useAuth";

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
  title: _title = "All Leads",
  description: _description = "Manage every lead record from one clean CRM workspace with fast filtering, structured details, and a modern lead creation form.",
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
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const { user: currentUser } = useAuth();
  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);
  const permissions = currentUser?.permissions || [];

  const canCreate = isSuperAdmin || permissions.includes("leads.create") || permissions.includes("*");
  const canEdit = isSuperAdmin || permissions.includes("leads.edit") || permissions.includes("*");
  const canDelete = isSuperAdmin || permissions.includes("leads.delete") || permissions.includes("*");
  const canExport = isSuperAdmin || permissions.includes("leads.export") || permissions.includes("*");
  const canImport = isSuperAdmin || permissions.includes("leads.import") || permissions.includes("*");

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
    pageSize,
  ]);

  useEffect(() => {
    if (leadData.pagination.totalItems > 0 && page > leadData.pagination.totalPages) {
      setPage(leadData.pagination.totalPages);
    }
  }, [leadData.pagination.totalItems, leadData.pagination.totalPages, page]);

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
    if (!isServerFilteredEndpoint || typeof window === "undefined" || !canEdit) {
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
          searchParams.set("pageSize", String(pageSize));

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
              pageSize,
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
    pageSize,
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
    searchParams.set("pageSize", String(pageSize));
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
    if (!canDelete) {
      setError("You do not have permission to delete leads.");
      return;
    }

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

      if (leadData.items.length === 1 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        await refreshLeads();
      }
    } catch (deleteError) {
      console.error("Failed to delete lead", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete lead.");
    }
  }

  async function handleExportExcel() {
    if (!canExport) {
      setExportError("You do not have permission to export leads.");
      return;
    }

    if (leadData.items.length === 0) {
      setExportError("No records available to export.");
      return;
    }
    
    setIsExporting(true);
    setExportError("");

    try {
      const searchParams = buildLeadSearchParams();
      // Remove pagination to ensure backend exports everything that matches
      searchParams.delete("page");
      searchParams.delete("pageSize");

      const response = await fetch(`/api/leads/export/excel?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `Leads_Export_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (e: any) {
      console.error(e);
      setExportError(e.message || "An error occurred while exporting.");
    } finally {
      setIsExporting(false);
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
      documentName: lead.documentName,
      noOfDocuments: lead.noOfDocuments,
      country: lead.country,
      state: lead.state,
      documentIssuedCountry: lead.documentIssuedCountry,
      service: lead.service,
      source: lead.source,
      leadStatus: lead.status,
      clientType: lead.clientType,
      corporateDetailId: lead.corporateDetailId ?? "",
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
      {showAddLead && canCreate && (
        <div className="flex items-center justify-end">
          <Button onClick={() => setIsDrawerOpen(true)}>
            <Plus size={16} />
            Add Lead
          </Button>
        </div>
      )}

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
            <p className="text-sm font-semibold text-soft">
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} leads
            </p>
          </div>

          {isServerFilteredEndpoint ? (
            <div className="grid gap-3 rounded-2xl border border-(--border) bg-slate-50/70 p-3 sm:p-4">
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
              {exportError && <div className="text-sm text-red-500 mt-2">{exportError}</div>}
              <div className="flex justify-end gap-2 mt-2">
                {canExport && (
                  <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={isExporting}>
                    {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                    Export Excel
                  </Button>
                )}
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
              showAddLead && canCreate ? <Button onClick={() => setIsDrawerOpen(true)}>Create Lead</Button> : null
            }
          />
        ) : (
          <>
            <DataTable
              keyField="id"
              rows={filteredLeads.map((row, index) => ({
                ...row,
                serialNumber: ((page - 1) * pageSize) + index + 1
              }))}
              columns={[
                { key: "serialNumber", label: "SL No." },
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
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)} title="View Details">
                          <Eye size={16} />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => setEditingLead(lead)}
                            title="Edit Lead"
                          >
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            size="icon"
                            onClick={() => void handleDelete(lead)}
                            title="Delete Lead"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              footer={
                isServerFilteredEndpoint ? (
                  <TablePagination
                    page={page}
                    pageSize={pageSize}
                    totalItems={leadData.pagination.totalItems}
                    totalPages={leadData.pagination.totalPages}
                    loading={loading}
                    onPageChange={(newPage) => setPage(newPage)}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setPage(1);
                    }}
                  />
                ) : null
              }
            />
          </>
        )}
      </DashboardCard>

      {canCreate && (
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
      )}

      {canEdit && (
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
      )}

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
              ["Document Type", selectedLead.docType || "-"],
              ["Document Name", selectedLead.documentName || "-"],
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
            <ApprovalTimeline leadId={selectedLead.id} />
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
    <label className="inline-flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-(--border) bg-white/70 px-4 text-sm shadow-sm dark:bg-white/5">
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
