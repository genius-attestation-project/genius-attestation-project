"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { MasterLayout } from "@/features/master-configuration/components/MasterLayout";
import { MasterDataTable } from "@/features/master-configuration/components/MasterDataTable";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

// Map URL slugs to human-readable titles
const pageTitles: Record<string, string> = {
  "document-types": "Document Types",
  "document-type-categories": "Document Type Categories",
  "process-types": "Process Types",
  "sub-packages": "Sub Packages",
  "customer-types": "Customer Types",
  "lead-sources": "Lead Sources",
  "embassy-list": "Embassy List",
  "services": "Services",
  "process-status": "Process Status",
  "approval-status": "Approval Status",
};

export default function MasterConfigurationDynamicPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const router = useRouter();
  const { type: slug } = use(params);
  
  const isDocumentType = slug === "document-types";
  const isDocumentTypeCategory = slug === "document-type-categories";
  const isProcessType = slug === "process-types";
  const isSubPackage = slug === "sub-packages";
  const title = pageTitles[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const [data, setData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeRecords, setActiveRecords] = useState(0);
  const [inactiveRecords, setInactiveRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Available Sub Packages for Process Types selection
  const [availableSubPackages, setAvailableSubPackages] = useState<any[]>([]);
  const [selectedSubPackageIds, setSelectedSubPackageIds] = useState<string[]>([]);
  const [selectedCoreSubPackageId, setSelectedCoreSubPackageId] = useState("");
  const [corePackageFilter, setCorePackageFilter] = useState("");
  const [subPackageSearch, setSubPackageSearch] = useState("");

  // Available Categories for Document Types selection
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  const [formData, setFormData] = useState({ name: "", category: "General", categoryId: "", description: "", isActive: true, sortOrder: 0 });
  const [formLoading, setFormLoading] = useState(false);

  const fetchRecords = async (query = "") => {
    setIsLoading(true);
    try {
      const paramsArr = [];
      if (query) paramsArr.push(`query=${encodeURIComponent(query)}`);
      if (isProcessType && corePackageFilter) paramsArr.push(`coreSubPackageId=${encodeURIComponent(corePackageFilter)}`);
      const q = paramsArr.length > 0 ? `?${paramsArr.join("&")}` : "";
      const res = await fetch(`/api/master-data/${slug}${q}`);
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
    if (isProcessType) {
      fetch("/api/master-data/sub-packages?active=true")
        .then((res) => res.json())
        .then((json) => setAvailableSubPackages(json.items || []))
        .catch(console.error);
    }
    if (isDocumentType) {
      fetch("/api/master-data/document-type-categories?active=true")
        .then((res) => res.json())
        .then((json) => setAvailableCategories(json.items || []))
        .catch(console.error);
    }
  }, [slug, isProcessType, isDocumentType]);

  // Refetch when Core Package filter changes
  useEffect(() => {
    if (isProcessType) {
      fetchRecords(searchQuery);
    }
  }, [corePackageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: "", category: isDocumentType ? "" : "General", categoryId: "", description: "", isActive: true, sortOrder: 0 });
    setSelectedSubPackageIds([]);
    setSelectedCoreSubPackageId("");
    setDrawerOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || "General",
      categoryId: item.categoryId || item.categoryRel?.id || "",
      description: item.description || "",
      isActive: item.isActive,
      sortOrder: item.sortOrder || 0,
    });
    if (isProcessType) {
      setSelectedCoreSubPackageId(item.coreSubPackageId || item.coreSubPackage?.id || "");
      if (Array.isArray(item.subPackages)) {
        setSelectedSubPackageIds(item.subPackages.map((sp: any) => sp.id));
      } else {
        setSelectedSubPackageIds([]);
      }
    } else {
      setSelectedSubPackageIds([]);
      setSelectedCoreSubPackageId("");
    }
    setDrawerOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/master-data/${slug}/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Failed to delete item.");
        return;
      }
      fetchRecords(searchQuery);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      await fetch(`/api/master-data/${slug}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      fetchRecords(searchQuery);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = editingItem 
        ? `/api/master-data/${slug}/${editingItem.id}` 
        : `/api/master-data/${slug}`;
      const method = editingItem ? "PUT" : "POST";
      
      const payload: any = {
        ...formData,
        name: formData.name.trim(),
        category: isDocumentType ? formData.category.trim() : (formData.category || "General").trim(),
        categoryId: isDocumentType ? formData.categoryId : undefined,
      };

      if (isProcessType) {
        payload.subPackageIds = selectedSubPackageIds;
        payload.coreSubPackageId = selectedCoreSubPackageId || null;
      }

      if (isDocumentType && !payload.category && !payload.categoryId) {
        alert("Category is required.");
        setFormLoading(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDrawerOpen(false);
        fetchRecords(searchQuery);
      } else {
        const error = await res.json();
        alert(error.message || "An error occurred");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredAvailableSubPackages = useMemo(() => {
    if (!subPackageSearch.trim()) return availableSubPackages;
    const term = subPackageSearch.toLowerCase().trim();
    return availableSubPackages.filter((sp) => sp.name.toLowerCase().includes(term));
  }, [availableSubPackages, subPackageSearch]);

  const columns = useMemo(() => {
    const cols: Array<{ header: string; accessorKey: string; cell?: (item: any) => React.ReactNode }> = [
      { 
        header: isSubPackage 
          ? "Sub Package Name" 
          : isDocumentTypeCategory
          ? "Category Name"
          : isProcessType 
          ? "Process Type" 
          : "Name", 
        accessorKey: "name" 
      },
    ];

    if (isDocumentType) {
      cols.push({
        header: "Category",
        accessorKey: "category",
        cell: (item: any) => (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
            {item.categoryRel?.name || item.category || "General"}
          </span>
        ),
      });
    }

    if (isProcessType) {
      cols.push({
        header: "Core Package",
        accessorKey: "coreSubPackage",
        cell: (item: any) => {
          const core = item.coreSubPackage;
          if (!core) return <span className="text-xs text-slate-400">-</span>;
          const isInactive = !core.isActive;
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
              isInactive
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            }`}>
              {core.name}
              {isInactive ? " (Inactive)" : ""}
            </span>
          );
        },
      });

      cols.push({
        header: "Sub Packages",
        accessorKey: "subPackages",
        cell: (item: any) => {
          const subs = item.subPackages || [];
          if (subs.length === 0) return <span className="text-xs text-slate-400">-</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {subs.map((sp: any) => (
                <span
                  key={sp.id}
                  className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                >
                  {sp.name}
                </span>
              ))}
            </div>
          );
        },
      });
    }

    cols.push({ header: "Description", accessorKey: "description", cell: (item: any) => item.description || "-" });

    if (isSubPackage || isDocumentTypeCategory) {
      cols.push({
        header: "Created Date",
        accessorKey: "createdAt",
        cell: (item: any) => (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"),
      });
    }

    return cols;
  }, [isDocumentType, isDocumentTypeCategory, isProcessType, isSubPackage]);

  return (
    <>
      <MasterLayout
        title={title}
        description={`Manage ${title.toLowerCase()} configurations and master lists.`}
        totalRecords={totalRecords}
        activeRecords={activeRecords}
        inactiveRecords={inactiveRecords}
        onAdd={handleAdd}
        onRefresh={() => fetchRecords(searchQuery)}
      >
        <MasterDataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          filterComponent={
            isProcessType ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Core Package:</span>
                <select
                  value={corePackageFilter}
                  onChange={(e) => setCorePackageFilter(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="">All Core Packages</option>
                  {availableSubPackages.map((sp: any) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : undefined
          }
        />
      </MasterLayout>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="center"
        title={editingItem ? `Edit ${title} Entry` : `Add New ${title} Entry`}
        description={`Fill out the details below to ${editingItem ? "update" : "create"} a ${title.toLowerCase()} entry.`}
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6 pt-2">
          <div className="space-y-6">
            <div className="space-y-4">
              <Input
                label={isSubPackage ? "Sub Package Name" : isDocumentTypeCategory ? "Category Name" : "Name"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                maxLength={100}
                className="rounded-xl border-slate-200/60 bg-slate-50/50 shadow-sm focus:bg-white dark:border-white/10 dark:bg-white/5"
              />

              {isDocumentType && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-900 dark:text-white">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId || ""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const cat = availableCategories.find(c => c.id === selectedId);
                      setFormData({
                        ...formData,
                        categoryId: selectedId,
                        category: cat ? cat.name : formData.category,
                      });
                    }}
                    required
                    className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 p-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Select Category...</option>
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isProcessType && editingItem?.coreSubPackage && !editingItem.coreSubPackage.isActive && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                  ⚠️ <strong>Warning:</strong> The selected Core Package ("{editingItem.coreSubPackage.name}") is currently inactive in Master Configuration → Sub Packages.
                </div>
              )}

              {isProcessType && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-900 dark:text-white">
                      Core Package
                    </label>
                    <SearchableSelect
                      options={availableSubPackages.map((sp: any) => ({
                        label: sp.name + (!sp.isActive ? " (Inactive)" : ""),
                        value: sp.id,
                      }))}
                      value={selectedCoreSubPackageId}
                      onChange={(val) => setSelectedCoreSubPackageId(val)}
                      placeholder="Select Core Package"
                      emptyMessage="No Sub Packages found."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900 dark:text-white">
                      Sub Packages
                    </label>
                    <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-white/5">
                      <input
                        type="text"
                        placeholder="Search sub packages..."
                        value={subPackageSearch}
                        onChange={(e) => setSubPackageSearch(e.target.value)}
                        className="mb-2.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {filteredAvailableSubPackages.length === 0 ? (
                          <p className="py-2 text-center text-xs text-slate-400">No active sub packages found.</p>
                        ) : (
                          filteredAvailableSubPackages.map((sp) => {
                            const isChecked = selectedSubPackageIds.includes(sp.id);
                            return (
                              <label
                                key={sp.id}
                                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer dark:text-slate-200 dark:hover:bg-white/10"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSubPackageIds([...selectedSubPackageIds, sp.id]);
                                    } else {
                                      setSelectedSubPackageIds(selectedSubPackageIds.filter((id) => id !== sp.id));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                {sp.name}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl border-slate-200/60 bg-slate-50/50 shadow-sm focus:bg-white dark:border-white/10 dark:bg-white/5"
              />

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active Status
                </label>
              </div>
            </div>
          </div>

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
              {formLoading ? "Saving..." : editingItem ? "Save Changes" : "Create Entry"}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </>
  );
}
