import React from "react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { AccountTreeContainer } from "@/features/account-menu/components/AccountTreeContainer";
import { requirePermission } from "@/middleware/auth.middleware";
import { FolderTree } from "lucide-react";

export default async function AccountMenuMasterPage() {
  const session = await requirePermission("account_menu.view", "/dashboard/master-configuration/account-menu");

  if (!session) {
    return <AccessDenied description="Your role cannot access Account Menu Master Configuration." />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0c0e] py-6">
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

      <AccountTreeContainer />
    </div>
  );
}
