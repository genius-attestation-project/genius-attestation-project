import { prisma } from "@/lib/prisma";

export const ATTENDANCE_NOT_READY_MESSAGE =
  "Attendance system is not set up yet. Database migrations need to be applied.";

export function todayDate(): Date {
  return startOfDay(new Date());
}

export function startOfDay(value: Date | string): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date | string): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return startOfDay(date);
}

export function eachDayInclusive(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(from);
  const last = startOfDay(to);

  while (current <= last) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function calcWorkingHours(checkin: Date, checkout: Date): number {
  const ms = checkout.getTime() - checkin.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

export function isLate(checkinTime: Date, expectedTime: string): boolean {
  const [expH, expM] = expectedTime.split(":").map(Number);
  const actual = checkinTime.getHours() * 60 + checkinTime.getMinutes();
  const expected = (expH ?? 9) * 60 + (expM ?? 0);
  return actual > expected;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: startOfDay(start), end: startOfDay(end) };
}

export function isTableMissingError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = String((err as { code?: unknown }).code ?? "");
  const message = String((err as { message?: unknown }).message ?? "");
  const meta = (err as { meta?: { table?: string; modelName?: string } }).meta;
  return (
    code === "P2021" ||
    code === "P2022" ||
    code === "42P01" ||
    code === "42704" ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("attendance_records") ||
    message.includes("attendance_settings") ||
    message.includes("leave_requests") ||
    meta?.table?.includes("attendance") === true ||
    meta?.table?.includes("leave") === true ||
    meta?.modelName?.includes("Attendance") === true ||
    meta?.modelName?.includes("Leave") === true
  );
}

export async function assertUserBelongsToAdmin(userId: string, ownerAdminId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      OR: [{ ownerAdminId }, { id: ownerAdminId }],
      isActive: true,
    },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Selected user is not in your workspace.");
  }
}
