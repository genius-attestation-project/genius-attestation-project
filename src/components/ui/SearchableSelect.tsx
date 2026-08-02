"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
  category?: string;
  customRender?: React.ReactNode;
};

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  groupByCategory?: boolean;
  showDescription?: boolean;
}

function getCategoryIcon(categoryName: string) {
  const norm = categoryName.toLowerCase().trim();
  if (norm.includes("education") || norm.includes("academic") || norm.includes("degree")) return "📘";
  if (norm.includes("personal") || norm.includes("certificate") || norm.includes("vital")) return "📄";
  if (norm.includes("police") || norm.includes("clearance") || norm.includes("security")) return "👮";
  if (norm.includes("commercial") || norm.includes("business") || norm.includes("invoice") || norm.includes("trade")) return "🏢";
  if (norm.includes("government") || norm.includes("embassy") || norm.includes("mofa") || norm.includes("attestation")) return "🏛";
  return "📁";
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  name,
  error,
  disabled = false,
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "No results found.",
  errorMessage = "",
  groupByCategory = true,
  showDescription = true,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ?? (value ? { label: value, value } : undefined);

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

  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  const hasCategories = useMemo(() => {
    return groupByCategory && options.some((opt) => opt.category || (showDescription && opt.description));
  }, [options, groupByCategory, showDescription]);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) =>
      `${opt.label} ${opt.description ?? ""} ${opt.category ?? ""}`.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  // Grouping & Sorting logic
  const groupedData = useMemo(() => {
    if (!hasCategories) {
      return { groups: [], flatList: filteredOptions };
    }

    const map = new Map<string, SelectOption[]>();
    filteredOptions.forEach((opt) => {
      const cat = (opt.category || opt.description || "General").trim();
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(opt);
    });

    // Sort categories alphabetically
    const sortedCategories = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    const groups: { category: string; items: SelectOption[] }[] = [];
    const flatList: SelectOption[] = [];

    sortedCategories.forEach((cat) => {
      // Sort items within each category alphabetically by label
      const sortedItems = [...map.get(cat)!].sort((a, b) => a.label.localeCompare(b.label));
      groups.push({ category: cat, items: sortedItems });
      flatList.push(...sortedItems);
    });

    return { groups, flatList };
  }, [filteredOptions, hasCategories]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = groupedData.flatList.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < totalItems ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = groupedData.flatList[activeIndex];
      if (target) {
        onChange(target.value);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  let globalIndexCounter = 0;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div
        className={`flex min-h-10.5 w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-slate-900 ${
          error ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`truncate ${!selectedOption ? "text-slate-500" : "font-semibold text-slate-900 dark:text-slate-100"}`}>
          {selectedOption?.customRender ? selectedOption.customRender : (selectedOption ? selectedOption.label : placeholder)}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
            className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <Search size={16} className="text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                placeholder="Search name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {loading ? (
                <div className="px-3 py-2 text-sm text-slate-500">{loadingMessage}</div>
              ) : errorMessage ? (
                <div className="px-3 py-2 text-sm font-medium text-rose-600">{errorMessage}</div>
              ) : groupedData.flatList.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</div>
              ) : hasCategories ? (
                groupedData.groups.map((group) => (
                  <div key={group.category} className="mb-1 last:mb-0">
                    {/* Category Sticky Header */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 border-y border-slate-100 bg-slate-50/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-300">
                      <span>{getCategoryIcon(group.category)}</span>
                      <span>{group.category}</span>
                    </div>

                    {/* Group Items */}
                    {group.items.map((option) => {
                      const itemIndex = globalIndexCounter++;
                      const isSelected = value === option.value;
                      const isActive = itemIndex === activeIndex;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70 ${
                            isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"
                          } ${isActive ? "bg-slate-100 dark:bg-slate-800/70" : ""} ${
                            isSelected && isActive ? "bg-blue-50 dark:bg-blue-500/10" : ""
                          }`}
                          onClick={() => {
                            onChange(option.value);
                            setIsOpen(false);
                          }}
                        >
                          {option.customRender ? (
                            option.customRender
                          ) : (
                            <span className="grid min-w-0 gap-0.5">
                              <span className="truncate font-semibold text-slate-900 dark:text-white">
                                {option.label}
                              </span>
                              {showDescription && (option.category || option.description) ? (
                                <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {option.category || option.description}
                                </span>
                              ) : null}
                            </span>
                          )}
                          {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                /* Flat view fallback */
                groupedData.flatList.map((option, index) => {
                  const isSelected = value === option.value;
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
                      } ${isActive ? "bg-slate-50 dark:bg-slate-800/50" : ""} ${
                        isSelected && isActive ? "bg-blue-50 dark:bg-blue-500/10" : ""
                      }`}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                    >
                      {option.customRender ? (
                        option.customRender
                      ) : (
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate font-semibold text-slate-900 dark:text-white">
                            {option.label}
                          </span>
                          {showDescription && (option.description || option.category) ? (
                            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {option.category || option.description}
                            </span>
                          ) : null}
                        </span>
                      )}
                      {isSelected && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
