"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import type { AccountNode } from "../types/account-menu.types";
import { AccountTreeNode } from "./AccountTreeNode";
import { AccountNodeFormModal } from "./AccountNodeFormModal";
import { AccountNodeSettingsModal } from "./AccountNodeSettingsModal";
import { AccountNodeAuditModal } from "./AccountNodeAuditModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Search,
  FolderTree,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from "lucide-react";

export const AccountTreeContainer: React.FC = () => {
  const [treeData, setTreeData] = useState<AccountNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedParentNode, setSelectedParentNode] = useState<AccountNode | null>(null);
  const [editingNode, setEditingNode] = useState<AccountNode | null>(null);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsNode, setSettingsNode] = useState<AccountNode | null>(null);

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditNode, setAuditNode] = useState<AccountNode | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<AccountNode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account-menu");
      const json = await res.json();
      if (res.ok) {
        setTreeData(json.tree || []);
      }
    } catch (error) {
      console.error("Failed to fetch account menu tree:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Recursively collect all node IDs for Expand / Collapse All
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

  // Node actions
  const handleAddChild = (parentNode: AccountNode) => {
    setSelectedParentNode(parentNode);
    setEditingNode(null);
    setFormModalOpen(true);
  };

  const handleEditNode = (node: AccountNode) => {
    setSelectedParentNode(null);
    setEditingNode(node);
    setFormModalOpen(true);
  };

  const handleDeleteNode = (node: AccountNode) => {
    setNodeToDelete(node);
    setDeleteError("");
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!nodeToDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/account-menu/${nodeToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.message || "Failed to delete account node.");
        return;
      }
      setDeleteConfirmOpen(false);
      setNodeToDelete(null);
      fetchTree();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || "An error occurred.");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenSettings = (node: AccountNode) => {
    setSettingsNode(node);
    setSettingsModalOpen(true);
  };

  const handleViewAudit = (node: AccountNode) => {
    setAuditNode(node);
    setAuditModalOpen(true);
  };

  // Fuzzy recursive search filter
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
      {/* Main Account Tree Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        {/* Toolbar & Search Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Account Menu..."
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
              onClick={fetchTree}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tree Display Body */}
        <div className="p-4 sm:p-6 min-h-100">
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderTree className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Account Nodes Found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {searchQuery ? `No account matches "${searchQuery}"` : "Get started by adding categories."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {displayTree.map((rootNode) => (
                <AccountTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  level={0}
                  expandedMap={expandedMap}
                  onToggleExpand={handleToggleExpand}
                  onAddChild={handleAddChild}
                  onEditNode={handleEditNode}
                  onDeleteNode={handleDeleteNode}
                  onOpenSettings={handleOpenSettings}
                  onViewAudit={handleViewAudit}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Node Form Modal */}
      <AccountNodeFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        parentNode={selectedParentNode}
        editingNode={editingNode}
        onSuccess={fetchTree}
      />

      {/* Leaf Settings Modal */}
      <AccountNodeSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        node={settingsNode}
        onSuccess={fetchTree}
      />

      {/* Audit Logs Modal */}
      <AccountNodeAuditModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        node={auditNode}
      />

      {/* Custom Delete Confirmation Dialog */}
      {deleteConfirmOpen && nodeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-white/10">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Delete Account Node?</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong>"{nodeToDelete.name}"</strong>? This action will remove the account category.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
