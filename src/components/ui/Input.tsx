import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2" htmlFor={inputId}>
      <span className="text-sm font-bold">{label}</span>
      <input
        id={inputId}
        className={`h-12 w-full rounded-lg border border-stone-200 bg-white px-3 text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15 ${className}`}
        {...props}
      />
    </label>
  );
}
