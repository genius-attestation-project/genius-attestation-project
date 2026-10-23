"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type OfficeOption = {
  id: string;
  officeName: string;
  location?: string;
};

interface OfficeMultiSelectProps {
  offices: OfficeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function OfficeMultiSelect({
  offices,
  selectedIds,
  onChange,
  loading = false,
  disabled = false,
  placeholder = "Select Office...",
  className = "",
}: OfficeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autofocus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Filtered offices based on search
  const filteredOffices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return offices;
    return offices.filter((o) =>
      o.officeName.toLowerCase().includes(term) ||
      (o.location && o.location.toLowerCase().includes(term))
    );
  }, [offices, searchTerm]);

  // Check states
  const allFilteredSelected = useMemo(() => {
    if (filteredOffices.length === 0) return false;
    return filteredOffices.every((o) => selectedIds.includes(o.id));
  }, [filteredOffices, selectedIds]);

  const someFilteredSelected = useMemo(() => {
    if (filteredOffices.length === 0) return false;
    return filteredOffices.some((o) => selectedIds.includes(o.id)) && !allFilteredSelected;
  }, [filteredOffices, selectedIds, allFilteredSelected]);

  const isAllOfficesSelected = useMemo(() => {
    return offices.length > 0 && offices.every((o) => selectedIds.includes(o.id));
  }, [offices, selectedIds]);

  const toggleOffice = (officeId: string) => {
    if (selectedIds.includes(officeId)) {
      onChange(selectedIds.filter((id) => id !== officeId));
    } else {
      onChange([...selectedIds, officeId]);
    }
  };

  const handleSelectAllToggle = () => {
    if (allFilteredSelected) {
      // Deselect all currently filtered offices
      const filteredIdSet = new Set(filteredOffices.map((o) => o.id));
      onChange(selectedIds.filter((id) => !filteredIdSet.has(id)));
    } else {
      // Select all currently filtered offices
      const newSelected = new Set([...selectedIds, ...filteredOffices.map((o) => o.id)]);
      onChange(Array.from(newSelected));
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Trigger display label
  const renderTriggerContent = () => {
    if (loading) {
      return <span className="text-slate-400">Loading offices...</span>;
    }
    if (selectedIds.length === 0) {
      return <span className="text-slate-400">{placeholder}</span>;
    }
    if (isAllOfficesSelected) {
      return (
        <span className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
          All Offices ({offices.length})
        </span>
      );
    }
    if (selectedIds.length === 1) {
      const match = offices.find((o) => o.id === selectedIds[0]);
      return (
        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
          {match ? match.officeName : selectedIds[0]}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="font-bold text-slate-900 dark:text-white">
          {selectedIds.length} Offices Selected
        </span>
      </div>
    );
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 min-h-9 w-full rounded-2xl border px-3.5 py-2 text-xs font-medium outline-none transition-all flex items-center justify-between text-left cursor-pointer ${
          isOpen
            ? "border-blue-500 bg-white ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-slate-900"
            : "border-slate-200/80 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="flex-1 truncate mr-2">{renderTriggerContent()}</div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedIds.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear selection"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClear();
                }
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-500" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] rounded-2xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95 duration-100 overflow-hidden">
          {/* Search Box */}
          <div className="border-b border-slate-100 p-2.5 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search office..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsOpen(false);
                }}
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none dark:text-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Select All Row */}
          {offices.length > 0 && (
            <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-800/20">
              <label
                onClick={handleSelectAllToggle}
                className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 select-none"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                    allFilteredSelected
                      ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                      : someFilteredSelected
                      ? "border-blue-600 bg-blue-100 text-blue-700 dark:border-blue-500 dark:bg-blue-900/60"
                      : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                  }`}
                >
                  {allFilteredSelected ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : someFilteredSelected ? (
                    <div className="h-1.5 w-2 rounded-xs bg-blue-600 dark:bg-blue-400" />
                  ) : null}
                </div>
                <span>Select All</span>
              </label>

              <span className="text-[11px] font-semibold text-slate-400">
                {selectedIds.length} of {offices.length}
              </span>
            </div>
          )}

          {/* Office List */}
          <div className="max-h-56 overflow-y-auto p-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredOffices.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching offices found
              </div>
            ) : (
              filteredOffices.map((office) => {
                const isChecked = selectedIds.includes(office.id);
                return (
                  <label
                    key={office.id}
                    onClick={() => toggleOffice(office.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                      isChecked
                        ? "bg-blue-50/70 text-blue-700 font-semibold dark:bg-blue-950/40 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </div>
                      <div className="truncate">
                        <span className="truncate block">{office.officeName}</span>
                        {office.location && (
                          <span className="truncate block text-[10px] text-slate-400 dark:text-slate-500">
                            {office.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Bottom Clear & Close Bar */}
          <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
