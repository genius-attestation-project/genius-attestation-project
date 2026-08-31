"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Building2, ChevronDown, ChevronLeft, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

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
    const hasMatch = item.label.toLowerCase().includes(query);
    
    // If parent matches the search query, we show all its children without filtering them further.
    // If parent doesn't match, we apply the search query filter to its children.
    let children = item.children
      ? filterNavigation(item.children, permissions, isSuperAdmin, hasMatch ? "" : query)
      : undefined;

    const visible =
      isSuperAdmin ||
      permissions.includes(item.menuPermission) ||
      permissions.includes(item.pagePermission) ||
      Boolean(children?.length);

    if (!visible) {
      return [];
    }
    
    // If there's a search query and this item doesn't match AND none of its children match, hide it.
    const childMatches = children && children.length > 0;
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
  onOpenSearch
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
        ) : (
          <button 
            title="Search"
            onClick={onOpenSearch}
            className="flex h-10 w-full items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
          >
            <Search size={18} />
          </button>
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
