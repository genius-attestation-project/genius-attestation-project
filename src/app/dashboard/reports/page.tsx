import React from "react";
import ReportsDashboard from "@/features/reports/components/ReportsDashboard";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { requirePermission } from "@/middleware/auth.middleware";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports & Analytics | Genius Attestation",
  description: "Centralized reporting and analytics dashboard",
};

export default async function ReportsPage() {
  const session = await requirePermission("reports.view", "/dashboard/reports");

  if (!session) {
    return <AccessDenied description="Your role cannot access Reports & Analytics." />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="flex-1 overflow-y-auto">
        <ReportsDashboard />
      </div>
    </div>
  );
}
