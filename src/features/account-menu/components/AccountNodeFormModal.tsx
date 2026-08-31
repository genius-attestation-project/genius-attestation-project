"use client";

import React, { useEffect, useState } from "react";
import type { AccountNode } from "../types/account-menu.types";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface AccountNodeFormModalProps {
  open: boolean;
  onClose: () => void;
  parentNode?: AccountNode | null;
  editingNode?: AccountNode | null;
  onSuccess: () => void;
}

export const AccountNodeFormModal: React.FC<AccountNodeFormModalProps> = ({
  open,
  onClose,
  parentNode,
  editingNode,
  onSuccess,
}) => {
  const isEdit = Boolean(editingNode);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (editingNode) {
      setName(editingNode.name || "");
    } else {
      setName("");
    }
    setErrorMessage("");
  }, [editingNode, parentNode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!name.trim()) {
      setErrorMessage("Account name is required.");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit
        ? `/api/account-menu/${editingNode!.id}`
        : "/api/account-menu";
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? {
            name: name.trim(),
          }
        : {
            name: name.trim(),
            parentId: parentNode?.id || null,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.message || "Failed to save account node.");
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      placement="center"
      title={
        isEdit
          ? `Edit "${editingNode?.name}"`
          : parentNode
          ? `Add Child Under "${parentNode.name}"`
          : "Add Account Node"
      }
      description={
        isEdit
          ? "Modify node details and properties."
          : `Create a new category node inside ${parentNode?.name || "root"}.`
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            ⚠️ {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Account Title / Name *"
            placeholder="e.g. Emirates NBD, UAE Embassy, Processing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="rounded-xl border-slate-200/60 bg-slate-50/50 focus:bg-white dark:border-white/10 dark:bg-white/5"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200/60 pt-4 dark:border-white/10">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Node"}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
};
