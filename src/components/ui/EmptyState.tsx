import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="grid place-items-center gap-4 rounded-[28px] border border-dashed border-[color:var(--border-strong)] bg-white/40 px-6 py-12 text-center dark:bg-white/5">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
        <Icon size={24} />
      </span>
      <div className="grid gap-2">
        <h3 className="text-xl font-extrabold">{title}</h3>
        <p className="max-w-md text-sm leading-6 text-soft">{description}</p>
      </div>
      {action}
    </div>
  );
}
