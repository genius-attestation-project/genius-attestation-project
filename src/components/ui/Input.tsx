import type { InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";
import { capitalizeFirstCharacter, formatTitleCase, shouldCapitalizeUserInput } from "@/utils/format";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
  capitalizeFirstLetter?: boolean;
};

export function Input({
  label,
  description,
  id,
  className = "",
  capitalizeFirstLetter,
  onBlur,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const normalizeOnBlur: InputHTMLAttributes<HTMLInputElement>["onBlur"] = (event) => {
    const input = event.currentTarget;
    const shouldCapitalize = capitalizeFirstLetter ?? shouldCapitalizeUserInput(props.name, props.type);
    const nextValue = shouldCapitalize ? capitalizeFirstCharacter(input.value) : input.value;

    if (nextValue !== input.value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    onBlur?.(event);
  };

  return (
    <label className="grid min-w-0 gap-2" htmlFor={inputId}>
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-sm font-bold">{formatTitleCase(label)}</span>
        {description ? <span className="text-xs text-muted">{formatTitleCase(description)}</span> : null}
      </span>
      <input
        id={inputId}
        className={cn(
          "h-12 w-full min-w-0 rounded-xl bg-white/80 px-4 text-(--text) outline-none ring-1 ring-slate-900/10 transition placeholder:text-(--text-muted) focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:ring-white/10 dark:focus:ring-blue-500/80",
          className,
        )}
        onBlur={normalizeOnBlur}
        {...props}
      />
    </label>
  );
}
