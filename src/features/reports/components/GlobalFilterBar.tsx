"use client";

import React, { useState, useEffect } from "react";
import { useReportFilters } from "../context/ReportFilterContext";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FilterMetadata = {
  offices: { id: string; name: string }[];
  processOffices: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  users: { id: string; name: string }[];
  countries: { id: string; name: string }[];
  services: { id: string; name: string }[];
  documentTypes: { id: string; name: string }[];
  leadSources: { id: string; name: string }[];
  leadStatuses: { id: string; name: string }[];
  paymentStatuses: { id: string; name: string }[];
};

export default function GlobalFilterBar() {
  const { filters, updateFilters, resetFilters } = useReportFilters();
  const [localFilters, setLocalFilters] = useState(filters);
  const [resetKey, setResetKey] = useState(0);
  const [dateError, setDateError] = useState("");
  
  const [metadata, setMetadata] = useState<FilterMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let retries = 1;
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/reports/filters");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setMetadata(data);
      } catch (err) {
        if (retries > 0) {
          retries--;
          fetchMetadata(); // retry once
        } else {
          setError(true);
          console.error("Failed to load filter metadata:", err);
        }
      } finally {
        if (retries <= 0 || metadata) setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  // Make sure localFilters are updated if context filters are reset
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleUpdate = (key: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    if (localFilters.fromDate && localFilters.toDate) {
      if (new Date(localFilters.fromDate) > new Date(localFilters.toDate)) {
        setDateError("From Date cannot be greater than To Date");
        return;
      }
    }
    setDateError("");
    updateFilters(localFilters);
  };

  const handleReset = () => {
    setDateError("");
    setResetKey(prev => prev + 1);
    const defaults = { fromDate: "", toDate: "" };
    setLocalFilters(defaults);
    resetFilters();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const makeOptions = (items: {id: string, name: string}[] | undefined, allLabel: string, errorLabel: string) => {
    if (error) return [{ label: errorLabel, value: "" }];
    if (loading || !items) return [{ label: "Loading...", value: "" }];
    return [{ label: allLabel, value: "" }, ...items.map(item => ({ label: item.name, value: item.id }))];
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col gap-5">
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Input
            label="From Date"
            type="date"
            value={localFilters.fromDate || ""}
            onChange={(e) => handleUpdate("fromDate", e.target.value)}
          />
        </div>
        <div>
          <Input
            label="To Date"
            type="date"
            value={localFilters.toDate || ""}
            onChange={(e) => handleUpdate("toDate", e.target.value)}
          />
        </div>
        <div key={`office-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Office Location</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.offices, "All Offices", "Unable to load Offices")}
            defaultValue={localFilters.officeId || ""}
            onChange={(val) => handleUpdate("officeId", val)}
          />
        </div>
        <div key={`dept-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.departments, "All Departments", "Unable to load Departments")}
            defaultValue={localFilters.departmentId || ""}
            onChange={(val) => handleUpdate("departmentId", val)}
          />
        </div>
      </div>
      {dateError && <p className="text-red-500 text-sm font-medium -mt-2">{dateError}</p>}

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div key={`user-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned User</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.users, "All Users", "Unable to load Users")}
            defaultValue={localFilters.assignedUserId || ""}
            onChange={(val) => handleUpdate("assignedUserId", val)}
          />
        </div>
        <div key={`lstatus-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Lead Status</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.leadStatuses, "All Lead Statuses", "Error")}
            defaultValue={localFilters.leadStatus || ""}
            onChange={(val) => handleUpdate("leadStatus", val)}
          />
        </div>
        <div key={`pstatus-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Status</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.paymentStatuses, "All Payment Statuses", "Error")}
            defaultValue={localFilters.paymentStatus || ""}
            onChange={(val) => handleUpdate("paymentStatus", val)}
          />
        </div>
        <div key={`lsource-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Lead Source</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.leadSources, "All Lead Sources", "Error")}
            defaultValue={localFilters.leadSourceId || ""}
            onChange={(val) => handleUpdate("leadSourceId", val)}
          />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div key={`country-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.countries, "All Countries", "Error")}
            defaultValue={localFilters.countryId || ""}
            onChange={(val) => handleUpdate("countryId", val)}
          />
        </div>
        <div key={`service-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Service</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.services, "All Services", "Error")}
            defaultValue={localFilters.serviceId || ""}
            onChange={(val) => handleUpdate("serviceId", val)}
          />
        </div>
        <div key={`doctype-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Document Type</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.documentTypes, "All Document Types", "Error")}
            defaultValue={localFilters.documentTypeId || ""}
            onChange={(val) => handleUpdate("documentTypeId", val)}
          />
        </div>
        <div key={`poffice-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Process Office</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.processOffices, "All Process Offices", "Unable to load Process Offices")}
            defaultValue={localFilters.processOfficeId || ""}
            onChange={(val) => handleUpdate("processOfficeId", val)}
          />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <Input
            label="Search"
            placeholder="Registration / Lead / Customer / Phone / Email"
            value={localFilters.search || ""}
            onChange={(e) => handleUpdate("search", e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex justify-end gap-3 h-12">
          <Button variant="secondary" onClick={handleReset}>
            Clear Filters
          </Button>
          <Button variant="primary" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
