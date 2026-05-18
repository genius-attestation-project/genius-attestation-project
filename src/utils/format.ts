export function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "";
  return source
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
