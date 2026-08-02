export function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "";
  return source
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Display-only title casing. It capitalizes the first character of each word
 * without lowercasing the remaining characters, so acronyms and existing values
 * retain their original spelling.
 */
export function formatTitleCase(value?: string | null): string {
  if (!value) return value ?? "";
  return value.replace(/(^|[\s\-/&:(])([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

/** Capitalize only the first character of user-entered text. */
export function capitalizeFirstCharacter(value: string): string {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

/** Identifiers and case-sensitive fields must retain the exact user input. */
export function shouldCapitalizeUserInput(name?: string, type?: string): boolean {
  if (type && ["email", "password", "url", "number", "date", "datetime-local", "time", "file", "hidden"].includes(type)) return false;
  return !/(email|password|url|tracking|reference|transaction|invoice|cheque|card|wallet|code|(^|[_-])id$|id$|number|mobile|phone|amount|date|key)/i.test(name || "");
}

/**
 * Standardized Date Formatter for the entire Application: DD/MM/YYYY
 * Example: 03/07/2026, 08/01/2026, 31/12/2026
 */
export function formatDate(dateInput?: Date | string | number | null): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Standardized Date & Time Formatter: DD/MM/YYYY hh:mm A
 * Example: 03/07/2026 10:30 AM
 */
export function formatDateTime(dateInput?: Date | string | number | null): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const dateStr = formatDate(date);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, "0");

  return `${dateStr} ${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Standardized Bundle Number Formatter: Displays trailing 4-digit numeric portion.
 * Examples:
 * - "HOME-20260802-2699" -> "2699"
 * - "HOME-20260802-0005" -> "0005"
 * - "HOME-20260802-5"    -> "0005"
 * - "2699"               -> "2699"
 */
export function formatBundleNumber(bundleNumber?: string | null): string {
  if (!bundleNumber) return "-";
  const str = String(bundleNumber).trim();
  if (!str) return "-";

  const parts = str.split("-");
  const lastPart = parts[parts.length - 1];

  if (/^\d+$/.test(lastPart)) {
    return lastPart.padStart(4, "0");
  }

  const match = str.match(/\d+$/);
  if (match) {
    return match[0].padStart(4, "0");
  }

  return str;
}
