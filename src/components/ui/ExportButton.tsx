"use client";

import { Download } from "lucide-react";
import { Button } from "./Button";

type ExportButtonProps = {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

export function ExportButton({
  onClick,
  loading = false,
  disabled = false,
  size = "md",
  className = "",
  label = "Export as Excel",
}: ExportButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      title={label}
    >
      <Download
        size={size === "sm" ? 14 : 16}
        className={loading ? "animate-spin" : "text-emerald-600 dark:text-emerald-400"}
      />
      <span>{label}</span>
    </Button>
  );
}

