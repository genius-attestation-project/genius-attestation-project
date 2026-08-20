"use client";

import React from "react";
import type { AccountNode } from "@/features/account-menu/types/account-menu.types";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface AccountPanelTreeNodeProps {
  node: AccountNode;
  level?: number;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (nodeId: string) => void;
  searchQuery?: string;
}

export const AccountPanelTreeNode: React.FC<AccountPanelTreeNodeProps> = ({
  node,
  level = 0,
  expandedMap,
  onToggleExpand,
  searchQuery = "",
}) => {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedMap[node.id] ?? (level < 1 || Boolean(searchQuery.trim()));
  const isRoot = !node.parentId;

  // Root colors & icon styling
  const isCredit = node.type === "CREDIT" || node.name === "CREDIT";

  // Check search match
  const matchesSearch =
    searchQuery.trim().length > 0 &&
    node.name.toLowerCase().includes(searchQuery.toLowerCase().trim());

  return (
    <div className="select-none text-slate-800 dark:text-slate-100">
      {/* Node Row */}
      <div
        className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 transition-all duration-150 ${
          matchesSearch
            ? "bg-amber-50/80 ring-1 ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-500/50"
            : "hover:bg-slate-100/80 dark:hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${level * 24 + 14}px` }}
      >
        {/* Left Section: Expand Toggle + Icon + Name + Badges */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Chevron for items with children */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpand(node.id)}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}

          {/* Node Icon */}
          <div className="flex items-center justify-center">
            {isRoot ? (
              isCredit ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-xs">
                  <TrendingUp className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 shadow-xs">
                  <TrendingDown className="h-4 w-4" />
                </div>
              )
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <Folder className="h-4.5 w-4.5 text-amber-500" />
              )
            ) : (
              <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            )}
          </div>

          {/* Node Name & Metadata */}
          <div className="flex items-center gap-2.5 truncate">
            <span
              className={`truncate font-semibold tracking-tight ${
                isRoot
                  ? "text-base font-extrabold text-slate-900 dark:text-white"
                  : level === 1
                  ? "text-sm font-semibold text-slate-800 dark:text-slate-100"
                  : "text-sm font-medium text-slate-700 dark:text-slate-300"
              }`}
            >
              {node.name}
            </span>

            {/* Code Badge if present */}
            {node.code && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {node.code}
              </span>
            )}

            {/* Ledger Mapping Badge if present */}
            {node.ledgerMapping && (
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {node.ledgerMapping}
              </span>
            )}

            {/* Child count badge for folders */}
            {hasChildren && (
              <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-400">
                {node.children?.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recursive Children Rendering */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical hierarchy line */}
          <div
            className="absolute bottom-2 top-0 border-l border-slate-200/80 dark:border-slate-800"
            style={{ left: `${level * 24 + 25}px` }}
          />
          {node.children?.map((childNode) => (
            <AccountPanelTreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};
