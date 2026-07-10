import type { InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
};

export function Input({
  label,
  description,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid min-w-0 gap-2" htmlFor={inputId}>
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-sm font-bold">{label}</span>
        {description ? <span className="text-xs text-muted">{description}</span> : null}
      </span>
      <input
        id={inputId}
        className={cn(
          "h-12 w-full min-w-0 rounded-xl bg-white/80 px-4 text-(--text) outline-none ring-1 ring-slate-900/10 transition placeholder:text-[color:var(--text-muted)] focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:ring-white/10 dark:focus:ring-blue-500/80",
          className,
        )}
        {...props}
      />
    </label>
  );
}
