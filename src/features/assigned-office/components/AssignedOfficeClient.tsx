"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  KeyRound,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  Layers,
  Box,
  EyeOff,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

type PermissionProps = {
  permissions?: {
    "assigned_office.view"?: boolean;
    "assigned_office.create"?: boolean;
    "assigned_office.edit"?: boolean;
    "assigned_office.delete"?: boolean;
    "assigned_office.activate"?: boolean;
    "assigned_office.deactivate"?: boolean;
    "assigned_office.reset_password"?: boolean;
    "assigned_office.export"?: boolean;
  };
};

type ProcessTypeOption = {
  id: string;
  name: string;
  subPackageIds: string[];
  coreSubPackageId?: string | null;
};

type SubPackageOption = {
  id: string;
  name: string;
};

type AssignedOfficeItem = {
  id: string;
  username: string;
  email: string;
  status: boolean;
  lastLogin: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignedProcessTypes: Array<{ id: string; name: string }>;
  assignedSubPackages: Array<{ id: string; name: string; isCorePackage: boolean }>;
  corePackage: { id: string; name: string } | null;
  auditLogs?: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    createdAt: string;
  }>;
};

export function AssignedOfficeClient({ permissions = {} }: PermissionProps) {
  const [offices, setOffices] = useState<AssignedOfficeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [processTypeFilter, setProcessTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Master Options
  const [masterProcessTypes, setMasterProcessTypes] = useState<ProcessTypeOption[]>([]);
  const [masterSubPackages, setMasterSubPackages] = useState<SubPackageOption[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<AssignedOfficeItem | null>(null);

  // Create / Edit Form State
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formStatus, setFormStatus] = useState(true);
  const [formSelectedProcessTypes, setFormSelectedProcessTypes] = useState<string[]>([]);
  const [formSelectedCorePackage, setFormSelectedCorePackage] = useState<string>("");
  const [formSelectedSubPackages, setFormSelectedSubPackages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Reset Password State
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Fetch Master Options
  useEffect(() => {
    fetch("/api/assigned-office/master-options")
      .then((res) => res.json())
      .then((data) => {
        if (data.processTypes) setMasterProcessTypes(data.processTypes);
        if (data.subPackages) setMasterSubPackages(data.subPackages);
      })
      .catch((err) => console.error("Failed to load master options", err));
  }, []);

  // Fetch Offices List
  const fetchOffices = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        status: statusFilter,
        processTypeId: processTypeFilter,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/assigned-office?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOffices(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to load assigned offices", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, processTypeFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  // Derived options based on selected Process Types
  const availableSubPackages = useMemo(() => {
    if (formSelectedProcessTypes.length === 0) return masterSubPackages;

    const allowedSubPkgIds = new Set<string>();
    masterProcessTypes.forEach((pt) => {
      if (formSelectedProcessTypes.includes(pt.id)) {
        pt.subPackageIds.forEach((id) => allowedSubPkgIds.add(id));
      }
    });

    if (allowedSubPkgIds.size === 0) return masterSubPackages;
    return masterSubPackages.filter((sp) => allowedSubPkgIds.has(sp.id));
  }, [formSelectedProcessTypes, masterProcessTypes, masterSubPackages]);

  // Reset form
  const resetForm = () => {
    setFormUsername("");
    setFormEmail("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormShowPassword(false);
    setFormStatus(true);
    setFormSelectedProcessTypes([]);
    setFormSelectedCorePackage("");
    setFormSelectedSubPackages([]);
    setFormError(null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (office: AssignedOfficeItem) => {
    setSelectedOffice(office);
    setFormUsername(office.username);
    setFormEmail(office.email);
    setFormPassword("");
    setFormConfirmPassword("");
    setFormShowPassword(false);
    setFormStatus(office.status);
    setFormSelectedProcessTypes(office.assignedProcessTypes.map((pt) => pt.id));
    setFormSelectedCorePackage(office.corePackage ? office.corePackage.id : "");
    setFormSelectedSubPackages(office.assignedSubPackages.map((sp) => sp.id));
    setFormError(null);
    setIsEditOpen(true);
  };

  // Open View Modal
  const handleOpenView = (office: AssignedOfficeItem) => {
    setSelectedOffice(office);
    setIsViewOpen(true);
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (office: AssignedOfficeItem) => {
    setSelectedOffice(office);
    setResetPassword("");
    setResetConfirmPassword("");
    setResetError(null);
    setIsResetPasswordOpen(true);
  };

  // Password Generator
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pwd = "A1!";
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pwd);
    setFormConfirmPassword(pwd);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formPassword !== formConfirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (!formSelectedSubPackages.includes(formSelectedCorePackage)) {
      setFormError("Selected Core Package must also be checked in Assigned Sub Packages.");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/assigned-office", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername,
          email: formEmail,
          password: formPassword,
          confirmPassword: formConfirmPassword,
          processTypes: formSelectedProcessTypes,
          corePackageId: formSelectedCorePackage,
          subPackages: formSelectedSubPackages,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create Assigned Office");
      }

      setIsCreateOpen(false);
      fetchOffices();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffice) return;
    setFormError(null);

    if (formPassword && formPassword !== formConfirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (!formSelectedSubPackages.includes(formSelectedCorePackage)) {
      setFormError("Selected Core Package must also be checked in Assigned Sub Packages.");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/assigned-office/${selectedOffice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername,
          email: formEmail,
          password: formPassword || undefined,
          processTypes: formSelectedProcessTypes,
          corePackageId: formSelectedCorePackage,
          subPackages: formSelectedSubPackages,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update Assigned Office");
      }

      setIsEditOpen(false);
      fetchOffices();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (office: AssignedOfficeItem) => {
    try {
      const res = await fetch(`/api/assigned-office/${office.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !office.status }),
      });
      if (res.ok) fetchOffices();
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  // Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffice) return;
    setResetError(null);

    if (resetPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/assigned-office/${selectedOffice.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: resetPassword,
          confirmPassword: resetConfirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");

      setIsResetPasswordOpen(false);
      alert("Password reset successfully!");
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetSubmitting(false);
    }
  };

  // Delete Office
  const handleDelete = async (office: AssignedOfficeItem) => {
    if (!confirm(`Are you sure you want to delete Assigned Office '${office.username}'?`)) return;

    try {
      const res = await fetch(`/api/assigned-office/${office.id}`, { method: "DELETE" });
      if (res.ok) fetchOffices();
    } catch (err) {
      console.error("Failed to delete office", err);
    }
  };

  // Export Excel
  const handleExport = () => {
    window.open("/api/assigned-office/export", "_blank");
  };

  // Select all rows
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(offices.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Select single row
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Assigned Office
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage external processing offices, credentials, process type mappings, core package, and workspace permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/assigned-office/workspace">
            <Button
              variant="secondary"
              className="gap-2 rounded-xl border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            >
              <Building2 size={16} />
              Open Workspace
            </Button>
          </Link>

          {permissions["assigned_office.export"] && (
            <Button
              variant="secondary"
              onClick={handleExport}
              className="gap-2 rounded-xl border-slate-300 dark:border-white/15"
            >
              <Download size={16} />
              Export Excel
            </Button>
          )}

          {/* ALWAYS VISIBLE CREATE BUTTON */}
          <Button
            onClick={handleOpenCreate}
            className="gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
          >
            <Plus size={18} />
            + Create Assigned Office
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f1115] lg:grid-cols-4">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 py-2.5 px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Process Type Filter */}
        <div>
          <select
            value={processTypeFilter}
            onChange={(e) => setProcessTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 py-2.5 px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="All">All Process Types</option>
            {masterProcessTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Enterprise Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden dark:border-white/10 dark:bg-[#0f1115]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={offices.length > 0 && selectedIds.length === offices.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  onClick={() => {
                    setSortBy("username");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    Username
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="p-4">Email</th>
                <th className="p-4">Assigned Process Types</th>
                <th className="p-4">Assigned Core Package</th>
                <th className="p-4">Assigned Sub Packages</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Login</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2 text-sm font-medium">Loading Assigned Offices...</p>
                  </td>
                </tr>
              ) : offices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No Assigned Offices found matching your criteria.
                  </td>
                </tr>
              ) : (
                offices.map((office) => (
                  <tr
                    key={office.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(office.id)}
                        onChange={() => handleSelectRow(office.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {office.username}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{office.email}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {office.assignedProcessTypes.length > 0 ? (
                          office.assignedProcessTypes.map((pt) => (
                            <span
                              key={pt.id}
                              className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                            >
                              {pt.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {office.corePackage ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                          <Sparkles size={12} />
                          {office.corePackage.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {office.assignedSubPackages.length > 0 ? (
                          office.assignedSubPackages.map((sp) => (
                            <span
                              key={sp.id}
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                sp.isCorePackage
                                  ? "bg-amber-100 text-amber-900 font-semibold dark:bg-amber-500/20 dark:text-amber-200"
                                  : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                              )}
                            >
                              {sp.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          office.status
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                        )}
                      >
                        {office.status ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {office.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {office.lastLogin ? (
                        new Date(office.lastLogin).toLocaleString()
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(office.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="View Office"
                          onClick={() => handleOpenView(office)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          title="Edit Office"
                          onClick={() => handleOpenEdit(office)}
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/15"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          title="Reset Password"
                          onClick={() => handleOpenResetPassword(office)}
                          className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/15"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          title={office.status ? "Deactivate" : "Activate"}
                          onClick={() => handleToggleStatus(office)}
                          className={cn(
                            "rounded-lg p-1.5",
                            office.status
                              ? "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                              : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/15"
                          )}
                        >
                          {office.status ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button
                          title="Delete Office"
                          onClick={() => handleDelete(office)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 p-4 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <div>
            Showing {offices.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(page * pageSize, total)} of {total} entries
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 w-7 rounded-lg"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="px-2 font-semibold text-slate-900 dark:text-white">
                {page} / {Math.ceil(total / pageSize) || 1}
              </span>
              <Button
                variant="secondary"
                size="icon"
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 rounded-lg"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ASSIGNED OFFICE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115] dark:border dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  + Create Assigned Office
                </h2>
                <p className="text-xs text-slate-500">
                  Set up external processing office credentials and document packages.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Account Credentials Section */}
              <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Details</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. uae_embassy_ad"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. uae@embassy.ae"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Generate Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={formShowPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setFormShowPassword(!formShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {formShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type={formShowPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="createStatus"
                    checked={formStatus}
                    onChange={(e) => setFormStatus(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="createStatus" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Active Account Status
                  </label>
                </div>
              </div>

              {/* Process Type Assignment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assigned Process Types *
                  </h3>
                  <span className="text-xs text-slate-400">Multiple selection allowed</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-h-40 overflow-y-auto p-1">
                  {masterProcessTypes.map((pt) => {
                    const isSelected = formSelectedProcessTypes.includes(pt.id);
                    return (
                      <button
                        type="button"
                        key={pt.id}
                        onClick={() => {
                          setFormSelectedProcessTypes((prev) =>
                            isSelected ? prev.filter((id) => id !== pt.id) : [...prev, pt.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-left transition-all text-xs font-semibold",
                          isSelected
                            ? "border-blue-500 bg-blue-50/80 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                            : "border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span className="truncate">{pt.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Package */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Core Package *
                  </h3>
                  <span className="text-xs text-amber-600 font-medium dark:text-amber-400">
                    Mandatory package determining document completion
                  </span>
                </div>
                <select
                  required
                  value={formSelectedCorePackage}
                  onChange={(e) => setFormSelectedCorePackage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                >
                  <option value="">-- Select ONE Core Package --</option>
                  {availableSubPackages.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Sub Packages */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assigned Sub Packages *
                  </h3>
                  <span className="text-xs text-slate-400">Core Package must be included</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-h-48 overflow-y-auto p-1">
                  {availableSubPackages.map((sp) => {
                    const isSelected = formSelectedSubPackages.includes(sp.id);
                    const isCore = sp.id === formSelectedCorePackage;
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => {
                          setFormSelectedSubPackages((prev) =>
                            isSelected ? prev.filter((id) => id !== sp.id) : [...prev, sp.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-left transition-all text-xs font-semibold",
                          isSelected
                            ? isCore
                              ? "border-amber-500 bg-amber-50 text-amber-900 font-bold dark:bg-amber-500/20 dark:text-amber-200"
                              : "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                            : "border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span className="truncate flex-1">{sp.name}</span>
                        {isCore && (
                          <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-500/30 dark:text-amber-100">
                            CORE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  {formSubmitting ? "Creating..." : "Create Assigned Office"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ASSIGNED OFFICE MODAL */}
      {isEditOpen && selectedOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115] dark:border dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Edit Assigned Office
                </h2>
                <p className="text-xs text-slate-500">
                  Update credentials, process mappings, and core package.
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Details</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password (Optional)
                    </label>
                    <input
                      type={formShowPassword ? "text" : "password"}
                      placeholder="Leave blank to keep current"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={formShowPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="editStatus"
                    checked={formStatus}
                    onChange={(e) => setFormStatus(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="editStatus" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Active Account Status
                  </label>
                </div>
              </div>

              {/* Process Type Assignment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assigned Process Types *
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-h-40 overflow-y-auto p-1">
                  {masterProcessTypes.map((pt) => {
                    const isSelected = formSelectedProcessTypes.includes(pt.id);
                    return (
                      <button
                        type="button"
                        key={pt.id}
                        onClick={() => {
                          setFormSelectedProcessTypes((prev) =>
                            isSelected ? prev.filter((id) => id !== pt.id) : [...prev, pt.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-left transition-all text-xs font-semibold",
                          isSelected
                            ? "border-blue-500 bg-blue-50/80 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                            : "border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        )}
                      >
                        <input type="checkbox" checked={isSelected} readOnly className="rounded" />
                        <span className="truncate">{pt.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Package */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Core Package *</h3>
                <select
                  required
                  value={formSelectedCorePackage}
                  onChange={(e) => setFormSelectedCorePackage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                >
                  <option value="">-- Select ONE Core Package --</option>
                  {availableSubPackages.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Sub Packages */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Assigned Sub Packages *
                </h3>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-h-48 overflow-y-auto p-1">
                  {availableSubPackages.map((sp) => {
                    const isSelected = formSelectedSubPackages.includes(sp.id);
                    const isCore = sp.id === formSelectedCorePackage;
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => {
                          setFormSelectedSubPackages((prev) =>
                            isSelected ? prev.filter((id) => id !== sp.id) : [...prev, sp.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 text-left transition-all text-xs font-semibold",
                          isSelected
                            ? isCore
                              ? "border-amber-500 bg-amber-50 text-amber-900 font-bold dark:bg-amber-500/20 dark:text-amber-200"
                              : "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                            : "border-slate-200 bg-slate-50/40 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        )}
                      >
                        <input type="checkbox" checked={isSelected} readOnly className="rounded" />
                        <span className="truncate flex-1">{sp.name}</span>
                        {isCore && (
                          <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            CORE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  {formSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ASSIGNED OFFICE MODAL */}
      {isViewOpen && selectedOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115] dark:border dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Assigned Office Details
                </h2>
                <p className="text-xs text-slate-500">Comprehensive configuration & history.</p>
              </div>
              <button
                onClick={() => setIsViewOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 space-y-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-slate-400 font-medium">Username</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedOffice.username}
                </p>

                <p className="text-slate-400 font-medium pt-2">Email</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedOffice.email}
                </p>

                <p className="text-slate-400 font-medium pt-2">Status</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold text-[11px]",
                    selectedOffice.status
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {selectedOffice.status ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 space-y-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-slate-400 font-medium">Created By</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedOffice.createdBy || "System"}
                </p>

                <p className="text-slate-400 font-medium pt-2">Created Date</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(selectedOffice.createdAt).toLocaleString()}
                </p>

                <p className="text-slate-400 font-medium pt-2">Last Login</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedOffice.lastLogin
                    ? new Date(selectedOffice.lastLogin).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            {/* Core Package & Subpackages */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Package Configurations
              </h3>
              <div className="rounded-2xl border border-slate-200/60 p-4 space-y-3 dark:border-white/10">
                <div>
                  <span className="text-xs font-semibold text-slate-500">Core Package: </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                    <Sparkles size={12} />
                    {selectedOffice.corePackage?.name || "Not assigned"}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    Assigned Sub Packages:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOffice.assignedSubPackages.map((sp) => (
                      <span
                        key={sp.id}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          sp.isCorePackage
                            ? "bg-amber-100 text-amber-900 font-bold"
                            : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                        )}
                      >
                        {sp.name} {sp.isCorePackage ? "(CORE)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Log Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Audit History Trail
              </h3>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200/60 p-3 text-xs dark:divide-white/10 dark:border-white/10">
                {selectedOffice.auditLogs && selectedOffice.auditLogs.length > 0 ? (
                  selectedOffice.auditLogs.map((log) => (
                    <div key={log.id} className="py-2 space-y-0.5">
                      <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                        <span>{log.action}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-500">{log.description}</p>
                      <p className="text-[10px] text-slate-400">By: {log.performedBy}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-4">No audit logs recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetPasswordOpen && selectedOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115] dark:border dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Reset Password for {selectedOffice.username}
              </h2>
              <button
                onClick={() => setIsResetPasswordOpen(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetSubmitting}
                  className="rounded-xl bg-amber-600 text-white hover:bg-amber-700"
                >
                  {resetSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
