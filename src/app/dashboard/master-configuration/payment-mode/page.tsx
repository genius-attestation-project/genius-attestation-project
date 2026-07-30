"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  CreditCard,
  CircleCheck,
  CircleMinus,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { MasterLayout } from "@/features/master-configuration/components/MasterLayout";
import { MasterDataTable } from "@/features/master-configuration/components/MasterDataTable";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMode = {
  id: string;
  paymentModeName: string;
  description: string | null;
  status: string;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  slNo?: number;
  auditLogs?: AuditLog[];
};

type AuditLog = {
  id: string;
  action: string;
  performedByName: string | null;
  performedBy: string;
  details: string | null;
  timestamp: string;
};

type FormState = {
  paymentModeName: string;
  description: string;
  status: "Active" | "Inactive";
  displayOrder: number;
};

const BLANK_FORM: FormState = {
  paymentModeName: "",
  description: "",
  status: "Active",
  displayOrder: 0,
};

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        isActive
          ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "border-slate-200/60 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
      }`}
    >
      {isActive ? <CircleCheck size={12} /> : <CircleMinus size={12} />}
      {status}
    </span>
  );
}

// ─── Audit Log Viewer ──────────────────────────────────────────────────────────

function AuditLogSection({ logs }: { logs: AuditLog[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!logs || logs.length === 0) return null;

  const visible = expanded ? logs : logs.slice(0, 3);

  const actionColor: Record<string, string> = {
    CREATED:
      "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    UPDATED:
      "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",
    ACTIVATED:
      "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    DEACTIVATED:
      "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
    DELETED:
      "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10",
  };

  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Audit History
      </p>
      <div className="space-y-2">
        {visible.map((log) => (
          <div
            key={log.id}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  actionColor[log.action] ||
                  "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-white/10"
                }`}
              >
                {log.action}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock size={10} />
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            {log.details && (
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                {log.details}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
              <User size={10} />
              {log.performedByName || log.performedBy}
            </p>
          </div>
        ))}
      </div>
      {logs.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={14} /> Show {logs.length - 3} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function PaymentModePage() {
  const [data, setData] = useState<PaymentMode[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeRecords, setActiveRecords] = useState(0);
  const [inactiveRecords, setInactiveRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "Active" | "Inactive"
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentMode | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch records ────────────────────────────────────────────────────────────

  const fetchRecords = useCallback(
    async (query = "", status = "") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        if (status) params.set("status", status);
        params.set("pageSize", "200");
        const res = await fetch(
          `/api/master-data/payment-mode?${params.toString()}`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json.items || []);
          setTotalRecords(json.total ?? 0);
          setActiveRecords(json.activeCount ?? 0);
          setInactiveRecords(json.inactiveCount ?? 0);
        }
      } catch (e) {
        console.error("[PaymentModePage] fetchRecords error:", e);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchRecords("", statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRecords(searchQuery, statusFilter);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchRecords, statusFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingItem(null);
    setForm(BLANK_FORM);
    setAuditLogs([]);
    setFormError("");
    setDrawerOpen(true);
  };

  const openEdit = async (item: PaymentMode) => {
    setEditingItem(item);
    setForm({
      paymentModeName: item.paymentModeName,
      description: item.description || "",
      status: item.status === "Inactive" ? "Inactive" : "Active",
      displayOrder: item.displayOrder ?? 0,
    });
    setFormError("");
    setAuditLogs([]);
    setDrawerOpen(true);

    // Fetch audit logs for this item
    try {
      const res = await fetch(`/api/master-data/payment-mode/${item.id}`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.item?.auditLogs || []);
      }
    } catch {
      // Non-critical
    }
  };

  const handleToggleStatus = async (item: PaymentMode) => {
    const newStatus = item.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/master-data/payment-mode/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchRecords(searchQuery, statusFilter);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to update status.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (item: PaymentMode) => {
    if (
      !confirm(
        `Are you sure you want to delete "${item.paymentModeName}"?\n\nThis action cannot be undone.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/master-data/payment-mode/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRecords(searchQuery, statusFilter);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to delete payment mode.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const url = editingItem
        ? `/api/master-data/payment-mode/${editingItem.id}`
        : `/api/master-data/payment-mode`;
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentModeName: form.paymentModeName.trim(),
          description: form.description.trim() || null,
          status: form.status,
          displayOrder: form.displayOrder,
        }),
      });
      if (res.ok) {
        setDrawerOpen(false);
        fetchRecords(searchQuery, statusFilter);
      } else {
        const err = await res.json();
        setFormError(err.message || "An error occurred. Please try again.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────────

  const columns = [
    {
      header: "SL No",
      accessorKey: "slNo",
      cell: (item: PaymentMode) => (
        <span className="font-mono text-xs font-bold text-slate-400">
          {String(item.slNo ?? "").padStart(2, "0")}
        </span>
      ),
    },
    {
      header: "Payment Mode Name",
      accessorKey: "paymentModeName",
      cell: (item: PaymentMode) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <CreditCard size={15} />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {item.paymentModeName}
          </span>
        </div>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (item: PaymentMode) => (
        <span className="max-w-xs truncate text-slate-500 dark:text-slate-400">
          {item.description || (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (item: PaymentMode) => <StatusBadge status={item.status} />,
    },
    {
      header: "Created Date",
      accessorKey: "createdAt",
      cell: (item: PaymentMode) => (
        <span className="text-xs text-slate-500">
          {new Date(item.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      header: "Last Updated",
      accessorKey: "updatedAt",
      cell: (item: PaymentMode) => (
        <span className="text-xs text-slate-500">
          {new Date(item.updatedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  // ── Status filter component ───────────────────────────────────────────────────

  const filterComponent = (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
        Status:
      </span>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-10 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#13151a]"
      >
        <option value="">All</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <MasterLayout
        title="Payment Mode"
        description="Manage all accepted payment modes used across Revenue Registration and invoicing. Only Active payment modes appear in registration forms."
        totalRecords={totalRecords}
        activeRecords={activeRecords}
        inactiveRecords={inactiveRecords}
        onAdd={openAdd}
        onRefresh={() => fetchRecords(searchQuery, statusFilter)}
      >
        <MasterDataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, description, or status..."
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          filterComponent={filterComponent}
        />
      </MasterLayout>

      {/* Add / Edit Drawer */}
      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="center"
        title={
          editingItem ? "Edit Payment Mode" : "Add New Payment Mode"
        }
        description={
          editingItem
            ? `Update details for "${editingItem.paymentModeName}".`
            : "Define a new payment mode that will be available in Revenue Registration."
        }
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6 pt-2">
          <div className="space-y-5">
            {/* Error banner */}
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {formError}
              </div>
            )}

            {/* Payment Mode Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                Payment Mode Name <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.paymentModeName}
                onChange={(e) =>
                  setForm({ ...form, paymentModeName: e.target.value })
                }
                placeholder="e.g. Cash, UPI, Credit Card"
                required
                maxLength={100}
                className="h-12 w-full min-w-0 rounded-xl border border-slate-200/60 bg-slate-50/50 px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#13151a]"
              />
              <p className="text-[11px] text-slate-400">
                Examples: Cash · UPI · Credit Card · Debit Card · Bank Transfer · Cheque · Online Payment · Wallet
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                Description{" "}
                <span className="text-[11px] font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description of this payment mode..."
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#13151a]"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                Status <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-3">
                {(["Active", "Inactive"] as const).map((s) => (
                  <label
                    key={s}
                    className={`flex flex-1 cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 transition-all ${
                      form.status === s
                        ? s === "Active"
                          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                          : "border-slate-300 bg-slate-100 dark:border-white/20 dark:bg-white/10"
                        : "border-slate-200/60 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={form.status === s}
                      onChange={() => setForm({ ...form, status: s })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span
                      className={`text-sm font-semibold ${
                        form.status === s
                          ? s === "Active"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-700 dark:text-slate-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {s === "Active" ? "✓ Active" : "○ Inactive"}
                    </span>
                  </label>
                ))}
              </div>
              {form.status === "Inactive" && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  ⚠ Inactive payment modes will not appear in new Revenue Registration forms.
                </p>
              )}
            </div>

            {/* Display Order */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                Display Order{" "}
                <span className="text-[11px] font-normal text-slate-400">
                  (lower = first)
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={String(form.displayOrder)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    displayOrder: parseInt(e.target.value) || 0,
                  })
                }
                className="h-12 w-full min-w-0 rounded-xl border border-slate-200/60 bg-slate-50/50 px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#13151a]"
              />
            </div>

            {/* Audit log section (edit mode only) */}
            {editingItem && auditLogs.length > 0 && (
              <AuditLogSection logs={auditLogs} />
            )}
          </div>

          {/* Footer buttons */}
          <div className="mt-auto flex items-center justify-end gap-3 border-t border-slate-200/60 pt-4 dark:border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDrawerOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading
                ? "Saving..."
                : editingItem
                ? "Save Changes"
                : "Create Payment Mode"}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </>
  );
}
