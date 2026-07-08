import React from "react";
import ReportsDashboard from "@/features/reports/components/ReportsDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports & Analytics | Genius Attestation",
  description: "Centralized reporting and analytics dashboard",
};

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="flex-1 overflow-y-auto">
        <ReportsDashboard />
      </div>
    </div>
  );
}
