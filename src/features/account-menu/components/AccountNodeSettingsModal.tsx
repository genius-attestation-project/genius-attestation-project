"use client";

import React, { useEffect, useState } from "react";
import type { AccountNode } from "../types/account-menu.types";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SlidersHorizontal, Plus, Trash2, ShieldAlert } from "lucide-react";

interface AccountNodeSettingsModalProps {
  open: boolean;
  onClose: () => void;
  node: AccountNode | null;
  onSuccess: () => void;
}

export const AccountNodeSettingsModal: React.FC<AccountNodeSettingsModalProps> = ({
  open,
  onClose,
  node,
  onSuccess,
}) => {
  const [accountCode, setAccountCode] = useState("");
  const [ledgerMapping, setLedgerMapping] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);

  // Custom extensible Key-Value pairs for future accounting configurations
  const [customConfigs, setCustomConfigs] = useState<{ key: string; value: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (node) {
      setAccountCode(node.code || node.settings?.accountCode || "");
      setLedgerMapping(node.ledgerMapping || node.settings?.ledgerMapping || "");
      setDescription(node.description || node.settings?.description || "");
      setStatus(node.status ?? true);

      // Extract custom settings object
      const extraSettings = node.settings || {};
      const customPairs: { key: string; value: string }[] = [];
      Object.entries(extraSettings).forEach(([k, v]) => {
        if (!["accountCode", "ledgerMapping", "description", "status"].includes(k)) {
          customPairs.push({ key: k, value: typeof v === "string" ? v : JSON.stringify(v) });
        }
      });
      setCustomConfigs(customPairs);
    }
    setErrorMessage("");
  }, [node, open]);

  const handleAddCustomConfig = () => {
    setCustomConfigs([...customConfigs, { key: "", value: "" }]);
  };

  const handleRemoveCustomConfig = (index: number) => {
    setCustomConfigs(customConfigs.filter((_, i) => i !== index));
  };

  const handleCustomChange = (index: number, field: "key" | "value", val: string) => {
    const updated = [...customConfigs];
    updated[index][field] = val;
    setCustomConfigs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node) return;

    setLoading(true);
    setErrorMessage("");

    try {
      // Build custom settings object
      const customSettingsObj: Record<string, any> = {};
      customConfigs.forEach((pair) => {
        if (pair.key.trim()) {
          customSettingsObj[pair.key.trim()] = pair.value;
        }
      });

      const payload = {
        accountCode: accountCode.trim() || null,
        ledgerMapping: ledgerMapping.trim() || null,
        description: description.trim() || null,
        status,
        customSettings: customSettingsObj,
      };

      const res = await fetch(`/api/account-menu/${node.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.message || "Failed to update node settings.");
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

  if (!node) return null;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      placement="center"
      title={`Configure Settings — ${node.name}`}
      description="Extend financial parameters, ledger codes, and accounting configurations for this leaf account."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            ⚠️ {errorMessage}
          </div>
        )}

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300 flex items-start gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Settings are active because <strong>"{node.name}"</strong> is a leaf node (contains no children).
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Account Code"
              placeholder="e.g. 1001-ENBD"
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              className="rounded-xl border-slate-200/60 bg-slate-50/50 focus:bg-white dark:border-white/10 dark:bg-white/5"
            />
            <Input
              label="Ledger Mapping"
              placeholder="e.g. GL-BANK-01"
              value={ledgerMapping}
              onChange={(e) => setLedgerMapping(e.target.value)}
              className="rounded-xl border-slate-200/60 bg-slate-50/50 focus:bg-white dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Financial details or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="settingsStatus"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="settingsStatus"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Account Active in Ledger
            </label>
          </div>

          {/* Extendable Future Accounting Parameters */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Future / Custom Accounting Parameters
              </label>
              <button
                type="button"
                onClick={handleAddCustomConfig}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Config Parameter
              </button>
            </div>

            {customConfigs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No extra parameters configured.</p>
            ) : (
              <div className="space-y-2">
                {customConfigs.map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Parameter Key (e.g. taxRate)"
                      value={pair.key}
                      onChange={(e) => handleCustomChange(idx, "key", e.target.value)}
                      className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 5%)"
                      value={pair.value}
                      onChange={(e) => handleCustomChange(idx, "value", e.target.value)}
                      className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomConfig(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200/60 pt-4 dark:border-white/10">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving Settings..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
};
