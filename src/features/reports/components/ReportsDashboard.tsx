"use client";

import React, { useState } from "react";
import { ReportFilterProvider } from "../context/ReportFilterContext";
import GlobalFilterBar from "./GlobalFilterBar";
import ExecutiveSummary from "./ExecutiveSummary";
import DetailedReports from "./DetailedReports";
import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";

export default function ReportsDashboard() {
  const [viewMode, setViewMode] = useState<"executive" | "detailed">("executive");

  const handlePrint = () => {
    window.print();
  };

  return (
    <ReportFilterProvider>
      <div className="space-y-6">
        <div className="flex justify-end items-center print:hidden">
          <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </Button>
        </div>

        <div className="print:hidden">
          <GlobalFilterBar />
        </div>

        {/* View Toggles */}
        <div className="flex gap-4 border-b border-slate-200 pb-2 print:hidden">
          <button
            onClick={() => setViewMode("executive")}
            className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === "executive"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Executive Summary
          </button>
          <button
            onClick={() => setViewMode("detailed")}
            className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === "detailed"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Detailed Reports
          </button>
        </div>

        {/* Report Content */}
        <div className="print:block" id="report-content-area">
          {viewMode === "executive" ? (
            <ExecutiveSummary />
          ) : (
            <DetailedReports />
          )}
        </div>
      </div>
    </ReportFilterProvider>
  );
}
