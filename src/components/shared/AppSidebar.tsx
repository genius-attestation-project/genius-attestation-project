"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, ChevronDown, ChevronLeft, Menu } from "lucide-react";
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
};

function filterNavigation(
  items: NavigationItemDefinition[],
  permissions: string[],
  isSuperAdmin: boolean,
): NavigationItemDefinition[] {
  return items.flatMap((item) => {
    const children = item.children
      ? filterNavigation(item.children, permissions, isSuperAdmin)
      : undefined;
    const visible =
      isSuperAdmin ||
      permissions.includes(item.menuPermission) ||
      permissions.includes(item.pagePermission) ||
      Boolean(children?.length);

    if (!visible) {
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
}: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/dashboard/admin-management"));
  const [leadOpen, setLeadOpen] = useState(pathname.startsWith("/dashboard/lead-management"));
  const [attendanceOpen, setAttendanceOpen] = useState(pathname.startsWith("/dashboard/attendance"));
  const [leaveOpen, setLeaveOpen] = useState(pathname.startsWith("/dashboard/leave-management"));
  const [salaryOpen, setSalaryOpen] = useState(pathname.startsWith("/dashboard/salary-management"));

  const visibleNavigation = useMemo(
    () => filterNavigation(sidebarNavigation, permissions, isSuperAdmin),
    [permissions, isSuperAdmin],
  );
  const activeLink = useMemo(() => {
    const items = flattenNavigation(visibleNavigation);
    return items.find((link) =>
      link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href),
    );
  }, [pathname, visibleNavigation]);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/admin-management")) {
      setAdminOpen(true);
    }

    if (pathname.startsWith("/dashboard/lead-management")) {
      setLeadOpen(true);
    }

    if (pathname.startsWith("/dashboard/attendance")) {
      setAttendanceOpen(true);
    }

    if (pathname.startsWith("/dashboard/leave-management")) {
      setLeaveOpen(true);
    }

    if (pathname.startsWith("/dashboard/salary-management")) {
      setSalaryOpen(true);
    }
  }, [pathname]);

  function renderNavItems(showLabels: boolean) {
    return visibleNavigation.map((item) => {
      const isAdmin = item.href === "/dashboard/admin-management";
      const isLead = item.href === "/dashboard/lead-management";
      const isAttendance = item.href === "/dashboard/attendance";
      const isLeave = item.href === "/dashboard/leave-management";
      const isSalary = item.href === "/dashboard/salary-management";
      const isActive =
        item.href === "/dashboard"
          ? pathname === item.href
          : pathname.startsWith(item.href);

      if ((isAdmin || isLead || isAttendance || isLeave || isSalary) && item.children?.length) {
        const accordionOpen = isAdmin
          ? adminOpen
          : isLead
            ? leadOpen
            : isAttendance
              ? attendanceOpen
              : isLeave
                ? leaveOpen
                : salaryOpen;
        const setAccordionOpen = isAdmin
          ? setAdminOpen
          : isLead
            ? setLeadOpen
            : isAttendance
              ? setAttendanceOpen
              : isLeave
                ? setLeaveOpen
                : setSalaryOpen;

        return (
          <div key={item.href} className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                if (!showLabels) {
                  setCollapsed(false);
                  setAccordionOpen(true);
                  return;
                }

                setAccordionOpen((value) => !value);
              }}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition duration-200",
                isActive || accordionOpen
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white",
              )}
            >
              <item.icon size={18} />
              {showLabels ? (
                <>
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown
                    size={16}
                    className={cn("transition", accordionOpen && "rotate-180")}
                  />
                </>
              ) : null}
            </button>

            {showLabels ? (
              <AnimatePresence initial={false}>
                {accordionOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 grid gap-1 border-l border-blue-200 pl-4 dark:border-blue-500/25">
                      {item.children.map((link) => {
                        const isSubActive = pathname.startsWith(link.href);

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200",
                              isSubActive
                                ? "bg-blue-50/80 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white",
                            )}
                          >
                            <link.icon size={16} />
                            <span>{link.label}</span>
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
          onClick={() => setMobileOpen(false)}
          className={cn(
            "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition duration-200",
            isActive
              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-white"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white",
          )}
        >
          <item.icon size={18} />
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
              className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm lg:hidden"
            >
              <SidebarPanel
                collapsed={false}
                userName={userName}
                userEmail={userEmail}
                activeLabel={activeLink?.label}
              >
                {renderNavItems(true)}
              </SidebarPanel>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 96 : 292 }}
        className="hidden h-full min-h-0 shrink-0 lg:block"
      >
        <SidebarPanel
          collapsed={collapsed}
          userName={userName}
          userEmail={userEmail}
          activeLabel={activeLink?.label}
          toggle={
            <Button
              variant="ghost"
              size="icon"
              className="border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-slate-900 dark:border-white/10 dark:text-white dark:hover:bg-white/8 dark:hover:text-white"
              onClick={() => setCollapsed((value) => !value)}
            >
              <ChevronLeft size={18} className={cn("transition", collapsed && "rotate-180")} />
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
};

function SidebarPanel({
  collapsed,
  userName,
  userEmail,
  activeLabel,
  toggle,
  children,
}: SidebarPanelProps) {
  return (
    <div className="flex h-full flex-col gap-6 bg-[var(--bg-sidebar)] px-4 py-5 text-slate-900 shadow-[2px_0_24px_rgba(15,23,42,0.02)] dark:border-r dark:border-white/5 dark:text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <BadgeCheck size={22} />
          </span>
          {!collapsed ? (
            <p className="truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              Genius Attestation
            </p>
          ) : null}
        </div>
        {toggle}
      </div>

      {!collapsed ? (
        <div className="rounded-2xl border border-slate-100/60 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-white/45">
            Signed in
          </p>
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">{userName}</p>
          <p className="text-sm text-slate-600 dark:text-white/58">{userEmail}</p>
          {activeLabel ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-blue-600 dark:text-blue-200/80">
              Focus: {activeLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      <nav className="grid gap-2 overflow-y-auto" aria-label="Dashboard">
        {children}
      </nav>
    </div>
  );
}



