import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";
import { capitalizeFirstCharacter, formatTitleCase, shouldCapitalizeUserInput } from "@/utils/format";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  description?: string;
  capitalizeFirstLetter?: boolean;
};

export function Textarea({
  label,
  description,
  id,
  className = "",
  capitalizeFirstLetter,
  onBlur,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;
  const normalizeOnBlur: TextareaHTMLAttributes<HTMLTextAreaElement>["onBlur"] = (event) => {
    const textarea = event.currentTarget;
    const shouldCapitalize = capitalizeFirstLetter ?? shouldCapitalizeUserInput(props.name, "text");
    const nextValue = shouldCapitalize ? capitalizeFirstCharacter(textarea.value) : textarea.value;
    if (nextValue !== textarea.value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(textarea, nextValue);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    onBlur?.(event);
  };

  return (
    <label className="grid gap-2" htmlFor={textareaId}>
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatTitleCase(label)}</span>
        {description ? <span className="text-xs text-muted">{formatTitleCase(description)}</span> : null}
      </span>
      <textarea
        id={textareaId}
        className={cn(
          "min-h-28 w-full rounded-2xl border border-(--border) bg-white/80 px-4 py-3 text-(--text) outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5",
          className,
        )}
        onBlur={normalizeOnBlur}
        {...props}
      />
    </label>
  );
}
