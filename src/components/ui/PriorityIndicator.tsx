"use client";

import React from "react";

export type PriorityType = "Normal" | "Express" | "Super Fast" | "SuperFast" | "Super-Fast" | string | null | undefined;

export type PriorityIndicatorProps = {
  priority: PriorityType;
  className?: string;
};

export function PriorityIndicator({ priority, className = "" }: PriorityIndicatorProps) {
  const normPriority = (priority || "Normal").trim().toLowerCase();

  let colorClass = "bg-emerald-500 border-emerald-600";
  let label = "Normal Priority";

  if (normPriority === "express") {
    colorClass = "bg-amber-500 border-amber-600";
    label = "Express Priority";
  } else if (
    normPriority === "super fast" ||
    normPriority === "superfast" ||
    normPriority === "super-fast"
  ) {
    colorClass = "bg-red-600 border-red-700";
    label = "Super Fast Priority";
  }

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-block h-3 w-3 rounded-full border border-black/10 shrink-0 shadow-2xs ${colorClass} ${className}`}
    />
  );
}
