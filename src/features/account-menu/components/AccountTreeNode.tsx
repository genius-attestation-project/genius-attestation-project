"use client";

import React, { useState } from "react";
import type { AccountNode } from "../types/account-menu.types";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Settings,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface AccountTreeNodeProps {
  node: AccountNode;
  level?: number;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (nodeId: string) => void;
  onAddChild: (node: AccountNode) => void;
  onEditNode: (node: AccountNode) => void;
  onDeleteNode: (node: AccountNode) => void;
  onOpenSettings: (node: AccountNode) => void;
  onViewAudit: (node: AccountNode) => void;
  searchQuery?: string;
  userPermissions?: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canSettings: boolean;
  };
}

export const AccountTreeNode: React.FC<AccountTreeNodeProps> = ({
  node,
  level = 0,
  expandedMap,
  onToggleExpand,
  onAddChild,
  onEditNode,
  onDeleteNode,
  onOpenSettings,
  onViewAudit,
  searchQuery = "",
  userPermissions = {
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canSettings: true,
  },
}) => {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedMap[node.id] ?? (level < 1 || Boolean(searchQuery.trim()));
  const isRoot = !node.parentId;

  // Folder rule: contains children -> Folder; no children -> Leaf.
  const isLeafNode = !hasChildren;

  // Root colors & icon styling
  const isCredit = node.type === "CREDIT" || node.name === "CREDIT";
  const isDebit = node.type === "DEBIT" || node.name === "DEBIT";

  // Check search match
  const matchesSearch =
    searchQuery.trim().length > 0 &&
    node.name.toLowerCase().includes(searchQuery.toLowerCase().trim());

  return (
    <div className="select-none text-slate-800 dark:text-slate-100">
      {/* Node Row */}
      <div
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-150 ${
          matchesSearch
            ? "bg-amber-50/80 ring-1 ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-500/50"
            : "hover:bg-slate-100/80 dark:hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Left Section: Expand Toggle + Icon + Name + Badges */}
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
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
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
              )
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-amber-500" />
              ) : (
                <Folder className="h-4 w-4 text-amber-500" />
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
                  ? "text-base font-bold text-slate-900 dark:text-white"
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

            {/* Inactive Badge */}
            {!node.status && (
              <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                Inactive
              </span>
            )}

            {/* Child count badge for folders */}
            {hasChildren && (
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-400">
                {node.children?.length}
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* + Add Child Button */}
          {userPermissions.canCreate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node);
              }}
              title="Add Child Node"
              className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}

          {/* Edit Button */}
          {userPermissions.canUpdate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditNode(node);
              }}
              title="Edit Node"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-xs hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete Button */}
          {userPermissions.canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNode(node);
              }}
              title="Delete Node"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-xs hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* IMPORTANT RULE: Settings button MUST ONLY appear for non-root Leaf Nodes (!isRoot && isLeafNode === true) */}
          {!isRoot && isLeafNode && userPermissions.canSettings && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings(node);
              }}
              title="Configure Settings"
              className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 shadow-xs hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
            >
              <Settings className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Recursive Children Rendering */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Subtle vertical hierarchy line */}
          <div
            className="absolute bottom-2 top-0 border-l border-slate-200 dark:border-slate-800"
            style={{ left: `${level * 24 + 23}px` }}
          />
          {node.children?.map((childNode) => (
            <AccountTreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
              onAddChild={onAddChild}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
              onOpenSettings={onOpenSettings}
              onViewAudit={onViewAudit}
              searchQuery={searchQuery}
              userPermissions={userPermissions}
            />
          ))}
        </div>
      )}
    </div>
  );
};
