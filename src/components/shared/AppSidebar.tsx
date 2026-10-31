"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Building2, ChevronDown, ChevronLeft, FileSearch, Loader2, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  sidebarNavigation,
  type NavigationItemDefinition,
} from "@/features/admin/data/rbac.data";
import { cn } from "@/utils/cn";

type AppSidebarProps = {
  userName: string;
  userEmail: string;
  permissions: string[];
  isSuperAdmin: boolean;
  isAssignedOffice?: boolean;
};

function filterNavigation(
  items: NavigationItemDefinition[],
  permissions: string[],
  isSuperAdmin: boolean,
  searchQuery: string = ""
): NavigationItemDefinition[] {
  const query = searchQuery.toLowerCase().trim();
  
  return items.flatMap((item) => {
    if (item.superAdminOnly && !isSuperAdmin) {
      return [];
    }

    const hasMatch = item.label.toLowerCase().includes(query);
    
    // If parent matches the search query, we show all its children without filtering them further.
    // If parent doesn't match, we apply the search query filter to its children.
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const children = hasChildren
      ? filterNavigation(item.children!, permissions, isSuperAdmin, hasMatch ? "" : query)
      : undefined;

    const visible =
      (isSuperAdmin && item.href !== "/dashboard") ||
      permissions.includes(item.menuPermission) ||
      permissions.includes(item.pagePermission) ||
      (hasChildren && Boolean(children && children.length > 0)) ||
      (isSuperAdmin && item.href === "/dashboard" && (!permissions.length || permissions.includes("dashboard.view") || permissions.includes("menu.dashboard")));

    if (!visible) {
      return [];
    }
    
    // If there's a search query and this item doesn't match AND none of its children match, hide it.
    const childMatches = Boolean(children && children.length > 0);
    if (query && !hasMatch && !childMatches) {
       return [];
    }

    return [{ ...item, children }];
  });
}

function flattenNavigation(items: NavigationItemDefinition[]): NavigationItemDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavigation(item.children) : [])]);
}

