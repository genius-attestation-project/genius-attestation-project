"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

type FilterOption = {
  label: string;
  value: string;
};

type FilterDropdownProps = {
  label: string;
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

  return (
    <label className={`inline-flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-[color:var(--border)] px-4 text-sm shadow-sm sm:w-auto ${disabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-white/70 dark:bg-white/5'}`}>
      <span className="font-semibold text-soft">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event.target.value);
        }}
        disabled={disabled}
        className={`min-w-0 flex-1 bg-transparent font-semibold outline-none sm:flex-none ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="text-muted" />
    </label>
  );
}
