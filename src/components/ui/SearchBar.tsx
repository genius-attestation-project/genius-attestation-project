"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { cn } from "@/utils/cn";

type SearchBarProps = {
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  onSearch?: (value: string) => void;
};

export function SearchBar({
  placeholder = "Search",
  defaultValue = "",
  className,
  onSearch,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <label
      className={cn(
        "flex h-12 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-sm shadow-sm dark:bg-white/5",
        className,
      )}
    >
      <Search size={17} className="text-muted" />
      <input
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onSearch?.(event.target.value);
        }}
        className="h-full flex-1 bg-transparent text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
        placeholder={placeholder}
      />
    </label>
  );
}
