"use client";

import {
  Building2,
  FileText,
  Layers,
  LoaderCircle,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/utils/cn";

type GlobalSearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type GlobalSearchResponse = {
  modules: GlobalSearchItem[];
  leads: GlobalSearchItem[];
  registrations: GlobalSearchItem[];
  users: GlobalSearchItem[];
  departments: GlobalSearchItem[];
  officeLocations: GlobalSearchItem[];
};

type SearchBarProps = {
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  onSearch?: (value: string) => void;
  global?: boolean;
};

const emptyResults: GlobalSearchResponse = {
  modules: [],
  leads: [],
  registrations: [],
  users: [],
  departments: [],
  officeLocations: [],
};

const resultGroups: Array<{
  key: keyof GlobalSearchResponse;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "modules", label: "Modules", icon: Layers },
  { key: "leads", label: "Leads", icon: Users },
  { key: "registrations", label: "Registrations", icon: FileText },
  { key: "users", label: "Users", icon: Users },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "officeLocations", label: "Office Locations", icon: MapPin },
];

export function SearchBar({
  placeholder = "Search",
  defaultValue = "",
  className,
  onSearch,
  global = false,
}: SearchBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [results, setResults] = useState<GlobalSearchResponse>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flattenedResults = useMemo(
    () =>
      resultGroups.flatMap((group) =>
        results[group.key].map((item) => ({
          ...item,
          group: group.label,
        })),
      ),
    [results],
  );

  const hasQuery = value.trim().length > 0;
  const hasResults = flattenedResults.length > 0;

  useEffect(() => {
    if (!global) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [global]);

  useEffect(() => {
    if (!global) {
      return;
    }

    const query = value.trim();

    if (!query) {
      setResults(emptyResults);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setOpen(true);

      try {
        const response = await fetch(`/api/global-search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as GlobalSearchResponse & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to search.");
        }

        setResults({
          modules: payload.modules ?? [],
          leads: payload.leads ?? [],
          registrations: payload.registrations ?? [],
          users: payload.users ?? [],
          departments: payload.departments ?? [],
          officeLocations: payload.officeLocations ?? [],
        });
        setActiveIndex(-1);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Global search failed", error);
          setResults(emptyResults);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [global, value]);

  function navigateTo(href: string) {
    setOpen(false);
    setActiveIndex(-1);
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!global) {
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || !hasResults) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flattenedResults.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? flattenedResults.length - 1 : index - 1,
      );
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      navigateTo(flattenedResults[activeIndex].href);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-sm shadow-sm dark:bg-white/5">
        <Search size={17} className="text-muted" />
        <input
          value={value}
          onFocus={() => {
            if (global && hasQuery) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setValue(event.target.value);
            onSearch?.(event.target.value);
            if (global) {
              setOpen(Boolean(event.target.value.trim()));
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-muted)]"
          placeholder={placeholder}
          autoComplete="off"
        />
        {global && loading ? (
          <LoaderCircle size={17} className="animate-spin text-blue-600" />
        ) : null}
      </label>

      {global && open && hasQuery ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[420px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-white/10 dark:bg-[var(--bg-sidebar)]">
          <div className="max-h-[420px] overflow-y-auto p-2">
            {loading && !hasResults ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-4 text-sm font-medium text-soft">
                <LoaderCircle size={16} className="animate-spin text-blue-600" />
                Searching...
              </div>
            ) : null}

            {!loading && !hasResults ? (
              <div className="rounded-xl px-3 py-5 text-center text-sm font-medium text-soft">
                No results found
              </div>
            ) : null}

            {resultGroups.map((group) => {
              const items = results[group.key];
              const Icon = group.icon;

              if (items.length === 0) {
                return null;
              }

              return (
                <div key={group.key} className="py-1">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-soft">
                    <Icon size={14} className="text-blue-600" />
                    {group.label}
                  </div>
                  <div className="grid gap-1">
                    {items.map((item) => {
                      const itemIndex = flattenedResults.findIndex(
                        (result) => result.group === group.label && result.id === item.id,
                      );

                      return (
                        <button
                          key={`${group.key}-${item.id}`}
                          type="button"
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          onClick={() => navigateTo(item.href)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2.5 text-left transition",
                            activeIndex === itemIndex
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                              : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-200",
                          )}
                        >
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <p className="mt-1 truncate text-xs text-soft">{item.subtitle}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
