"use client";

import React from "react";
import { AccountTreeContainer } from "@/features/account-menu/components/AccountTreeContainer";
import { FolderTree } from "lucide-react";

export default function AccountMenuMasterPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0c0e] py-6">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <span>Master Configuration</span>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400">Account Menu</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <FolderTree className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Account Menu
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage multi-level hierarchical accounting categories, folder trees, and leaf node ledger settings.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tree Container */}
      <AccountTreeContainer />
    </div>
  );
}
