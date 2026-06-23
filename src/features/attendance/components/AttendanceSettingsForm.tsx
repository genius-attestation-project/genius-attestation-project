"use client";

import { useEffect, useState } from "react";
import type { AttendanceSetting } from "@/features/attendance/types/attendance.types";
import { readJsonResponse } from "@/utils/fetch";

type UserOption = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  users: UserOption[];
};

export function AttendanceSettingsForm({ users }: Props) {
  const [settings, setSettings] = useState<AttendanceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [checkinTime, setCheckinTime] = useState("09:00");
  const [checkoutTime, setCheckoutTime] = useState("18:00");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("/api/attendance/settings")
      .then(async (response) => {
        const payload = await readJsonResponse<{ settings?: AttendanceSetting[]; message?: string }>(response);
        if (!response.ok) throw new Error(payload.message ?? "Unable to load attendance settings.");
        setSettings(payload.settings ?? []);
      })
      .catch((error) => {
        console.error("Failed to load attendance settings", error);
      })
      .finally(() => setLoading(false));
  }, []);

  // Prefill form when existing setting is selected
  useEffect(() => {
    if (!selectedUserId) return;
    const existing = settings.find((s) => s.userId === selectedUserId);
    if (existing) {
      setCheckinTime(existing.expectedCheckinTime);
      setCheckoutTime(existing.expectedCheckoutTime);
    } else {
      setCheckinTime("09:00");
      setCheckoutTime("18:00");
    }
  }, [selectedUserId, settings]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    setFormError("");
    if (!selectedUserId) {
      setFormError("Please select a user.");
      return;
    }
    if (!checkinTime || !checkoutTime) {
      setFormError("Both check-in and check-out times are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          expectedCheckinTime: checkinTime,
          expectedCheckoutTime: checkoutTime,
        }),
      });
      const data = await readJsonResponse<{ setting?: AttendanceSetting; message?: string }>(res);
      if (!res.ok) {
        showToast("error", data.message ?? "Save failed.");
        return;
      }
      setSettings((prev) => {
        const existing = prev.findIndex((s) => s.userId === selectedUserId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data.setting;
          return updated;
        }
        return [...prev, data.setting];
      });
      showToast("success", "Attendance timing saved successfully.");
    } catch (error) {
      console.error("Failed to save attendance settings", error);
      showToast("error", error instanceof Error ? error.message : "Network error.");
    } finally {
      setSaving(false);
    }
  }

  const selectedUserName = users.find((u) => u.id === selectedUserId)?.name ?? "";

  return (
    <div className="grid gap-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Configuration form */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-white/8 dark:bg-white/5">
        <h3 className="mb-1 text-base font-bold text-slate-800 dark:text-white">
          Configure User Timing
        </h3>
        <p className="mb-6 text-sm text-slate-500 dark:text-white/45">
          Set expected check-in and check-out times per user. The system will automatically mark late arrivals.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* User selector */}
          <div className="grid gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Select User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="">— Select a user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Check-In time */}
          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Expected Check-In Time
            </label>
            <input
              type="time"
              value={checkinTime}
              onChange={(e) => setCheckinTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {/* Check-Out time */}
          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Expected Check-Out Time
            </label>
            <input
              type="time"
              value={checkoutTime}
              onChange={(e) => setCheckoutTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        {selectedUserId && (
          <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Preview: <span className="font-bold">{selectedUserName}</span> → Check-In{" "}
              <span className="font-bold">{formatTime12(checkinTime)}</span> · Check-Out{" "}
              <span className="font-bold">{formatTime12(checkoutTime)}</span>
            </p>
          </div>
        )}

        {formError && (
          <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {formError}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Timing"}
          </button>
        </div>
      </div>

      {/* Configured users list */}
      <div className="rounded-2xl border border-slate-100 bg-white dark:border-white/8 dark:bg-white/5 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-white/8">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Configured Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-50 dark:border-white/5">
                {["User", "Expected Check-In", "Expected Check-Out"].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-white/45"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-white/30">
                    No attendance timings configured yet.
                  </td>
                </tr>
              ) : (
                settings.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/3"
                    onClick={() => setSelectedUserId(s.userId)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800 dark:text-white">{s.userName}</p>
                      <p className="text-xs text-slate-400 dark:text-white/40">{s.userEmail}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatTime12(s.expectedCheckinTime)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-orange-600 dark:text-orange-300">
                      {formatTime12(s.expectedCheckoutTime)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}
