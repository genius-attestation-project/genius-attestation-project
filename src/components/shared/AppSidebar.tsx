"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminManagementLinks, sidebarItems } from "@/features/dashboard/data/dashboard.data";
import { cn } from "@/utils/cn";

type AppSidebarProps = {
  userName: string;
  userEmail: string;
};

export function AppSidebar({ userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/dashboard/admin-management"));

  useEffect(() => {
    if (pathname.startsWith("/dashboard/admin-management")) {
      setAdminOpen(true);
    }
  }, [pathname]);

  const activeAdminLink = useMemo(
    () => adminManagementLinks.find((link) => pathname.startsWith(link.href)),
    [pathname],
  );

  function renderNavItems(showLabels: boolean) {
    return sidebarItems.map((item) => {
      const isAdmin = item.href === "/dashboard/admin-management";
      const isActive =
        item.href === "/dashboard"
          ? pathname === item.href
          : pathname.startsWith(item.href);

      if (isAdmin) {
        return (
          <div key={item.href} className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                if (!showLabels) {
                  setCollapsed(false);
                  setAdminOpen(true);
                  return;
                }

                setAdminOpen((value) => !value);
              }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition",
                isActive || adminOpen
                  ? "border-blue-100 bg-blue-100 text-blue-700 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-white"
                  : "border-transparent text-slate-700 hover:bg-blue-50 hover:text-slate-900 dark:text-white/72 dark:hover:border-white/10 dark:hover:bg-white/6 dark:hover:text-white",
              )}
            >
              <item.icon size={18} />
              {showLabels ? (
                <>
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown
                    size={16}
                    className={cn("transition", adminOpen && "rotate-180")}
                  />
                </>
              ) : null}
            </button>

            {showLabels ? (
              <AnimatePresence initial={false}>
                {adminOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 grid gap-1 border-l border-blue-200 pl-4 dark:border-blue-500/25">
                      {adminManagementLinks.map((link) => {
                        const isSubActive = pathname.startsWith(link.href);

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                              isSubActive
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                                : "text-slate-600 hover:bg-blue-50 hover:text-slate-900 dark:text-white/62 dark:hover:bg-white/6 dark:hover:text-white",
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
            "group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition",
            isActive
              ? "border-blue-100 bg-blue-100 text-blue-700 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-white"
              : "border-transparent text-slate-700 hover:bg-blue-50 hover:text-slate-900 dark:text-white/72 dark:hover:border-white/10 dark:hover:bg-white/6 dark:hover:text-white",
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
                activeAdminLabel={activeAdminLink?.label}
              >
                {renderNavItems(true)}
              </SidebarPanel>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 96 : 292 }}
        className="sticky top-0 hidden h-screen shrink-0 lg:block"
      >
        <SidebarPanel
          collapsed={collapsed}
          userName={userName}
          userEmail={userEmail}
          activeAdminLabel={activeAdminLink?.label}
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
  activeAdminLabel?: string;
  toggle?: ReactNode;
  children: ReactNode;
};

function SidebarPanel({
  collapsed,
  userName,
  userEmail,
  activeAdminLabel,
  toggle,
  children,
}: SidebarPanelProps) {
  return (
    <div className="flex h-full flex-col gap-6 border-r border-slate-100 bg-white px-4 py-5 text-slate-900 dark:border-white/8 dark:bg-[var(--bg-sidebar)] dark:text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-200/85">
            Genius ERP
          </p>
          {!collapsed ? (
            <>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">Workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
                Minimal CRM and ERP navigation
              </p>
            </>
          ) : null}
        </div>
        {toggle}
      </div>

      {!collapsed ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/8 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
            Signed in
          </p>
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">{userName}</p>
          <p className="text-sm text-slate-600 dark:text-white/58">{userEmail}</p>
          {activeAdminLabel ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-blue-600 dark:text-blue-200/80">
              Focus: {activeAdminLabel}
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
