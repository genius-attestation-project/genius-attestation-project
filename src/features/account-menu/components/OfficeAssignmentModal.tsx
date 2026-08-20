"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { AccountNode } from "../types/account-menu.types";
import { Button } from "@/components/ui/Button";
import {
  X,
  Search,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";

interface OfficeOption {
  id: string;
  name: string;
  location: string;
  isProcessOffice: boolean;
}

interface CountryOfficeGroup {
  country: string;
  offices: OfficeOption[];
}

interface OfficeAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  node: AccountNode | null;
  onSuccess?: () => void;
}

export const OfficeAssignmentModal: React.FC<OfficeAssignmentModalProps> = ({
  open,
  onClose,
  node,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [groupedOffices, setGroupedOffices] = useState<CountryOfficeGroup[]>([]);
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<Set<string>>(new Set());
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !node) return;

    const fetchAssignments = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/account-menu/${node.id}/office-assignment`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.message || "Failed to load office assignments.");
          return;
        }

        const groups: CountryOfficeGroup[] = json.groupedOffices || [];
        setGroupedOffices(groups);

        const assignedIds = new Set<string>(json.assignedOfficeIds || []);
        setSelectedOfficeIds(assignedIds);

        // Expand all country sections by default
        const expandMap: Record<string, boolean> = {};
        groups.forEach((g) => {
          expandMap[g.country] = true;
        });
        setExpandedCountries(expandMap);
      } catch (err: any) {
        console.error("Error fetching office assignments:", err);
        setError("An unexpected error occurred while loading office data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [open, node]);

  // Filter offices by search query
  const filteredGroupedOffices = useMemo(() => {
    if (!searchQuery.trim()) return groupedOffices;
    const term = searchQuery.toLowerCase().trim();

    return groupedOffices
      .map((group) => {
        const matchesCountry = group.country.toLowerCase().includes(term);
        const filteredOffices = group.offices.filter(
          (office) =>
            matchesCountry ||
            office.name.toLowerCase().includes(term) ||
            office.location.toLowerCase().includes(term)
        );

        if (filteredOffices.length > 0) {
          return {
            ...group,
            offices: filteredOffices,
          };
        }
        return null;
      })
      .filter(Boolean) as CountryOfficeGroup[];
  }, [groupedOffices, searchQuery]);

  const toggleOfficeSelection = (officeId: string) => {
    setSelectedOfficeIds((prev) => {
      const next = new Set(prev);
      if (next.has(officeId)) {
        next.delete(officeId);
      } else {
        next.add(officeId);
      }
      return next;
    });
  };

  const toggleCountrySection = (country: string) => {
    setExpandedCountries((prev) => ({
      ...prev,
      [country]: !prev[country],
    }));
  };

  const toggleCountryAll = (offices: OfficeOption[]) => {
    const allSelected = offices.every((o) => selectedOfficeIds.has(o.id));
    setSelectedOfficeIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        offices.forEach((o) => next.delete(o.id));
      } else {
        offices.forEach((o) => next.add(o.id));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!node) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/account-menu/${node.id}/office-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeIds: Array.from(selectedOfficeIds),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Failed to save office assignments.");
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      setError("An unexpected error occurred while saving assignments.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !node) return null;

  const totalAssignedCount = selectedOfficeIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6">
      <div className="flex flex-col w-full max-w-lg max-h-[85vh] rounded-3xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assign Office
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Account: <span className="font-semibold text-slate-700 dark:text-slate-300">{node.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-slate-800/30">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search offices or countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Body: Offices List Grouped by Country */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-62.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <p className="text-xs font-medium">Loading offices catalog...</p>
            </div>
          ) : filteredGroupedOffices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Globe className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {searchQuery ? `No office matches "${searchQuery}"` : "No offices available"}
              </p>
            </div>
          ) : (
            filteredGroupedOffices.map((group) => {
              const isExpanded = expandedCountries[group.country] ?? true;
              const allGroupSelected = group.offices.every((o) => selectedOfficeIds.has(o.id));
              const someGroupSelected =
                !allGroupSelected && group.offices.some((o) => selectedOfficeIds.has(o.id));

              return (
                <div
                  key={group.country}
                  className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden dark:border-white/10 dark:bg-slate-900/60"
                >
                  {/* Country Group Header */}
                  <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5 dark:bg-white/5">
                    <button
                      type="button"
                      onClick={() => toggleCountrySection(group.country)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      <span>{group.country}</span>
                      <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-400">
                        {group.offices.length}
                      </span>
                    </button>

                    {/* Group Select All Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleCountryAll(group.offices)}
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                    >
                      {allGroupSelected ? (
                        <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      ) : someGroupSelected ? (
                        <CheckSquare className="h-3.5 w-3.5 text-blue-400/60" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                      <span>Select All</span>
                    </button>
                  </div>

                  {/* Office Items List */}
                  {isExpanded && (
                    <div className="p-2 space-y-1 divide-y divide-slate-100 dark:divide-white/5">
                      {group.offices.map((office) => {
                        const isChecked = selectedOfficeIds.has(office.id);

                        return (
                          <label
                            key={office.id}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-blue-50/70 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
                                : "hover:bg-slate-50 text-slate-700 dark:hover:bg-white/5 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleOfficeSelection(office.id)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                              />
                              <span>{office.name}</span>
                              {office.isProcessOffice && (
                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                  Process Office
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {totalAssignedCount} office(s) selected
          </span>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Assign</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
