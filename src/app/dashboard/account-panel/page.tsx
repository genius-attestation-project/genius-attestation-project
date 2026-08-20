"use client";

import React from "react";
import { AccountPanelDashboard } from "@/features/account-panel/components/AccountPanelDashboard";

export default function AccountPanelPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0c0e] py-6">
      <AccountPanelDashboard />
    </div>
  );
}
