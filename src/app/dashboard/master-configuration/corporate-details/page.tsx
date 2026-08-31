"use client";

import { useEffect, useState } from "react";
import { MasterLayout } from "@/features/master-configuration/components/MasterLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CorporateDetailFormModal } from "@/features/corporate-details/components/CorporateDetailFormModal";
import { Building2, CheckCircle2, Clock, Download, Eye, FileText, Pencil, Search, Trash2, XCircle } from "lucide-react";

import { AgreementCell } from "@/components/common/AgreementCell";

export default function CorporateDetailsMasterPage() {
  const [data, setData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeRecords, setActiveRecords] = useState(0);
  const [inactiveRecords, setInactiveRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const fetchRecords = async (query = "") => {
    setIsLoading(true);
    try {
      const q = query ? `?query=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/master-data/corporate-details${q}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.items || []);
        setTotalRecords(json.total || 0);
        setActiveRecords(json.activeCount || 0);
        setInactiveRecords(json.inactiveCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords(searchQuery);
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await fetch(`/api/master-data/corporate-details/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        fetchRecords(searchQuery);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this corporate detail record?")) return;
    try {
      const res = await fetch(`/api/master-data/corporate-details/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRecords(searchQuery);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderApprovalBadge = (status: string) => {
    if (status === "Approved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 size={12} /> Approved
        </span>
      );
    }
    if (status === "Rejected") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300">
          <XCircle size={12} /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300">
        <Clock size={12} /> Pending Approval
      </span>
    );
  };

  return (
    <MasterLayout
      title="Corporate Details"
      description="Manage registered companies, contact persons, agreements, and approval statuses."
      totalRecords={totalRecords}
      activeRecords={activeRecords}
      inactiveRecords={inactiveRecords}
      onAdd={() => {
        setEditingItem(null);
        setModalOpen(true);
      }}
      onRefresh={() => fetchRecords(searchQuery)}
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search company name, contact person, mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f1115]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 uppercase text-slate-500 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="p-3">Company Name</th>
                <th className="p-3">Contact Person</th>
                <th className="p-3">Mobile / Email</th>
                <th className="p-3">Agreement</th>
                <th className="p-3">Approval Status</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading Corporate Details...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No Corporate Details found. Click "Add New" to create one.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                      {item.companyName}
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {item.contactPersonName}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      <div>{item.contactPersonMobile}</div>
                      {item.email && <div className="text-[10px] text-slate-400">{item.email}</div>}
                    </td>
                    <td className="p-3">
                      <AgreementCell file={item.agreementFile} />
                    </td>
                    <td className="p-3">{renderApprovalBadge(item.approvalStatus)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setModalOpen(true);
                          }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Corporate Detail Modal */}
        <CorporateDetailFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => fetchRecords(searchQuery)}
          initialData={editingItem}
          title={editingItem ? "Edit Corporate Details" : "Add Corporate Details"}
        />
      </div>
    </MasterLayout>
  );
}
