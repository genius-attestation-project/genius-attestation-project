import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";

type StatsCardProps = {
  label: string;
  value: string;
  delta: string;
  description: string;
  icon: LucideIcon;
  tone?: "blue" | "slate" | "amber";
};

const toneStyles = {
  blue: "from-blue-500/18 via-blue-500/6 to-transparent text-blue-600",
  slate: "from-slate-500/18 via-slate-500/6 to-transparent text-slate-600",
  amber: "from-amber-500/18 via-amber-500/6 to-transparent text-amber-600",
};

export function StatsCard({
  label,
  value,
  delta,
  description,
  icon: Icon,
  tone = "blue",
}: StatsCardProps) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 dark:bg-white/5">
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-br opacity-100 transition group-hover:opacity-80",
          toneStyles[tone],
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-soft">{label}</p>
          <strong className="mt-3 block break-words text-xl font-semibold tracking-tight sm:text-2xl">{value}</strong>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-white/90 dark:border-white/10 dark:bg-white/5">
          <Icon size={18} />
        </span>
      </div>
      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-soft">{description}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/10">
          {delta}
          <ArrowUpRight size={14} />
        </span>
      </div>
    </article>
  );
}
