import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type DashboardCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({
  title,
  description,
  action,
  children,
  className,
}: DashboardCardProps) {
  return (
    <section
      className={cn(
        "surface-panel min-w-0 rounded-2xl border border-[color:var(--border)] p-4 sm:p-5 md:p-6",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-soft">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
