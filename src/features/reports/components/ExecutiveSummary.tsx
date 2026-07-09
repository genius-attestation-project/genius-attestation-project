"use client";

import React, { useEffect, useState } from "react";
import { useReportFilters } from "../context/ReportFilterContext";
import { StatsCard } from "@/components/ui/StatsCard";
import { ExecutiveSummaryMetrics } from "../types/report.types";
import { 
  Users, 
  IndianRupee, 
  PhoneCall, 
  CalendarCheck, 
  Clock, 
  FileText,
  Activity,
  CheckCircle,
  Truck,
  ShieldCheck,
  Download
} from "lucide-react";
import { Loader } from "@/components/ui/Loader";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ExecutiveSummary() {
  const { filters } = useReportFilters();
  const [data, setData] = useState<ExecutiveSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, String(value));
        });
        
        const res = await fetch(`/api/reports/executive-summary?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [filters]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-500 py-10">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Workflow Approvals */}
      <section>
        <div className="flex justify-between items-end border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Pending Workflow Approvals</h2>
          <button 
            type="button"
            className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
            onClick={() => window.open('/api/reports/workflow-approvals/export', '_blank')}
          >
            <Download size={16} />
            Export Approvals (CSV)
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Inactive Leads"
            value={data.inactiveLeads?.toString() || "0"}
            delta="Pending"
            description="Leads inactive for 10+ days"
            icon={ShieldCheck}
            tone="amber"
          />
          <StatsCard
            label="LOB Requests"
            value={data.lobRequests?.toString() || "0"}
            delta="Pending"
            description="Loss of Business requests"
            icon={ShieldCheck}
            tone="slate"
          />
          <StatsCard
            label="Overdue Follow-ups"
            value={data.overdueFollowups?.toString() || "0"}
            delta="Pending"
            description="Follow-ups passed deadline"
            icon={ShieldCheck}
            tone="amber"
          />
        </div>
      </section>

      {/* Overview Section */}
      <section>
        <div className="flex justify-between items-end border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Overview</h2>
          <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Reporting User: <span className="font-semibold text-slate-800">{data.userName || "All Users"}</span>
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="Leads Created"
            value={data.leadsCreated.toString()}
            delta="+0%"
            description="Total new leads"
            icon={Users}
            tone="blue"
          />
          <StatsCard
            label="Revenue Registrations"
            value={data.revenueRegistrations.toString()}
            delta="+0%"
            description="Total registrations"
            icon={FileText}
            tone="blue"
          />
          <StatsCard
            label="Revenue Generated"
            value={`₹${data.revenueGenerated.toLocaleString()}`}
            delta="+0%"
            description="Total charges"
            icon={IndianRupee}
            tone="slate"
          />
          <StatsCard
            label="Pending Revenue"
            value={`₹${data.pendingRevenue.toLocaleString()}`}
            delta="+0%"
            description="Total balance amount"
            icon={IndianRupee}
            tone="amber"
          />
        </div>
      </section>

      {/* Followups & Calls */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Communications</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Followups Created"
            value={data.followupsCreated.toString()}
            delta="+0%"
            description="New followups scheduled"
            icon={PhoneCall}
            tone="blue"
          />
          <StatsCard
            label="Followups Completed"
            value={data.followupsCompleted.toString()}
            delta="+0%"
            description="Followups done"
            icon={CheckCircle}
            tone="slate"
          />
          <StatsCard
            label="Calls Made"
            value={data.callsMade.toString()}
            delta="+0%"
            description="Total calls logged"
            icon={PhoneCall}
            tone="amber"
          />
        </div>
      </section>

      {/* Operations */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Process Actions"
            value={data.processActions.toString()}
            delta="+0%"
            description="Total process assignments"
            icon={Activity}
            tone="blue"
          />
          <StatsCard
            label="BM Movements"
            value={data.bmMovements.toString()}
            delta="+0%"
            description="Document transfers"
            icon={Truck}
            tone="slate"
          />
          <StatsCard
            label="Documents Delivered"
            value={data.documentsDelivered.toString()}
            delta="+0%"
            description="Successfully delivered"
            icon={CheckCircle}
            tone="slate"
          />
        </div>
      </section>

      {/* Attendance */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Attendance & Staff</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Present Days"
            value={data.presentDays.toString()}
            delta="+0%"
            description="Total staff present"
            icon={CalendarCheck}
            tone="blue"
          />
          <StatsCard
            label="Working Hours"
            value={`${data.totalWorkingHours}h`}
            delta="+0%"
            description="Total hours logged"
            icon={Clock}
            tone="slate"
          />
          <StatsCard
            label="Daily Summaries"
            value={data.dailySummariesSubmitted.toString()}
            delta="+0%"
            description="Summaries submitted"
            icon={FileText}
            tone="slate"
          />
        </div>
      </section>

      {/* Analytics Charts */}
      <section className="print:break-before-page">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-md font-medium text-slate-700 mb-6">Revenue Trend (Last 7 Days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.revenueTrend}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-md font-medium text-slate-700 mb-6">Lead Source Analysis</h3>
            <div className="h-64 flex items-center justify-center">
              {data.charts.leadSources.length === 0 ? (
                <div className="text-slate-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.leadSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.charts.leadSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Custom Legend */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {data.charts.leadSources.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
