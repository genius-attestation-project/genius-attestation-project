"use client";

import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FilterOption = {
  label: string;
  value: string;
};

type FilterDropdownProps = {
  label?: string;
  options: FilterOption[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

export function FilterDropdown({
  label,
  options,
  defaultValue,
  onChange,
  disabled,
}: FilterDropdownProps) {
  const fallbackValue = useMemo(() => options[0]?.value ?? "", [options]);
  const [value, setValue] = useState(defaultValue ?? fallbackValue);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setValue(val);
    onChange?.(val);
    setIsOpen(false);
  };

  // Sync value prop with internal state if it changes
  useEffect(() => {
    if (defaultValue !== undefined) {
      setValue(defaultValue);
    }
  }, [defaultValue]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300 text-sm">{label}</span>}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`inline-flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl ring-1 px-4 text-sm transition-all duration-200 ${
          disabled
            ? "bg-slate-50 opacity-60 cursor-not-allowed ring-slate-200 dark:bg-white/5 dark:ring-white/10"
            : isOpen
              ? "bg-white ring-blue-500 shadow-sm dark:bg-[#020617] dark:ring-blue-500"
              : "bg-white/70 ring-slate-900/10 hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 cursor-pointer"
        }`}
      >
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
          {selectedOption?.label ?? "Select option"}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-xl dark:border-white/10 dark:bg-[#0f172a] py-1 custom-scrollbar"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                  value === option.value
                    ? "bg-blue-50/80 text-blue-700 font-semibold dark:bg-blue-500/15 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
