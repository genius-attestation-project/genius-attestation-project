"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTitleCase } from "@/utils/format";

export type MultiSelectOption = {
  label: string;
  value: string;
  description?: string;
};

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selectedValues = [],
  onChange,
  placeholder = "Select options",
  label,
  name,
  error,
  disabled = false,
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "No options found.",
  errorMessage = "",
  className = "",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) =>
      `${opt.label} ${opt.description ?? ""}`.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectedOptions = useMemo(() => {
    return options.filter((opt) => selectedValues.includes(opt.value));
  }, [options, selectedValues]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectAll = () => {
    const allValues = Array.from(new Set([...selectedValues, ...filteredOptions.map((o) => o.value)]));
    onChange(allValues);
  };

  const clearAll = () => {
    if (searchTerm) {
      const filteredValSet = new Set(filteredOptions.map((o) => o.value));
      onChange(selectedValues.filter((v) => !filteredValSet.has(v)));
    } else {
      onChange([]);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatTitleCase(label)}
        </label>
      )}

      <div
        id={name ? `select-${name}` : undefined}
        className={`flex min-h-12 w-full items-center justify-between rounded-xl ring-1 px-3 py-2 text-sm transition-all duration-200 ${
          disabled
            ? "bg-slate-50 opacity-60 cursor-not-allowed ring-slate-200 dark:bg-white/5 dark:ring-white/10"
            : isOpen
              ? "bg-white ring-blue-500 shadow-sm dark:bg-[#020617] dark:ring-blue-500"
              : "bg-white/70 ring-slate-900/10 hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 cursor-pointer"
        } ${error ? "ring-rose-500!" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {formatTitleCase(placeholder)}
            </span>
          ) : selectedOptions.length <= 2 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
              >
                <span className="max-w-[120px] truncate">{formatTitleCase(opt.label)}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt.value);
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                <span className="max-w-[120px] truncate">{formatTitleCase(selectedOptions[0].label)}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(selectedOptions[0].value);
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                +{selectedOptions.length - 1} more
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 pl-2 shrink-0">
          {selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              title="Clear all"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl dark:border-white/10 dark:bg-[#0f172a]"
          >
            {/* Search and Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-slate-400 dark:text-white"
                  placeholder="Search offices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsOpen(false);
                  }}
                />
              </div>

              <div className="flex items-center gap-1 text-[11px] font-semibold shrink-0">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-1.5 py-0.5 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  All
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
              {loading ? (
                <div className="px-3 py-2 text-xs text-slate-500">{loadingMessage}</div>
              ) : errorMessage ? (
                <div className="px-3 py-2 text-xs font-medium text-rose-600">{errorMessage}</div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">{emptyMessage}</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isSelected
                          ? "bg-blue-50/60 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                              : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div className="truncate">
                          <span className="truncate block font-medium">{formatTitleCase(option.label)}</span>
                          {option.description && (
                            <span className="truncate block text-xs text-slate-400 dark:text-slate-500">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {name && <input type="hidden" name={name} value={selectedValues.join(",")} />}
    </div>
  );
}
