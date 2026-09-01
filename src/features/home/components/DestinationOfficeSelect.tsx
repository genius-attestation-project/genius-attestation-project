"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export type OfficeOption = {
  id: string;
  officeName: string;
  category?: string;
  isAssignedOffice?: boolean;
};

interface DestinationOfficeSelectProps {
  offices?: OfficeOption[];
  assignedOfficesInput?: OfficeOption[];
  globalOfficesInput?: OfficeOption[];
  currentOfficeId?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DestinationOfficeSelect({
  offices = [],
  assignedOfficesInput,
  globalOfficesInput,
  currentOfficeId,
  value,
  onChange,
  disabled = false,
  placeholder = "Select Office",
}: DestinationOfficeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // All available offices combined
  const allAvailableOffices = useMemo(() => {
    if (assignedOfficesInput || globalOfficesInput) {
      return [...(assignedOfficesInput || []), ...(globalOfficesInput || [])];
    }
    return offices;
  }, [offices, assignedOfficesInput, globalOfficesInput]);

  // Filter out the current active location (cannot transfer to self)
  const availableOffices = useMemo(() => {
    if (!currentOfficeId) return allAvailableOffices;
    return allAvailableOffices.filter((o) => o.id !== currentOfficeId);
  }, [allAvailableOffices, currentOfficeId]);

  // Selected office object
  const selectedOffice = useMemo(() => {
    return availableOffices.find((o) => o.id === value) || allAvailableOffices.find((o) => o.id === value);
  }, [availableOffices, allAvailableOffices, value]);

  // Categorized & filtered options
  const { assignedOffices, globalOffices, flatList } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const sourceAssigned = assignedOfficesInput
      ? assignedOfficesInput
      : offices.filter((o) => o.category === "ASSIGNED_OFFICE" || o.isAssignedOffice);

    const sourceGlobal = globalOfficesInput
      ? globalOfficesInput
      : offices.filter((o) => !(o.category === "ASSIGNED_OFFICE" || o.isAssignedOffice));

    const filterSelf = (list: OfficeOption[]) =>
      currentOfficeId ? list.filter((o) => o.id !== currentOfficeId) : list;

    const filterSearch = (list: OfficeOption[]) =>
      term ? list.filter((o) => o.officeName.toLowerCase().includes(term)) : list;

    const assigned = filterSearch(filterSelf(sourceAssigned)).sort((a, b) =>
      a.officeName.localeCompare(b.officeName)
    );

    const global = filterSearch(filterSelf(sourceGlobal)).sort((a, b) =>
      a.officeName.localeCompare(b.officeName)
    );

    const flat = [...assigned, ...global];

    return {
      assignedOffices: assigned,
      globalOffices: global,
      flatList: flat,
    };
  }, [offices, assignedOfficesInput, globalOfficesInput, currentOfficeId, searchTerm]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search & active index when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      // Default active index to the selected item if available
      const initialIndex = flatList.findIndex((o) => o.id === value);
      setActiveIndex(initialIndex >= 0 ? initialIndex : 0);

      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Reset active index when search term changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  // Ensure active element scrolls into view during keyboard navigation
  useEffect(() => {
    if (isOpen && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (officeId: string) => {
    onChange(officeId);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const total = flatList.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (total > 0 ? (prev + 1) % total : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (total > 0 ? (prev - 1 + total) % total : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (total > 0 && flatList[activeIndex]) {
          handleSelect(flatList[activeIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  let globalCounter = 0;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="destination-office-listbox"
        aria-label="Select Destination Office"
        className={`flex items-center justify-between gap-3 min-w-50 sm:min-w-57.5 rounded-xl border bg-white px-3.5 py-2 text-sm font-semibold shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-900 ${
          disabled
            ? "cursor-not-allowed opacity-60 border-slate-200 dark:border-slate-800"
            : "cursor-pointer border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600"
        } ${selectedOffice ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
      >
        <span className="truncate">{selectedOffice ? selectedOffice.officeName : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && !disabled && (
        <div
          className="absolute right-0 sm:right-auto left-0 sm:left-auto top-full mt-1.5 z-50 w-72 sm:w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search Header */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search offices..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-8 pr-3 py-1.5 text-xs font-medium text-[#1F2937] placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          {/* Options Listbox */}
          <div
            ref={listboxRef}
            id="destination-office-listbox"
            role="listbox"
            tabIndex={-1}
            className="max-h-72 overflow-y-auto py-1"
          >
            {flatList.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs">
                <p className="font-bold text-[#1F2937] dark:text-slate-200">No offices found</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Try a different search term.</p>
              </div>
            ) : (
              <>
                {/* ASSIGNED OFFICES SECTION */}
                {assignedOffices.length > 0 && (
                  <div role="group" aria-label="Assigned Offices">
                    <div className="sticky top-0 z-10 border-y border-slate-200 bg-slate-100/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      ASSIGNED OFFICES
                    </div>
                    {assignedOffices.map((office) => {
                      const itemIndex = globalCounter++;
                      const isSelected = office.id === value;
                      const isActive = itemIndex === activeIndex;

                      return (
                        <button
                          key={office.id}
                          ref={(el) => {
                            optionRefs.current[itemIndex] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(office.id)}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "font-bold text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/60"
                              : isActive
                              ? "bg-blue-50/80 text-[#1F2937] dark:bg-blue-950/40 dark:text-slate-100 font-medium"
                              : "text-[#1F2937] dark:text-slate-200 hover:bg-blue-50/70 hover:text-[#1F2937] dark:hover:bg-blue-950/30 font-medium"
                          }`}
                        >
                          <span className="truncate">{office.officeName}</span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* GLOBAL OFFICES SECTION */}
                {globalOffices.length > 0 && (
                  <div role="group" aria-label="Global Offices">
                    <div className="sticky top-0 z-10 border-y border-slate-200 bg-slate-100/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      GLOBAL OFFICES
                    </div>
                    {globalOffices.map((office) => {
                      const itemIndex = globalCounter++;
                      const isSelected = office.id === value;
                      const isActive = itemIndex === activeIndex;

                      return (
                        <button
                          key={office.id}
                          ref={(el) => {
                            optionRefs.current[itemIndex] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(office.id)}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "font-bold text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/60"
                              : isActive
                              ? "bg-blue-50/80 text-[#1F2937] dark:bg-blue-950/40 dark:text-slate-100 font-medium"
                              : "text-[#1F2937] dark:text-slate-200 hover:bg-blue-50/70 hover:text-[#1F2937] dark:hover:bg-blue-950/30 font-medium"
                          }`}
                        >
                          <span className="truncate">{office.officeName}</span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