export function AppSidebar({
  userName,
  userEmail,
  permissions,
  isSuperAdmin,
  isAssignedOffice,
}: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const visibleNavigation = useMemo(() => {
    if (isAssignedOffice) {
      return [
        {
          label: "Assigned Office",
          href: "/dashboard/assigned-office/workspace",
          icon: Building2,
          menuPermission: "menu.assigned-office",
          pagePermission: "assigned_office.view",
        },
      ];
    }
    return filterNavigation(sidebarNavigation, permissions, isSuperAdmin, searchQuery);
  }, [permissions, isSuperAdmin, searchQuery, isAssignedOffice]);

  const canSearchTracking = Boolean(
    isSuperAdmin ||
    permissions.includes("search_report.search") ||
    permissions.includes("search_report.view")
  );

  const activeLink = useMemo(() => {
    if (isAssignedOffice) {
      return visibleNavigation[0];
    }
    const items = flattenNavigation(filterNavigation(sidebarNavigation, permissions, isSuperAdmin, ""));
    return items.find((link) =>
      link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href),
    );
  }, [pathname, permissions, isSuperAdmin, isAssignedOffice, visibleNavigation]);

  // Expand parent accordion on initial load based on pathname
  useEffect(() => {
    const parent = sidebarNavigation.find(
      (item) => item.children?.length && pathname.startsWith(item.href)
    );
    if (parent) {
      setExpandedMenu(parent.href);
    }
  }, [pathname]);

  function renderNavItems(showLabels: boolean) {
    return visibleNavigation.map((item) => {
      const isActive =
        item.href === "/dashboard"
          ? pathname === item.href
          : pathname.startsWith(item.href);

      if (item.children?.length) {
        const accordionOpen = expandedMenu === item.href;
        
        return (
          <div key={item.href} className="grid gap-1 mb-1.5">
            <button
              type="button"
              title={!showLabels ? item.label : undefined}
              onClick={() => {
                if (!showLabels) {
                  setCollapsed(false);
                  setExpandedMenu(item.href);
                  return;
                }
                setExpandedMenu(accordionOpen ? null : item.href);
              }}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                accordionOpen || isActive
                  ? "bg-slate-100/70 text-slate-900 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-white/10 dark:text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r bg-blue-600 dark:bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
              )}
              <item.icon size={18} className={cn(
                "transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-blue-600 dark:text-blue-400" : ""
              )} />
              {showLabels ? (
                <>
                  <span className={cn("flex-1", (accordionOpen || isActive) && "font-semibold")}>
                    {item.label}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "transition-transform duration-300 text-slate-400 dark:text-white/40", 
                      accordionOpen && "rotate-180 text-slate-900 dark:text-white"
                    )}
                  />
                </>
              ) : null}
            </button>

            {showLabels ? (
              <AnimatePresence initial={false}>
                {accordionOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: -5 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -5 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 ml-5.25 grid gap-1 border-l-2 border-slate-100 pl-3.5 dark:border-white/10">
                      {item.children.map((link) => {
                        const isSubActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            title={link.label}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-all duration-200",
                              isSubActive
                                ? "bg-blue-50 text-blue-700 font-semibold shadow-sm dark:bg-blue-500/15 dark:text-blue-200"
                                : "text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                            )}
                          >
                            <link.icon size={16} className={cn(
                              "transition-transform duration-200 group-hover:scale-110",
                              isSubActive ? "text-blue-600 dark:text-blue-400" : "opacity-70"
                            )} />
                            <span className="truncate">{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            ) : null}
          </div>
        );
      }

      return (
        <Link
          key={item.href}
          href={item.href}
          title={!showLabels ? item.label : undefined}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-1.5",
            isActive
              ? "bg-blue-50 text-blue-700 shadow-[0_2px_10px_-4px_rgba(37,99,235,0.2)] font-semibold dark:bg-blue-500/15 dark:text-blue-200"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white",
          )}
        >
          {isActive && (
            <div className="absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r bg-blue-600 dark:bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
          )}
          <item.icon size={18} className={cn(
            "transition-transform duration-200 group-hover:scale-110",
            isActive ? "text-blue-600 dark:text-blue-400" : ""
          )} />
          {showLabels ? <span>{item.label}</span> : null}
        </Link>
      );
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <Button variant="secondary" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu size={18} />
        </Button>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm lg:hidden"
            >
              <SidebarPanel
                collapsed={false}
                userName={userName}
                userEmail={userEmail}
                activeLabel={activeLink?.label}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenSearch={() => {}}
                canSearchTracking={canSearchTracking}
                onNavigateTracking={() => setMobileOpen(false)}
              >
                {renderNavItems(true)}
              </SidebarPanel>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="hidden h-full min-h-0 shrink-0 lg:block border-r border-slate-200/60 dark:border-white/10"
      >
        <SidebarPanel
          collapsed={collapsed}
          userName={userName}
          userEmail={userEmail}
          activeLabel={activeLink?.label}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenSearch={() => setCollapsed(false)}
          canSearchTracking={canSearchTracking}
          toggle={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full border border-slate-200/60 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-[#0f1115] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => setCollapsed((value) => !value)}
            >
              <ChevronLeft size={16} className={cn("transition-transform duration-300", collapsed && "rotate-180")} />
            </Button>
          }
        >
          {renderNavItems(!collapsed)}
        </SidebarPanel>
      </motion.aside>
    </>
  );
}

type SidebarPanelProps = {
  collapsed: boolean;
  userName: string;
  userEmail: string;
  activeLabel?: string;
  toggle?: ReactNode;
  children: ReactNode;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onOpenSearch: () => void;
  canSearchTracking?: boolean;
  onNavigateTracking?: () => void;
};

function SidebarPanel({
  collapsed,
  userName,
  userEmail,
  activeLabel,
  toggle,
  children,
  searchQuery,
  setSearchQuery,
  onOpenSearch,
  canSearchTracking = false,
  onNavigateTracking,
}: SidebarPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4 bg-(--bg-sidebar,white) px-3 py-5 text-slate-900 shadow-[2px_0_24px_rgba(15,23,42,0.01)] dark:bg-[#0f1115] dark:text-white">
      <div className={cn("flex items-center gap-3 px-2", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20">
            <BadgeCheck size={20} className="drop-shadow-sm" />
          </span>
          {!collapsed ? (
            <p className="truncate text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
              Genius Attest
            </p>
          ) : null}
        </div>
        {!collapsed && toggle}
      </div>
      
      {collapsed && (
         <div className="flex justify-center mt-2">
           {toggle}
         </div>
      )}

      <div className="mt-2 px-1">
        {!collapsed ? (
          <>
            <div className="relative group">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
              <input 
                type="text" 
                placeholder="Search menu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 py-2 pl-9 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              />
            </div>
            {canSearchTracking ? (
              <SidebarTrackingSearch onNavigate={onNavigateTracking} />
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button 
              title="Search menu"
              onClick={onOpenSearch}
              className="flex h-10 w-full items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
            >
              <Search size={18} />
            </button>
            {canSearchTracking ? (
              <button 
                title="Search tracking number"
                onClick={onOpenSearch}
                className="flex h-10 w-full items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
              >
                <FileSearch size={18} />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1 pt-1 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10" aria-label="Dashboard">
        {children}
      </nav>

      {/* User Profile Footer */}
      {!collapsed ? (
        <div className="mt-auto mx-1 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3.5 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
          <div className="flex flex-col">
            <p className="truncate font-semibold text-sm text-slate-900 dark:text-white">{userName}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-white/50">{userEmail}</p>
          </div>
          {activeLabel ? (
            <div className="mt-2.5 inline-flex items-center rounded-md bg-blue-100/50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              {activeLabel}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type TrackingSuggestionItem = {
  id: string;
  trackingNumber: string;
  customerName?: string | null;
  documentType?: string | null;
  documentName?: string | null;
  status?: string | null;
};

function SidebarTrackingSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<TrackingSuggestionItem[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch suggestions with debouncing
  useEffect(() => {
    const cleanTracking = trackingNumber.trim();
    if (!cleanTracking) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoadingSuggestions(true);
      setShowSuggestions(true);

      fetch(`/api/registrations/tracking/suggestions?q=${encodeURIComponent(cleanTracking)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            return { suggestions: [] };
          }
          return res.json().catch(() => ({ suggestions: [] }));
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          setSuggestions(data?.suggestions || []);
          setHighlightedIndex(-1);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingSuggestions(false);
          }
        });
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [trackingNumber]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelectSuggestion(selectedTracking: string) {
    setShowSuggestions(false);
    setSuggestions([]);
    setTrackingNumber("");
    setSearchError(null);
    if (onNavigate) {
      onNavigate();
    }
    router.push(`/dashboard/document-details/${encodeURIComponent(selectedTracking)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || (!isLoadingSuggestions && suggestions.length === 0)) {
      if (e.key === "Escape") {
        setShowSuggestions(false);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex].trackingNumber);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // If an item in suggestions is highlighted, select it
    if (showSuggestions && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[highlightedIndex].trackingNumber);
      return;
    }

    const cleanTracking = trackingNumber.trim();
    if (!cleanTracking) {
      setSearchError("Please enter a tracking number.");
      return;
    }

    if (isSearching) return;

    setShowSuggestions(false);
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/registrations/tracking/${encodeURIComponent(cleanTracking)}`);
      const data = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setSearchError("No document found for the entered tracking number.");
        return;
      }

      if (res.status === 403) {
        setSearchError(data.message || "You do not have permission to access this document.");
        return;
      }

      if (!res.ok) {
        setSearchError(data.message || "Failed to search tracking number.");
        return;
      }

      const resolvedTracking = data?.registration?.trackingNumber || cleanTracking;
      setTrackingNumber("");
      setSearchError(null);
      if (onNavigate) {
        onNavigate();
      }
      router.push(`/dashboard/document-details/${encodeURIComponent(resolvedTracking)}`);
    } catch (err: any) {
      setSearchError(err?.message || "An unexpected error occurred while searching.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div ref={containerRef} className="relative mt-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          placeholder="Enter Tracking Number"
          value={trackingNumber}
          onChange={(e) => {
            setTrackingNumber(e.target.value);
            if (searchError) setSearchError(null);
            if (!showSuggestions && e.target.value.trim()) {
              setShowSuggestions(true);
            }
          }}
          onFocus={() => {
            if (trackingNumber.trim()) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={isSearching}
          className="min-w-0 flex-1 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isSearching ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            "Go"
          )}
        </button>
      </form>

      {/* Suggestion Dropdown */}
      {showSuggestions && trackingNumber.trim() ? (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200/80 bg-white/95 p-1 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#12141a]/95 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
          {isLoadingSuggestions ? (
            <div className="flex items-center justify-center gap-2 py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Loader2 size={13} className="animate-spin text-blue-500" />
              <span>Searching documents...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-3 px-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              No matching documents found.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {suggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const docDetail = [item.customerName, item.documentType || item.documentName]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <button
                    key={item.id || item.trackingNumber}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectSuggestion(item.trackingNumber)}
                    className={cn(
                      "flex w-full flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition-colors",
                      isHighlighted
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                        : "text-slate-700 hover:bg-slate-50 dark:text-white/80 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold font-mono">
                        {item.trackingNumber}
                      </span>
                      {item.status ? (
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-white/60">
                          {item.status}
                        </span>
                      ) : null}
                    </div>
                    {docDetail ? (
                      <span className="mt-0.5 w-full truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {docDetail}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {searchError ? (
        <p className="mt-1 px-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 leading-tight">
          {searchError}
        </p>
      ) : null}
    </div>
  );
}
