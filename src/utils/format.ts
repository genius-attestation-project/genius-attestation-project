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
