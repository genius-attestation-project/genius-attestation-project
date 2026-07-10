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
  blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/20",
  slate: "bg-slate-50 text-slate-600 ring-slate-100 dark:bg-slate-500/10 dark:ring-slate-500/20",
  amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20",
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
    <article className="group relative flex h-full min-h-[156px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl p-4 ring-1 ring-slate-900/5 surface-panel transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5 dark:ring-white/10">
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-soft">{label}</p>
          <strong className="mt-3 block wrap-break-word text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">{value}</strong>
        </div>
        <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1", toneStyles[tone])}>
          <Icon size={20} />
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
