"use client";

import React from "react";
import { AccountStatementsPage } from "@/features/account-statements/components/AccountStatementsPage";

export default function DashboardAccountStatementsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0c0e] py-6">
      <AccountStatementsPage />
    </div>
  );
}
