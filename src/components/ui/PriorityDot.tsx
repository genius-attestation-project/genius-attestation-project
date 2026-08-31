"use client";

import React from "react";
import type { PriorityType } from "./PriorityBadge";

export type PriorityDotProps = {
  priority: PriorityType;
  size?: number; // diameter in px, default 10
  className?: string;
};

/**
 * PriorityDot — a small filled circle used to indicate priority level
 * next to tracking numbers in tables.
 *
 * Color mapping:
 *   Normal    → #22C55E (green)
 *   Express   → #F59E0B (orange/amber)
 *   Super Fast → #EF4444 (red)
 *
 * No text, no badge, no pill — only a solid colored circle.
 * Reusable across Revenue Registration, Assigned Office, Process Module,
 * Home cards, and any future tracking table.
 *
 * Usage:
 *   <PriorityDot priority="Express" />
 *   <PriorityDot priority={registration.priority} size={12} />
 */
export function PriorityDot({ priority, size = 10, className = "" }: PriorityDotProps) {
  const normPriority = (priority || "Normal").trim();

  let color = "#22C55E"; // Normal — green

  if (normPriority === "Express") {
    color = "#F59E0B"; // orange/amber
  } else if (
    normPriority === "Super Fast" ||
    normPriority === "SuperFast" ||
    normPriority === "Super-Fast"
  ) {
    color = "#EF4444"; // red
  }

  return (
    <span
      aria-label={`Priority: ${normPriority === "SuperFast" || normPriority === "Super-Fast" ? "Super Fast" : normPriority}`}
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  );
}
