"use client";

import React, { useState, useEffect } from "react";
import { useReportFilters } from "../context/ReportFilterContext";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ReportType = "leads" | "registrations" | "followups" | "attendance" | "process" | "bm-movements" | "delivery" | "welcome-calls";

export default function DetailedReports() {
  const { filters } = useReportFilters();
  const [activeTab, setActiveTab] = useState<ReportType>("leads");
  
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetailedReport = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.dateRange) queryParams.append("dateRange", filters.dateRange);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      if (filters.officeLocationId) queryParams.append("officeLocationId", filters.officeLocationId);
      if (filters.departmentId) queryParams.append("departmentId", filters.departmentId);
      if (filters.assignedUser) queryParams.append("assignedUser", filters.assignedUser);
      if (filters.leadStatus) queryParams.append("leadStatus", filters.leadStatus);
      if (filters.paymentStatus) queryParams.append("paymentStatus", filters.paymentStatus);
      
      queryParams.append("page", page.toString());
      queryParams.append("limit", pagination.limit.toString());
      
      const res = await fetch(`/api/reports/detailed/${activeTab}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch detailed data");
      
      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when tab or filters change
  useEffect(() => {
    fetchDetailedReport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchDetailedReport(newPage);
    }
  };

  const getColumns = () => {
    if (activeTab === "leads") {
      return [
        { key: "leadCode", label: "Lead ID" },
        { key: "firstName", label: "Name", render: (row: any) => `${row.firstName} ${row.lastName || ''}` },
        { key: "email", label: "Email" },
        { key: "mobileNumber", label: "Phone" },
        { key: "service", label: "Service" },
        { key: "leadStatus", label: "Status" },
        { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleDateString() }
      ];
    } else if (activeTab === "registrations") {
      return [
        { key: "trackingNumber", label: "Tracking No." },
        { key: "customerName", label: "Customer" },
        { key: "service", label: "Service", render: (row: any) => row.processType || "-" },
        { key: "totalCharges", label: "Total (₹)", render: (row: any) => `₹${row.totalCharges}` },
        { key: "balanceAmount", label: "Balance (₹)", render: (row: any) => `₹${row.balanceAmount}` },
        { key: "paymentStatus", label: "Payment Status" },
        { key: "trackingStatus", label: "Process Status" },
        { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleDateString() }
      ];
    } else if (activeTab === "followups") {
      return [
        { key: "lead", label: "Lead", render: (row: any) => `${row.lead?.firstName || ''} ${row.lead?.lastName || ''} (${row.lead?.leadCode || ''})` },
        { key: "actionType", label: "Action" },
        { key: "description", label: "Remarks", render: (row: any) => row.description || "-" },
        { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleDateString() }
      ];
    } else if (activeTab === "attendance") {
      return [
        { key: "user", label: "Employee", render: (row: any) => row.user?.name || "-" },
        { key: "attendanceDate", label: "Date", render: (row: any) => new Date(row.attendanceDate).toLocaleDateString() },
        { key: "checkinTime", label: "Check-in", render: (row: any) => row.checkinTime ? new Date(row.checkinTime).toLocaleTimeString() : "-" },
        { key: "checkoutTime", label: "Check-out", render: (row: any) => row.checkoutTime ? new Date(row.checkoutTime).toLocaleTimeString() : "-" },
        { key: "workingHours", label: "Hours", render: (row: any) => `${row.workingHours || 0}h` },
        { key: "status", label: "Status" }
      ];
    } else if (activeTab === "process") {
      return [
        { key: "trackingNumber", label: "Tracking No." },
        { key: "processType", label: "Process" },
        { key: "currentLocation", label: "Location" },
        { key: "status", label: "Status" },
        { key: "daysHeld", label: "Days Held" },
        { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleDateString() }
      ];
    } else if (activeTab === "bm-movements") {
      return [
        { key: "trackingNumber", label: "Tracking No." },
        { key: "fromOffice", label: "From", render: (row: any) => row.fromOffice?.officeName || "-" },
        { key: "toOffice", label: "To", render: (row: any) => row.toOffice?.officeName || "-" },
        { key: "status", label: "Status" },
        { key: "currentOffice", label: "Current Location", render: (row: any) => row.currentOffice?.officeName || "-" },
        { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleDateString() }
      ];
    } else if (activeTab === "delivery") {
      return [
        { key: "trackingNumber", label: "Tracking No." },
        { key: "customerName", label: "Customer" },
        { key: "trackingStatus", label: "Status" },
        { key: "updatedAt", label: "Delivery Date", render: (row: any) => new Date(row.updatedAt).toLocaleDateString() }
      ];
    } else if (activeTab === "welcome-calls") {
      return [
        { key: "trackingNumber", label: "Tracking No." },
        { key: "customerName", label: "Customer" },
        { key: "welcomeCallStatus", label: "Outcome" },
        { key: "welcomeCalledBy", label: "Called By", render: (row: any) => row.welcomeCalledBy || "-" },
        { key: "welcomeCalledAt", label: "Call Date", render: (row: any) => row.welcomeCalledAt ? new Date(row.welcomeCalledAt).toLocaleDateString() : "-" }
      ];
    }
    return [];
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Genius Attestation - ${activeTab.toUpperCase()} Report`, 14, 15);
    
    const cols = getColumns();
    const head = [cols.map(c => c.label)];
    
    // Quick stringification for export
    const body = data.map(row => {
      return cols.map(c => {
        if (c.render) {
          // Render functions might return React nodes, but for PDF we need strings
          // We will extract text values or default to basic field values
          const val = c.render(row);
          return typeof val === 'string' ? val : String(row[c.key as keyof typeof row] || "-");
        }
        return String(row[c.key as keyof typeof row] || "-");
      });
    });

    autoTable(doc, {
      head: head,
      body: body,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Genius_${activeTab}_Report.pdf`);
  };

  const handleExportExcel = () => {
    const cols = getColumns();
    const exportData = data.map(row => {
      const obj: any = {};
      cols.forEach(c => {
        if (c.render) {
          const val = c.render(row);
          obj[c.label] = typeof val === 'string' ? val : String(row[c.key as keyof typeof row] || "-");
        } else {
          obj[c.label] = row[c.key as keyof typeof row] || "-";
        }
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `Genius_${activeTab}_Report.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex gap-2 pb-2 overflow-x-auto print:hidden">
        <Button 
          variant={activeTab === "leads" ? "primary" : "outline"} 
          onClick={() => setActiveTab("leads")}
          className="text-sm rounded-full"
        >
          Leads Report
        </Button>
        <Button 
          variant={activeTab === "registrations" ? "primary" : "outline"} 
          onClick={() => setActiveTab("registrations")}
          className="text-sm rounded-full"
        >
          Revenue Registrations
        </Button>
        <Button 
          variant={activeTab === "followups" ? "primary" : "outline"} 
          onClick={() => setActiveTab("followups")}
          className="text-sm rounded-full"
        >
          Followups
        </Button>
        <Button 
          variant={activeTab === "attendance" ? "primary" : "outline"} 
          onClick={() => setActiveTab("attendance")}
          className="text-sm rounded-full"
        >
          Attendance
        </Button>
        <Button 
          variant={activeTab === "process" ? "primary" : "outline"} 
          onClick={() => setActiveTab("process")}
          className="text-sm rounded-full"
        >
          Process Module
        </Button>
        <Button 
          variant={activeTab === "bm-movements" ? "primary" : "outline"} 
          onClick={() => setActiveTab("bm-movements")}
          className="text-sm rounded-full"
        >
          BM Movements
        </Button>
        <Button 
          variant={activeTab === "delivery" ? "primary" : "outline"} 
          onClick={() => setActiveTab("delivery")}
          className="text-sm rounded-full"
        >
          Ready For Delivery
        </Button>
        <Button 
          variant={activeTab === "welcome-calls" ? "primary" : "outline"} 
          onClick={() => setActiveTab("welcome-calls")}
          className="text-sm rounded-full"
        >
          Welcome Calls
        </Button>
      </div>

      <div className="flex justify-end gap-2 print:hidden mb-2">
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader /></div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 capitalize mb-4 hidden print:block">
              {activeTab} Report
            </h3>
            
            {data.length === 0 ? (
              <div className="py-10 text-center text-slate-500">No records found.</div>
            ) : (
              <>
                <DataTable 
                  columns={getColumns()} 
                  rows={data} 
                  keyField="id" 
                />
                
                {/* Pagination Controls */}
                <div className="flex justify-between items-center pt-4 print:hidden">
                  <div className="text-sm text-slate-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm font-medium">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
