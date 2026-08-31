"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/utils/format";
import * as xlsx from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, Search, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { Input } from "@/components/ui/Input";

type ReportItem = {
  id: string;
  leadName: string;
  customerName: string;
  mobile: string;
  followupDate: string;
  followupTime: string;
  leadStatus: string;
  assignedUser: string;
  officeLocation: string;
  createdBy: string;
};

export function FollowupsReportManagement() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [leadOwner, setLeadOwner] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [officeLocationId, setOfficeLocationId] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");

  const [filterOptions, setFilterOptions] = useState<any>(null);

  useEffect(() => {
    fetch("/api/leads/filters")
      .then((res) => res.json())
      .then((data) => {
        if (data.payload) setFilterOptions(data.payload);
        else setFilterOptions(data);
      })
      .catch(console.error);
    
    // Initial fetch
    void fetchReport();
  }, []);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch("/api/followups/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          leadOwner,
          assignedUser,
          officeLocationId,
          leadStatus,
          country,
          state,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function setDateRange(type: string) {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (type === "today") {
      start = today;
      end = today;
    } else if (type === "week") {
      const first = today.getDate() - today.getDay();
      start = new Date(today.setDate(first));
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (type === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    setFromDate(start.toISOString().split("T")[0]);
    setToDate(end.toISOString().split("T")[0]);
  }

  function getExportData() {
    return items.map((item) => ({
      "Lead Name": item.leadName,
      "Customer Name": item.customerName,
      "Mobile": item.mobile,
      "Followup Date": item.followupDate ? formatDate(item.followupDate) : "",
      "Followup Time": item.followupTime ? new Date(item.followupTime).toLocaleTimeString() : "",
      "Lead Status": item.leadStatus,
      "Assigned User": item.assignedUser,
      "Office Location": item.officeLocation,
      "Created By": item.createdBy,
    }));
  }

  function exportExcel() {
    const data = getExportData();
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Followups");
    xlsx.writeFile(wb, "followups_report.xlsx");
  }

  function exportCSV() {
    const data = getExportData();
    const ws = xlsx.utils.json_to_sheet(data);
    const csv = xlsx.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "followups_report.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportPDF() {
    const doc = new jsPDF("landscape");
    const tableColumn = [
      "Lead Name",
      "Mobile",
      "Followup Date",
      "Time",
      "Status",
      "Assigned To",
      "Office",
      "Created By"
    ];
    const tableRows = items.map((item) => [
      item.leadName,
      item.mobile,
      item.followupDate ? formatDate(item.followupDate) : "",
      item.followupTime ? new Date(item.followupTime).toLocaleTimeString() : "",
      item.leadStatus,
      item.assignedUser,
      item.officeLocation,
      item.createdBy,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.text("Followups Report", 14, 15);
    doc.save("followups_report.pdf");
  }

  return (
    <div className="grid gap-6">
      <DashboardCard title="Advanced Filter">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Lead Owner (Creator)</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={leadOwner}
              onChange={(e) => setLeadOwner(e.target.value)}
            >
              <option value="">All</option>
              {filterOptions?.createdBy?.map((o: any) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Assigned User</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
            >
              <option value="">All</option>
              {filterOptions?.assignedTo?.map((o: any) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Office Location</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={officeLocationId}
              onChange={(e) => setOfficeLocationId(e.target.value)}
            >
              <option value="">All</option>
              {filterOptions?.officeLocations?.map((o: any) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Lead Status</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={leadStatus}
              onChange={(e) => setLeadStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="New">New</option>
              <option value="Followup">Followup</option>
              <option value="Assigned">Assigned</option>
              <option value="Potential_Qualified">Potential Qualified</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Country</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">All</option>
              {filterOptions?.countries?.map((o: any) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">State</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">All</option>
              {filterOptions?.states?.map((o: any) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDateRange("today")}>Today</Button>
            <Button variant="secondary" size="sm" onClick={() => setDateRange("week")}>This Week</Button>
            <Button variant="secondary" size="sm" onClick={() => setDateRange("month")}>This Month</Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void fetchReport()} disabled={loading}>
              <Search size={16} className="mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title={`Followup Results (${items.length})`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCSV} disabled={!items.length}>
              <FileText size={16} className="mr-2" />
              CSV
            </Button>
            <Button variant="secondary" onClick={exportExcel} disabled={!items.length}>
              <FileSpreadsheet size={16} className="mr-2" />
              Excel
            </Button>
            <Button variant="secondary" onClick={exportPDF} disabled={!items.length}>
              <FileDown size={16} className="mr-2" />
              PDF
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b bg-slate-50 text-slate-900">
              <tr>
                <th className="px-4 py-3 font-semibold">Lead Name</th>
                <th className="px-4 py-3 font-semibold">Mobile</th>
                <th className="px-4 py-3 font-semibold">Followup Date</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Assigned To</th>
                <th className="px-4 py-3 font-semibold">Office</th>
                <th className="px-4 py-3 font-semibold">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.leadName}</td>
                  <td className="px-4 py-3">{item.mobile}</td>
                  <td className="px-4 py-3">
                    {item.followupDate ? formatDate(item.followupDate) : ""}
                  </td>
                  <td className="px-4 py-3">
                    {item.followupTime ? new Date(item.followupTime).toLocaleTimeString() : ""}
                  </td>
                  <td className="px-4 py-3">{item.leadStatus}</td>
                  <td className="px-4 py-3">{item.assignedUser}</td>
                  <td className="px-4 py-3">{item.officeLocation}</td>
                  <td className="px-4 py-3">{item.createdBy}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No followups found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
