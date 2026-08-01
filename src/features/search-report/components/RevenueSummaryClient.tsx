"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDate } from "@/utils/format";
import { useState, useEffect, useCallback } from "react";
import { Download, Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { Input } from "@/components/ui/Input";
import {
  paymentStatusOptions,
  approvalStatusOptions,
} from "@/features/registration/validations/registration.schema";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

type RevenueData = {
  kpis: {
    totalRegistrations: number;
    totalRevenue: number;
    advancePaid: number;
    balancePending: number;
    approvedRevenue: number;
    pendingRevenue: number;
  };
  byOffice: Array<{
    office: string;
    revenue: number;
    registrations: number;
    advancePaid: number;
    balance: number;
  }>;
  byStaff: Array<{
    staff: string;
    revenue: number;
    registrations: number;
    advancePaid: number;
    balance: number;
  }>;
  byProcessType: Array<{
    process: string;
    revenue: number;
    registrations: number;
  }>;
  tableData: Array<{
    trackingNumber: string;
    customerName: string;
    processType: string;
    regionOfRegistration: string;
    createdBy: string;
    totalCharges: number;
    advancePaid: number;
    balanceAmount: number;
    approvalStatus: string;
    createdAt: string;
  }>;
  options: {
    offices: string[];
    staff: Array<{ id: string; name: string }>;
  };
};

export function RevenueSummaryClient() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processTypeOptions, setProcessTypeOptions] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    officeLocation: "",
    staffMember: "",
    processType: "",
    paymentStatus: "",
    approvalStatus: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.fromDate) query.append("fromDate", filters.fromDate);
      if (filters.toDate) query.append("toDate", filters.toDate);
      if (filters.officeLocation) query.append("officeLocation", filters.officeLocation);
      if (filters.staffMember) query.append("staffMember", filters.staffMember);
      if (filters.processType) query.append("processType", filters.processType);
      if (filters.paymentStatus) query.append("paymentStatus", filters.paymentStatus);
      if (filters.approvalStatus) query.append("approvalStatus", filters.approvalStatus);

      const res = await fetch(`/api/search-report/revenue-summary?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const result = await res.json();
      setData(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
    
    async function fetchProcessTypes() {
      try {
        const res = await fetch("/api/master-data/attestation-types?active=true");
        if (res.ok) {
          const data = await res.json();
          setProcessTypeOptions(data.items.map((i: any) => i.name));
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchProcessTypes();
  }, [fetchData]);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      "Tracking Number",
      "Customer Name",
      "Process Type",
      "Office Location",
      "Created By",
      "Total Charges",
      "Advance Paid",
      "Balance Amount",
      "Approval Status",
      "Created Date",
    ];
    const rows = data.tableData.map((row) => [
      row.trackingNumber,
      `"${row.customerName}"`,
      row.processType || "-",
      row.regionOfRegistration || "-",
      row.createdBy || "-",
      row.totalCharges,
      row.advancePaid,
      row.balanceAmount,
      row.approvalStatus,
      formatDate(row.createdAt),
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "revenue_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Revenue Summary"
        description="View and analyze overall team revenue and registration performance."
        actions={
          <Button onClick={handleExportCSV} disabled={!data || loading} variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <DashboardCard className="p-4 flex flex-wrap gap-4 items-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div>
            <Input
              label="From Date"
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            />
          </div>
          <div>
            <Input
              label="To Date"
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Office Location</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm text-slate-900 dark:text-white"
              value={filters.officeLocation}
              onChange={(e) => setFilters({ ...filters, officeLocation: e.target.value })}
            >
              <option value="">All Offices</option>
              {data?.options?.offices.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Staff Member</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm text-slate-900 dark:text-white"
              value={filters.staffMember}
              onChange={(e) => setFilters({ ...filters, staffMember: e.target.value })}
            >
              <option value="">All Staff</option>
              {data?.options?.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Process Type</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm text-slate-900 dark:text-white"
              value={filters.processType}
              onChange={(e) => setFilters({ ...filters, processType: e.target.value })}
            >
              <option value="">All Processes</option>
              {processTypeOptions.map((p: string) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Approval Status</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm text-slate-900 dark:text-white"
              value={filters.approvalStatus}
              onChange={(e) => setFilters({ ...filters, approvalStatus: e.target.value })}
            >
              <option value="">All Statuses</option>
              {approvalStatusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </DashboardCard>

      {loading ? (
        <div className="flex justify-center p-8">Loading...</div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard
              label="Total Registrations"
              value={data.kpis.totalRegistrations.toString()}
              delta=""
              description="Total number of registrations"
              icon={Filter}
              tone="blue"
            />
            <StatsCard
              label="Total Revenue"
              value={`₹${data.kpis.totalRevenue.toLocaleString()}`}
              delta=""
              description="Overall revenue collected"
              icon={Filter}
              tone="amber"
            />
            <StatsCard
              label="Advance Paid"
              value={`₹${data.kpis.advancePaid.toLocaleString()}`}
              delta=""
              description="Total advance collected"
              icon={Filter}
              tone="blue"
            />
            <StatsCard
              label="Balance Pending"
              value={`₹${data.kpis.balancePending.toLocaleString()}`}
              delta=""
              description="Pending balance to be collected"
              icon={Filter}
              tone="slate"
            />
            <StatsCard
              label="Approved Revenue"
              value={`₹${data.kpis.approvedRevenue.toLocaleString()}`}
              delta=""
              description="Revenue from approved applications"
              icon={Filter}
              tone="blue"
            />
            <StatsCard
              label="Pending Revenue"
              value={`₹${data.kpis.pendingRevenue.toLocaleString()}`}
              delta=""
              description="Revenue pending approval"
              icon={Filter}
              tone="amber"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCard title="Revenue by Office Location" className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byOffice}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="office" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Total Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="advancePaid" fill="#10b981" name="Advance Paid" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>

            <DashboardCard title="Revenue by Process Type" className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byProcessType}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                      nameKey="process"
                      label
                    >
                      {data.byProcessType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCard title="Office Location Report" className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                    <tr>
                      <th className="px-4 py-3">Office</th>
                      <th className="px-4 py-3">Registrations</th>
                      <th className="px-4 py-3">Revenue</th>
                      <th className="px-4 py-3">Advance</th>
                      <th className="px-4 py-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byOffice.map((o) => (
                      <tr key={o.office} className="border-b dark:border-slate-800">
                        <td className="px-4 py-3 font-medium">{o.office}</td>
                        <td className="px-4 py-3">{o.registrations}</td>
                        <td className="px-4 py-3">₹{o.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3">₹{o.advancePaid.toLocaleString()}</td>
                        <td className="px-4 py-3">₹{o.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            <DashboardCard title="Staff Performance Ranking" className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Registrations</th>
                      <th className="px-4 py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.byStaff]
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((s, index) => (
                        <tr key={s.staff} className="border-b dark:border-slate-800">
                          <td className="px-4 py-3 font-medium">#{index + 1}</td>
                          <td className="px-4 py-3 font-medium">{s.staff}</td>
                          <td className="px-4 py-3">{s.registrations}</td>
                          <td className="px-4 py-3">₹{s.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>

          <DashboardCard title="Recent Registrations" className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                  <tr>
                    <th className="px-4 py-3">Tracking No.</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Process Type</th>
                    <th className="px-4 py-3">Office</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Total Charges</th>
                    <th className="px-4 py-3">Advance Paid</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tableData.map((row) => (
                    <tr key={row.trackingNumber} className="border-b dark:border-slate-800">
                      <td className="px-4 py-3 font-medium">{row.trackingNumber}</td>
                      <td className="px-4 py-3">{row.customerName}</td>
                      <td className="px-4 py-3">{row.processType || "-"}</td>
                      <td className="px-4 py-3">{row.regionOfRegistration || "-"}</td>
                      <td className="px-4 py-3">{row.createdBy || "-"}</td>
                      <td className="px-4 py-3">₹{row.totalCharges.toLocaleString()}</td>
                      <td className="px-4 py-3">₹{row.advancePaid.toLocaleString()}</td>
                      <td className="px-4 py-3">₹{row.balanceAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            row.approvalStatus === "Approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
                              : row.approvalStatus === "Rejected"
                                ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                          }`}
                        >
                          {row.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </>
      ) : null}
    </div>
  );
}
