"use client";

import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/utils/cn";

type FollowupDateTimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  required?: boolean;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

type CalendarDay = {
  key: string;
  label: number;
  isoDate: string;
  isCurrentMonth: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDateTime(value: string) {
  if (!value) {
    return null;
  }

  const [datePart, timePart = "09:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes);
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    return {
      key: current.toISOString(),
      label: current.getDate(),
      isoDate: `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`,
      isCurrentMonth: current.getMonth() === monthDate.getMonth(),
    } satisfies CalendarDay;
  });
}

export function FollowupDateTimePicker({
  label,
  value,
  onChange,
  description,
  required,
}: FollowupDateTimePickerProps) {
  const selectedDate = parseLocalDateTime(value);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const base = selectedDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [use24Hour, setUse24Hour] = useState(true);

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [value]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedDateKey = value ? value.slice(0, 10) : "";
  const selectedTime = value.includes("T") ? value.slice(11, 16) : "09:00";
  const [selectedHour24 = "09", selectedMinute = "00"] = selectedTime.split(":");
  const hour24Number = Number(selectedHour24);
  const hour12 = hour24Number % 12 === 0 ? 12 : hour24Number % 12;
  const meridiem = hour24Number >= 12 ? "PM" : "AM";

  function updateDate(isoDate: string) {
    onChange(`${isoDate}T${selectedTime}`);
  }

  function updateTime(time: string) {
    const datePart = selectedDateKey || toLocalDateTimeString(new Date()).slice(0, 10);
    onChange(`${datePart}T${time}`);
  }

  function update12Hour(nextHour12: string, nextMinute: string, nextMeridiem: string) {
    const hourNumber = Number(nextHour12) % 12;
    const converted = nextMeridiem === "PM" ? hourNumber + 12 : hourNumber;
    const hourValue = nextMeridiem === "AM" && nextHour12 === "12" ? 0 : converted;
    updateTime(`${pad(hourValue)}:${nextMinute}`);
  }

  function setShortcut(offsetDays: number) {
    const next = selectedDate ?? new Date();
    const shortcut = new Date(next.getFullYear(), next.getMonth(), next.getDate() + offsetDays, next.getHours(), next.getMinutes());
    onChange(toLocalDateTimeString(shortcut));
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {label}
            {required ? <span className="ml-1 text-rose-600">*</span> : null}
          </p>
          {description ? <p className="mt-1 text-xs text-soft">{description}</p> : null}
        </div>
        <div className="inline-flex rounded-full border border-[color:var(--border)] bg-white/80 p-1 text-xs font-semibold">
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 transition",
              !use24Hour ? "bg-blue-600 text-white" : "text-slate-600",
            )}
            onClick={() => setUse24Hour(false)}
          >
            12h
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 transition",
              use24Hour ? "bg-blue-600 text-white" : "text-slate-600",
            )}
            onClick={() => setUse24Hour(true)}
          >
            24h
          </button>
        </div>
      </div>

      <div className="rounded-[26px] border border-[color:var(--border)] bg-white/85 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-slate-50 px-2 py-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900"
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeft size={16} />
            </button>
            <p className="min-w-28 text-center text-sm font-semibold text-slate-900">
              {visibleMonth.toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900"
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              onClick={() => setShortcut(0)}
            >
              Today
            </button>
            <button
              type="button"
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              onClick={() => setShortcut(1)}
            >
              Tomorrow
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((day) => (
            <span key={day} className="px-1 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {day}
            </span>
          ))}
          {calendarDays.map((day) => {
            const isSelected = day.isoDate === selectedDateKey;
            return (
              <button
                key={day.key}
                type="button"
                className={cn(
                  "aspect-square rounded-2xl text-sm font-semibold transition",
                  day.isCurrentMonth ? "text-slate-800 hover:bg-blue-50" : "text-slate-300 hover:bg-slate-50",
                  isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-600" : "",
                )}
                onClick={() => updateDate(day.isoDate)}
              >
                {day.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50/90 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock3 size={16} className="text-blue-600" />
            Time
          </div>
          {use24Hour ? (
            <input
              type="time"
              step={300}
              value={selectedTime}
              onChange={(event) => updateTime(event.target.value)}
              className="h-12 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <select
                value={String(hour12)}
                onChange={(event) => update12Hour(event.target.value, selectedMinute, meridiem)}
                className="h-12 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500/35"
              >
                {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <select
                value={selectedMinute}
                onChange={(event) => update12Hour(String(hour12), event.target.value, meridiem)}
                className="h-12 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500/35"
              >
                {MINUTE_OPTIONS.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>
              <select
                value={meridiem}
                onChange={(event) => update12Hour(String(hour12), selectedMinute, event.target.value)}
                className="h-12 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500/35"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          )}

          <input
            type="datetime-local"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-12 rounded-2xl border border-dashed border-[color:var(--border)] bg-white/80 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500/35"
          />
        </div>
      </div>
    </div>
  );
}
