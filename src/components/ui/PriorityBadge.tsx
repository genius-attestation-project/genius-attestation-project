"use client";

import React from "react";

export type PriorityType = "Normal" | "Express" | "Super Fast" | string | null | undefined;

export type PriorityBadgeProps = {
  priority: PriorityType;
  size?: "xs" | "sm" | "md";
  className?: string;
};

export function PriorityBadge({ priority, size = "sm", className = "" }: PriorityBadgeProps) {
  const normPriority = (priority || "Normal").trim();

  let styles = {
    backgroundColor: "#E8F5E9",
    color: "#2E7D32",
    borderColor: "#A5D6A7",
  };

  if (normPriority === "Express") {
    styles = {
      backgroundColor: "#FFF3E0",
      color: "#EF6C00",
      borderColor: "#FFCC80",
    };
  } else if (normPriority === "Super Fast" || normPriority === "SuperFast" || normPriority === "Super-Fast") {
    styles = {
      backgroundColor: "#FDECEC",
      color: "#C62828",
      borderColor: "#EF9A9A",
    };
  }

  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px]"
      : size === "md"
      ? "px-3 py-1 text-xs"
      : "px-2 py-0.5 text-[11px]";

  return (
    <span
      style={styles}
      className={`inline-flex items-center justify-center font-bold tracking-wide rounded-full border shadow-2xs whitespace-nowrap shrink-0 select-none ${sizeClasses} ${className}`}
    >
      {normPriority === "SuperFast" || normPriority === "Super-Fast" ? "Super Fast" : normPriority}
    </span>
  );
}
