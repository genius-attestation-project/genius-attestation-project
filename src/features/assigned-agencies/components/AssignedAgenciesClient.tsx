"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Edit2, KeyRound, Trash2, Power, Eye, EyeOff, Download, Check, 
  RefreshCw, User, Mail, Lock, Sparkles, ChevronDown, X, ShieldCheck, Info, UserPlus,
  Building2, Users, Filter, Clock, ChevronLeft, ChevronRight, RotateCcw, PackageCheck
} from "lucide-react";
import { z } from "zod";
import * as XLSX from "xlsx";

import { createAgencySchema, updateAgencySchema, resetAgencyPasswordSchema } from "../validations/agency.schema";

interface ProcessType {
  id: string;
  name: string;
}

interface AssignedPackage {
  processTypeId: string;
  processType: ProcessType;
}

interface Agency {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  assignedPackages: AssignedPackage[];
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export function AssignedAgenciesClient({ permissions }: { permissions: Record<string, boolean> }) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [packageFilter, setPackageFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [modal, setModal] = useState<"create" | "edit" | "view" | "reset" | "delete" | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    isActive: true,
  });
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [pkgDropdownOpen, setPkgDropdownOpen] = useState(false);
  const [pkgSearch, setPkgSearch] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [processLoading, setProcessLoading] = useState(true);
  const [processError, setProcessError] = useState<string | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchProcessTypes();
  }, []);

  useEffect(() => {
    fetchAgencies();
  }, [page, search, statusFilter, packageFilter]);

  const fetchProcessTypes = async () => {
    try {
      // Fetch active process types from master-data API
       const res = await fetch('/api/master-data/process-types?active=true&limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched process types:', data);
        // Support both { items: [] } and direct array responses
        setProcessTypes(data.items ?? data);
        setProcessError(null);
      } else {
        const err = await res.json();
        setProcessError(err.message || 'Failed to load process types');
      }
    } catch (e) {
      console.error(e);
      setProcessError('Unable to fetch process types');
    } finally {
      setProcessLoading(false);
    }
  };

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        search,
        status: statusFilter,
        package: packageFilter,
      });
      const res = await fetch(`/api/assigned-agencies?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAgencies(data.items);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      showToast("error", "Failed to load agencies");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setFormErrors({});
    if (formData.password !== formData.confirmPassword) {
      setFormErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    try {
      const data = { ...formData, assignedPackages: selectedPackages };
      createAgencySchema.parse(data);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errors: any = {};
        e.issues.forEach((err: any) => errors[err.path[0]] = err.message);
        setFormErrors(errors);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/assigned-agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, assignedPackages: selectedPackages }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast("error", err.message || "Failed to create agency");
        return;
      }
      showToast("success", "Agency created successfully");
      setModal(null);
      fetchAgencies();
    } catch (e) {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    setFormErrors({});
    try {
      const data = { 
        username: formData.username, 
        email: formData.email, 
        isActive: formData.isActive,
        assignedPackages: selectedPackages 
      };
      updateAgencySchema.parse(data);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errors: any = {};
        e.issues.forEach((err: any) => errors[err.path[0]] = err.message);
        setFormErrors(errors);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assigned-agencies/${selectedAgency!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          isActive: formData.isActive,
          assignedPackages: selectedPackages,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast("error", err.message || "Failed to update agency");
        return;
      }
      showToast("success", "Agency updated successfully");
      setModal(null);
      fetchAgencies();
    } catch (e) {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setFormErrors({});
    if (formData.password !== formData.confirmPassword) {
      setFormErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    
    try {
      resetAgencyPasswordSchema.parse({ password: formData.password });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        setFormErrors({ password: e.issues[0].message });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assigned-agencies/${selectedAgency!.id}/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: formData.password }),
      });
      if (!res.ok) {
        showToast("error", "Failed to reset password");
        return;
      }
      showToast("success", "Password reset successfully");
      setModal(null);
    } catch (e) {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assigned-agencies/${selectedAgency!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showToast("error", "Failed to delete agency");
        return;
      }
      showToast("success", "Agency deleted");
      setModal(null);
      fetchAgencies();
    } catch (e) {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (agency: Agency) => {
    try {
      const res = await fetch(`/api/assigned-agencies/${agency.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agency.isActive }),
      });
      if (res.ok) {
        showToast("success", `Agency ${!agency.isActive ? "activated" : "deactivated"}`);
        fetchAgencies();
      }
    } catch (e) {
      showToast("error", "Failed to change status");
    }
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(f => ({ ...f, password: pwd, confirmPassword: pwd }));
    setShowPassword(true);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(agencies.map(a => ({
      Username: a.username,
      Email: a.email,
      "Assigned Packages": a.assignedPackages.map(p => p.processType.name).join(", "),
      Status: a.isActive ? "Active" : "Inactive",
      "Created Date": new Date(a.createdAt).toLocaleDateString(),
      "Last Login": a.lastLogin ? new Date(a.lastLogin).toLocaleDateString() : "Never",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agencies");
    XLSX.writeFile(wb, "Assigned_Agencies.xlsx");
  };

  const filteredProcessTypes = processTypes.filter(p => 
    p.name.toLowerCase().includes(pkgSearch.toLowerCase())
  );

  const openCreateModal = () => {
    setFormData({ username: "", email: "", password: "", confirmPassword: "", isActive: true });
    setSelectedPackages([]);
    setFormErrors({});
    setShowPassword(false);
    setPkgDropdownOpen(false);
    setPkgSearch("");
    setModal("create");
  };

  const openEditModal = (agency: Agency) => {
    setSelectedAgency(agency);
    setFormData({ username: agency.username, email: agency.email, password: "", confirmPassword: "", isActive: agency.isActive });
    setSelectedPackages(agency.assignedPackages.map(p => p.processTypeId));
    setFormErrors({});
    setPkgDropdownOpen(false);
    setPkgSearch("");
    setModal("edit");
  };

  return (
    <div className="space-y-6 w-full">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-xl animate-in slide-in-from-top-4 duration-200 ${
            toast.type === "success" ? "bg-emerald-600 shadow-emerald-950/20" : "bg-rose-600 shadow-rose-950/20"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Assigned Agencies</h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Manage external agency login accounts and assigned process packages.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {permissions["assigned_agencies.export"] && (
            <button 
              onClick={exportExcel} 
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-2xs hover:shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" /> 
              Export Excel
            </button>
          )}
          {permissions["assigned_agencies.create"] && (
            <button 
              onClick={openCreateModal} 
              className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> 
              Add Agency
            </button>
          )}
        </div>
      </div>

      {/* Table & Control Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-5">
        {/* Controls / Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by username or email address..." 
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button 
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative min-w-35">
            <select 
              className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Package Filter */}
          <div className="relative min-w-40">
            {processLoading ? (
              <select className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-400 cursor-not-allowed" disabled>
                <option>Loading...</option>
              </select>
            ) : processError ? (
              <div className="text-rose-500 text-xs py-2 px-3">{processError}</div>
            ) : (
              <select 
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
                value={packageFilter}
                onChange={e => { setPackageFilter(e.target.value); setPage(1); }}
              >
                <option value="All">All Packages</option>
                {processTypes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Agencies Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="px-4 py-3 text.xs uppercase tracking-wider font-bold text-slate-500 text-[11px]">Username</th>
                <th className="px-4 py-3 text.xs uppercase tracking-wider font-bold text-slate-500 text-[11px]">Email Address</th>
                <th className="px-4 py-3 text.xs uppercase tracking-wider font-bold text-slate-500 text-[11px]">Assigned Packages</th>
                <th className="px-4 py-3 text.xs uppercase tracking-wider font-bold text-slate-500 text-[11px]">Status</th>
                <th className="px-4 py-3 text.xs uppercase tracking-wider font-bold text-slate-500 text-[11px]">Last Login</th>
                <th className="px-4 py-3 text.xs uppercase tracking-wider font-bold text-slate-500 text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      Loading agencies...
                    </div>
                  </td>
                </tr>
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-50 to-indigo-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mx-auto shadow-inner">
                        <Building2 className="w-7 h-7" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No Agency Accounts Found</h3>
                      <p className="text-xs text-slate-500 font-normal">No agency accounts match your search or filters. Create your first agency account to assign process packages.</p>
                      {permissions["assigned_agencies.create"] && (
                        <button 
                          onClick={openCreateModal} 
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Agency Account
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                agencies.map(agency => (
                  <tr key={agency.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px] uppercase border border-slate-200/60">
                          {agency.username.slice(0, 2)}
                        </div>
                        <span>{agency.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agency.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {agency.assignedPackages.slice(0, 2).map(p => (
                          <span key={p.processTypeId} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-lg font-medium text-[11px]">
                            {p.processType.name}
                          </span>
                        ))}
                        {agency.assignedPackages.length > 2 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium text-[11px]">
                            +{agency.assignedPackages.length - 2} more
                          </span>
                        )}
                        {agency.assignedPackages.length === 0 && (
                          <span className="text-slate-400 text-xs italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${agency.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' : 'bg-rose-50 text-rose-700 border border-rose-200/70'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${agency.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {agency.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agency.lastLogin ? new Date(agency.lastLogin).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                        {permissions["assigned_agencies.view"] && (
                          <button onClick={() => { setSelectedAgency(agency); setModal("view"); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all" title="View Details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions["assigned_agencies.edit"] && (
                          <button onClick={() => openEditModal(agency)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all" title="Edit Agency">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions["assigned_agencies.reset_password"] && (
                          <button onClick={() => { setSelectedAgency(agency); setFormData(f => ({...f, password: "", confirmPassword: ""})); setFormErrors({}); setModal("reset"); }} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-white rounded-lg transition-all" title="Reset Password">
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions["assigned_agencies.activate"] && permissions["assigned_agencies.deactivate"] && (
                          <button onClick={() => toggleStatus(agency)} className={`p-1.5 hover:bg-white rounded-lg transition-all ${agency.isActive ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'}`} title={agency.isActive ? "Deactivate" : "Activate"}>
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions["assigned_agencies.delete"] && (
                          <button onClick={() => { setSelectedAgency(agency); setModal("delete"); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all" title="Delete Agency">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs font-medium text-slate-500">
            <span>Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong></span>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-all flex items-center gap-1 font-semibold text-slate-700 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-all flex items-center gap-1 font-semibold text-slate-700 shadow-2xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl my-8 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    {modal === "create" ? "Create Agency Account" : "Edit Agency Account"}
                  </h2>
                  <p className="text-xs text-slate-300 font-normal">
                    {modal === "create" ? "Setup credentials and process package access for external agency." : "Update agency account settings and package assignments."}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModal(null)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Account Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Username"
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value})} 
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border ${formErrors.username ? 'border-red-400 bg-red-50/20' : 'border-slate-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all`} 
                    />
                  </div>
                  {formErrors.username && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.username}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input 
                      type="email" 
                      placeholder="Email address"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border ${formErrors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all`} 
                    />
                  </div>
                  {formErrors.email && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.email}</p>}
                </div>
              </div>

              {/* Password Setup */}
              {modal === "create" && (
                <div className="p-4 bg-linear-to-br from-slate-50 via-slate-50 to-blue-50/30 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Password Setup <span className="text-red-500">*</span></span>
                    </div>
                    <button 
                      onClick={generatePassword} 
                      type="button" 
                      className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100/80 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      Generate Random
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Password" 
                          value={formData.password} 
                          onChange={e => setFormData({...formData, password: e.target.value})} 
                          className={`w-full pl-10 pr-10 py-2.5 bg-white border ${formErrors.password ? 'border-red-400' : 'border-slate-200'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all`} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.password && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.password}</p>}
                    </div>

                    <div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Confirm Password" 
                          value={formData.confirmPassword} 
                          onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                          className={`w-full pl-10 pr-10 py-2.5 bg-white border ${formErrors.confirmPassword ? 'border-red-400' : 'border-slate-200'} rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all`} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned Packages Dropdown Selector */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Packages <span className="text-red-500">*</span>
                </label>
                
                {/* Custom Multi-Select Dropdown Trigger */}
                <div 
                  onClick={() => setPkgDropdownOpen(!pkgDropdownOpen)}
                  className={`w-full min-h-11.5 px-3.5 py-2 bg-slate-50/50 hover:bg-slate-50 border ${formErrors.assignedPackages ? 'border-red-400 bg-red-50/20' : pkgDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white' : 'border-slate-200'} rounded-xl text-sm transition-all cursor-pointer flex items-center justify-between gap-2`}
                >
                  <div className="flex flex-wrap gap-1.5 items-center flex-1 py-0.5 max-h-24 overflow-y-auto">
                    {selectedPackages.length === 0 ? (
                      <span className="text-slate-400 text-sm">Select process type packages...</span>
                    ) : (
                      selectedPackages.map(pkgId => {
                        const pkg = processTypes.find(p => p.id === pkgId);
                        return (
                          <span 
                            key={pkgId} 
                            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200/70 shadow-xs group"
                          >
                            <span>{pkg?.name || pkgId}</span>
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPackages(prev => prev.filter(id => id !== pkgId));
                              }} 
                              className="p-0.5 hover:bg-blue-200/60 rounded-md text-blue-500 hover:text-blue-800 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-slate-400">
                    {selectedPackages.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {selectedPackages.length}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${pkgDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </div>
                </div>

                {formErrors.assignedPackages && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    {formErrors.assignedPackages}
                  </p>
                )}

                {/* Dropdown Popover */}
                {pkgDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setPkgDropdownOpen(false)} />
                    
                    <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Search process packages..." 
                          value={pkgSearch}
                          onChange={(e) => setPkgSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>

                      {processTypes.length > 0 && (
                        <div className="flex items-center justify-between px-1 py-1 border-b border-slate-100 text-xs text-slate-500">
                          <span>{filteredProcessTypes.length} Available Packages</span>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPackages(processTypes.map(p => p.id));
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              Select All
                            </button>
                            <span>•</span>
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPackages([]);
                              }}
                              className="text-slate-500 hover:text-slate-700 font-medium hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {processLoading ? (
                          <div className="text-center text-slate-400 py-6 text-xs flex items-center justify-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Loading Process Types...
                          </div>
                        ) : processError ? (
                          <div className="text-red-500 text-xs py-4 text-center">{processError}</div>
                        ) : filteredProcessTypes.length === 0 ? (
                          <div className="text-slate-500 text-xs py-6 text-center px-4">
                            {pkgSearch ? "No matching process packages found." : "No active Process Types found. Please create Process Types in Master Configuration."}
                          </div>
                        ) : (
                          filteredProcessTypes.map(pkg => {
                            const isSelected = selectedPackages.includes(pkg.id);
                            return (
                              <div 
                                key={pkg.id} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPackages(prev => 
                                    isSelected ? prev.filter(id => id !== pkg.id) : [...prev, pkg.id]
                                  );
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs font-medium transition-all ${isSelected ? 'bg-blue-50 text-blue-900 border border-blue-100 font-semibold' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-3" />}
                                  </div>
                                  <span className="truncate">{pkg.name}</span>
                                </div>
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">
                                    Selected
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Account Status Switch */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Account Status</p>
                    <p className="text-[11px] text-slate-500">Allow this agency user to login and access assigned process packages.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex justify-end gap-3">
              <button 
                disabled={submitting} 
                onClick={() => setModal(null)} 
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-white hover:border-slate-300 text-slate-700 transition-all bg-slate-100/80 shadow-xs"
              >
                Cancel
              </button>
              <button 
                disabled={submitting} 
                onClick={modal === "create" ? handleCreate : handleUpdate} 
                className="px-6 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {modal === "create" ? "Create Account" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "view" && selectedAgency && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Agency Details</h2>
                  <p className="text-xs text-slate-300">View account credentials & assigned packages</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Username</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedAgency.username}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Email Address</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedAgency.email}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
                  <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedAgency.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedAgency.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {selectedAgency.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Created Date</p>
                  <p className="text-xs font-medium text-slate-700 mt-1">{new Date(selectedAgency.createdAt).toLocaleString()}</p>
                </div>
                <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Last Login</p>
                  <p className="text-xs font-medium text-slate-700 mt-1">{selectedAgency.lastLogin ? new Date(selectedAgency.lastLogin).toLocaleString() : 'Never'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Assigned Process Packages</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgency.assignedPackages.map(p => (
                    <span key={p.processTypeId} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/70 rounded-lg text-xs font-medium">
                      {p.processType.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setModal(null)} className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-100 text-slate-700 transition-all shadow-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === "reset" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-linear-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Reset Agency Password</h2>
                  <p className="text-xs text-amber-100 font-normal">Target user: <span className="font-semibold">{selectedAgency?.username}</span></p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-amber-200 hover:text-white text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-end">
                <button 
                  onClick={generatePassword} 
                  type="button" 
                  className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Generate Random Password
                </button>
              </div>
              <div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="New Password" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border ${formErrors.password ? 'border-red-400' : 'border-slate-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all`} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.password}</p>}
              </div>

              <div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Confirm New Password" 
                    value={formData.confirmPassword} 
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border ${formErrors.confirmPassword ? 'border-red-400' : 'border-slate-200'} rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all`} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.confirmPassword}</p>}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button disabled={submitting} onClick={() => setModal(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-100 text-slate-700 shadow-xs">Cancel</button>
              <button disabled={submitting} onClick={handleResetPassword} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2">
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />} Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Delete Agency Account?</h2>
              <p className="text-xs text-slate-500">Are you sure you want to delete <span className="font-semibold text-slate-800">{selectedAgency?.username}</span>? This action is permanent.</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button disabled={submitting} onClick={() => setModal(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-100 text-slate-700 shadow-xs">Cancel</button>
              <button disabled={submitting} onClick={handleDelete} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2">
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />} Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
