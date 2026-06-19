"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { AttendanceStats } from "@/features/attendance/types/attendance.types";

type Props = {
  isSuperAdmin: boolean;
};

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#f97316", "#22c55e"];

export function AttendanceDashboard({ isSuperAdmin }: Props) {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        {
          label: "Present Today",
          value: stats.presentToday,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
          ),
        },
        {
          label: "Absent Today",
          value: stats.absentToday,
          color: "text-rose-600 dark:text-rose-400",
          bg: "bg-rose-50 dark:bg-rose-500/10",
          icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ),
        },
        {
          label: "Late Today",
          value: stats.lateToday,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-500/10",
          icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          ),
        },
        {
          label: "Pending Approval",
          value: stats.pendingApproval,
          color: "text-orange-600 dark:text-orange-400",
          bg: "bg-orange-50 dark:bg-orange-500/10",
          icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          ),
        },
        {
          label: "Approved Today",
          value: stats.approvedToday,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-500/10",
          icon: (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          ),
        },
      ]
    : [];

  const pieData = stats
    ? [
        { name: "Present", value: stats.presentToday },
        { name: "Late", value: stats.lateToday },
        { name: "Absent", value: stats.absentToday },
      ].filter((d) => d.value > 0)
    : [];

  const barData = stats
    ? [
        { name: "Present", count: stats.presentToday },
        { name: "Late", count: stats.lateToday },
        { name: "Absent", count: stats.absentToday },
        { name: "Pending", count: stats.pendingApproval },
        { name: "Approved", count: stats.approvedToday },
      ]
    : [];

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/8 dark:bg-white/5"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className={`text-3xl font-extrabold ${card.color}`}>{card.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-white/45">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar chart */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-white/8 dark:bg-white/5">
          <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-white">
            Today&apos;s Attendance Overview
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(148,163,184,0.2)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-white/8 dark:bg-white/5">
          <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-white">
            Attendance Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-slate-400 dark:text-white/30">No attendance data for today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
