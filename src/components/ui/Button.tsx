import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
};

const variants = {
  primary:
    "border-blue-500/30 bg-linear-to-r from-blue-600 via-blue-500 to-sky-500 text-white hover:shadow-[0_18px_32px_rgba(37,99,235,0.24)]",
  secondary:
    "border-[color:var(--border)] bg-white/80 text-[color:var(--text)] hover:border-blue-500/35 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/10",
  ghost:
    "border-transparent bg-transparent text-[color:var(--text)] hover:border-blue-500/25 hover:bg-blue-50 dark:hover:bg-blue-500/10",
  danger:
    "border-rose-500/20 bg-rose-500/10 text-rose-600 hover:border-rose-500/35 hover:bg-rose-500/15",
};

const sizes = {
  sm: "min-h-9 rounded-xl px-3 text-sm",
  md: "min-h-11 rounded-2xl px-4 text-sm",
  lg: "min-h-12 rounded-2xl px-5 text-sm",
  icon: "h-11 w-11 rounded-2xl px-0",
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap border font-semibold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
