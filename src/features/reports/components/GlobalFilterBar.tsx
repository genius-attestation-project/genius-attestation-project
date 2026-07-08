"use client";

import React, { useState } from "react";
import { useReportFilters } from "../context/ReportFilterContext";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateRangeOption } from "../types/report.types";

const DATE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

export default function GlobalFilterBar() {
  const { filters, updateFilters, resetFilters } = useReportFilters();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDateRangeChange = (val: string) => {
    updateFilters({ dateRange: val as DateRangeOption });
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
            <FilterDropdown
              label="Date Range"
              options={DATE_OPTIONS}
              defaultValue={filters.dateRange}
              onChange={handleDateRangeChange}
            />
          </div>

          {filters.dateRange === "custom" && (
            <>
              <div>
                <Input
                  label="Start Date"
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) => updateFilters({ startDate: e.target.value })}
                />
              </div>
              <div>
                <Input
                  label="End Date"
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) => updateFilters({ endDate: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Office Location</label>
            <FilterDropdown
              label="All Offices"
              options={[]} // TODO: Fetch offices
              defaultValue={filters.officeLocationId || ""}
              onChange={(val) => updateFilters({ officeLocationId: val })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? "Less Filters" : "More Filters"}
          </Button>
          <Button variant="secondary" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <FilterDropdown
              label="All Departments"
              options={[]} // TODO: Fetch departments
              defaultValue={filters.departmentId || ""}
              onChange={(val) => updateFilters({ departmentId: val })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned User</label>
            <FilterDropdown
              label="All Users"
              options={[]} // TODO: Fetch users
              defaultValue={filters.assignedUser || ""}
              onChange={(val) => updateFilters({ assignedUser: val })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lead Status</label>
            <FilterDropdown
              label="All Statuses"
              options={[
                { value: "New", label: "New" },
                { value: "Followup", label: "Followup" },
                { value: "Closed", label: "Closed" },
              ]}
              defaultValue={filters.leadStatus || ""}
              onChange={(val) => updateFilters({ leadStatus: val })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
            <FilterDropdown
              label="All Payments"
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Completed", label: "Completed" },
              ]}
              defaultValue={filters.paymentStatus || ""}
              onChange={(val) => updateFilters({ paymentStatus: val })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
