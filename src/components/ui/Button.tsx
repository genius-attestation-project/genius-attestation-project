import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

const variants = {
  primary: "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  secondary:
    "border-stone-200 bg-white text-neutral-950 hover:border-emerald-700",
  ghost:
    "border-transparent bg-transparent text-neutral-950 hover:border-emerald-700",
};

export function Button({
  className = "",
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
