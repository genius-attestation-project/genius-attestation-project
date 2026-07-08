"use client";

import React, { useState, useEffect } from "react";
import { useReportFilters } from "../context/ReportFilterContext";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FilterMetadata = {
  officeLocations: { id: string; name: string }[] | null;
  processOffices: { id: string; name: string }[] | null;
  departments: { id: string; name: string }[] | null;
  users: { id: string; name: string }[] | null;
  countries: { id: string; name: string }[] | null;
  services: { id: string; name: string }[] | null;
  documentTypes: { id: string; name: string }[] | null;
  leadSources: { id: string; name: string }[] | null;
  leadStatuses: { id: string; name: string }[] | null;
  paymentStatuses: { id: string; name: string }[] | null;
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
    const abortController = new AbortController();
    let isMounted = true;

    const fetchMetadata = async () => {
      let attempt = 0;
      const maxRetries = 1;

      while (attempt <= maxRetries && isMounted) {
        try {
          if (attempt === 0) setLoading(true);
          setError(false);

          console.log("[GlobalFilterBar] Request started", { attempt });
          const res = await fetch("/api/reports/filter-options", {
            signal: abortController.signal,
          });

          console.log("[GlobalFilterBar] Response status:", res.status);

          if (!res.ok) {
            let errorBody = "";
            try {
              errorBody = await res.text();
            } catch (e) {
              errorBody = "Could not read error body";
            }
            console.error(`[GlobalFilterBar] API Error ${res.status}:`, errorBody);
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          let data;
          try {
            data = await res.json();
            console.log("[GlobalFilterBar] Parsed JSON successfully");
          } catch (e) {
            console.error("[GlobalFilterBar] JSON parsing failure:", e);
            throw new Error("Failed to parse JSON response");
          }

          if (!isMounted) return;

          const expectedProps = [
            "officeLocations", "processOffices", "departments", "users",
            "countries", "services", "documentTypes", "leadSources",
            "leadStatuses", "paymentStatuses"
          ];

          expectedProps.forEach(prop => {
            if (data[prop] === undefined) {
              console.warn(`[GlobalFilterBar] Missing property in response: ${prop}`);
            } else if (data[prop] === null) {
              console.error(`[GlobalFilterBar] Property returned as null (failed to load): ${prop}`);
            }
          });

          setMetadata(data);
          setLoading(false);
          console.log("[GlobalFilterBar] Loading completed successfully");
          
          if (data.users && data.users.length === 1) {
             const defaultUserId = data.users[0].id;
             const defaultUserName = data.users[0].name;
             setLocalFilters(prev => ({ ...prev, userId: defaultUserId, userName: defaultUserName }));
             updateFilters({ ...filters, userId: defaultUserId, userName: defaultUserName });
          }
          
          return; // Success, exit loop
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log("[GlobalFilterBar] Fetch aborted");
            return;
          }
          console.error("[GlobalFilterBar] Fetch attempt failed:", err);
          attempt++;
          if (attempt > maxRetries && isMounted) {
            setError(true);
            setLoading(false);
            console.log("[GlobalFilterBar] Max retries reached, setting error state");
          }
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
      abortController.abort();
    };
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
    const defaults: any = { fromDate: "", toDate: "" };
    if (metadata?.users?.length === 1) {
       defaults.userId = metadata.users[0].id;
    }
    setLocalFilters(defaults);
    resetFilters();
    // if there's only one user, we must ensure it stays in context after reset
    if (metadata?.users?.length === 1) {
       setTimeout(() => updateFilters({ userId: metadata.users![0].id, userName: metadata.users![0].name }), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const makeOptions = (items: { id: string, name: string }[] | undefined | null, allLabel: string, _errorLabel: string) => {
    if (loading) return [{ label: "Loading...", value: "" }];
    if (error) return [{ label: "Unable to load data", value: "" }];
    if (items === undefined || items === null) return [{ label: "Unable to load data", value: "" }];
    if (Array.isArray(items) && items.length === 0) return [{ label: "No records found", value: "" }];
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
            options={makeOptions(metadata?.officeLocations, "All Offices", "Unable to load Offices")}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div key={`mainuser-${resetKey}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-1">User</label>
          <FilterDropdown
            label=""
            options={makeOptions(metadata?.users, "All Users", "Unable to load Users")}
            defaultValue={metadata?.users?.length === 1 ? metadata.users[0].id : (localFilters.userId || "")}
            onChange={(val) => {
              handleUpdate("userId", val);
              const userObj = metadata?.users?.find(u => u.id === val);
              handleUpdate("userName", userObj ? userObj.name : "All Users");
            }}
            disabled={metadata?.users?.length === 1}
          />
        </div>
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
