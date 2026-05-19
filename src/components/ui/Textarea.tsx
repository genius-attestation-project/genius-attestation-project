import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  description?: string;
};

export function Textarea({
  label,
  description,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="grid gap-2" htmlFor={textareaId}>
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        {description ? <span className="text-xs text-muted">{description}</span> : null}
      </span>
      <textarea
        id={textareaId}
        className={cn(
          "min-h-28 w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5",
          className,
        )}
        {...props}
      />
    </label>
  );
}
