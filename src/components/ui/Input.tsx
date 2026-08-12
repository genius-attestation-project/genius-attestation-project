"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  type,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const inputId = id ?? props.name;
  const normalizeOnBlur: InputHTMLAttributes<HTMLInputElement>["onBlur"] = (event) => {
    const input = event.currentTarget;
    const shouldCapitalize = capitalizeFirstLetter ?? shouldCapitalizeUserInput(props.name, type);
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
      <div className="relative flex items-center w-full">
        <input
          id={inputId}
          type={inputType}
          className={cn(
            "h-12 w-full min-w-0 rounded-xl bg-white/80 px-4 text-(--text) outline-none ring-1 ring-slate-900/10 transition placeholder:text-(--text-muted) focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:ring-white/10 dark:focus:ring-blue-500/80",
            isPassword && "pr-11",
            className,
          )}
          onBlur={normalizeOnBlur}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 focus:outline-none dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
    </label>
  );
}
