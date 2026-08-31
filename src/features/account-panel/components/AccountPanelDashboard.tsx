"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import type { AccountNode } from "@/features/account-menu/types/account-menu.types";
import { AccountPanelTreeNode } from "./AccountPanelTreeNode";
import { TransactionEntryModal } from "./TransactionEntryModal";
import { Search, FolderTree, RefreshCw, Maximize2, Minimize2, Building2 } from "lucide-react";

interface AvailableOffice {
  id: string;
  name: string;
  country: string;
}

export const AccountPanelDashboard: React.FC = () => {
  const [treeData, setTreeData] = useState<AccountNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [activeOffice, setActiveOffice] = useState<{ id: string; name: string } | null>(null);
  const [selectedLeafAccount, setSelectedLeafAccount] = useState<AccountNode | null>(null);

  const fetchAccountPanelData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account-panel");
      const json = await res.json();

      if (res.ok) {
        setTreeData(json.tree || []);
        setActiveOffice(json.activeOffice || null);
      }
    } catch (error) {
      console.error("Failed to fetch Account Panel tree:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountPanelData();
  }, [fetchAccountPanelData]);

  // Collect all node IDs for Expand / Collapse All
  const getAllNodeIds = useCallback((nodes: AccountNode[]): string[] => {
    let ids: string[] = [];
    nodes.forEach((n) => {
      ids.push(n.id);
      if (n.children && n.children.length > 0) {
        ids = ids.concat(getAllNodeIds(n.children));
      }
    });
    return ids;
  }, []);

  const handleExpandAll = () => {
    const allIds = getAllNodeIds(treeData);
    const newMap: Record<string, boolean> = {};
    allIds.forEach((id) => (newMap[id] = true));
    setExpandedMap(newMap);
  };

  const handleCollapseAll = () => {
    setExpandedMap({});
  };

  const handleToggleExpand = (nodeId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Handle clicking a leaf account (node with 0 children)
  const handleSelectLeafAccount = (node: AccountNode) => {
    setSelectedLeafAccount(node);
  };

  // Recursive search filter
  const filterTree = useCallback((nodes: AccountNode[], query: string): AccountNode[] => {
    if (!query.trim()) return nodes;
    const term = query.toLowerCase().trim();

    return nodes
      .map((node) => {
        const matchesCurrent = node.name.toLowerCase().includes(term);
        const filteredChildren = node.children ? filterTree(node.children, query) : [];

        if (matchesCurrent || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as AccountNode[];
  }, []);

  const displayTree = useMemo(() => {
    return filterTree(treeData, searchQuery);
  }, [treeData, searchQuery, filterTree]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <FolderTree className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Account Panel
                </h1>
                {activeOffice && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                    <Building2 className="h-3.5 w-3.5" />
                    {activeOffice.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Showing financial accounts assigned to your current office location. Click any leaf account to add a transaction.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Account Panel Tree Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        {/* Toolbar & Search Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Assigned Accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExpandAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expand All
            </button>

            <button
              type="button"
              onClick={handleCollapseAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Collapse All
            </button>

            <button
              type="button"
              onClick={() => fetchAccountPanelData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tree Display Body */}
        <div className="p-4 sm:p-6 min-h-87.5">
          {loading ? (
            <div className="space-y-3 py-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : displayTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderTree className="h-14 w-14 text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Assigned Accounts Available
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {searchQuery
                  ? `No account matches "${searchQuery}"`
                  : activeOffice
                  ? `No financial accounts have been assigned to "${activeOffice.name}" yet. Please contact an administrator to assign accounts in Account Menu.`
                  : "No office location assigned to your user account."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayTree.map((rootNode) => (
                <AccountPanelTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  level={0}
                  expandedMap={expandedMap}
                  onToggleExpand={handleToggleExpand}
                  searchQuery={searchQuery}
                  onSelectLeafAccount={handleSelectLeafAccount}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Entry Modal */}
      <TransactionEntryModal
        isOpen={Boolean(selectedLeafAccount)}
        account={selectedLeafAccount}
        activeOfficeName={activeOffice?.name}
        onClose={() => setSelectedLeafAccount(null)}
      />
    </div>
  );
};

