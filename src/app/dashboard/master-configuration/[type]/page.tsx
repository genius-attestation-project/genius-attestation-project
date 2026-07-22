"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { MasterLayout } from "@/features/master-configuration/components/MasterLayout";
import { MasterDataTable } from "@/features/master-configuration/components/MasterDataTable";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Map URL slugs to human-readable titles
const pageTitles: Record<string, string> = {
  "document-types": "Document Types",
  "process-types": "Process Types",
  "customer-types": "Customer Types",
  "lead-sources": "Lead Sources",
  "countries": "Countries",
  "states": "States",
  "cities": "Cities",
  "embassy-list": "Embassy List",
  "services": "Services",
  "payment-modes": "Payment Modes",
  "payment-status": "Payment Status",
  "delivery-locations": "Delivery Locations",
  "document-status": "Document Status",
  "process-status": "Process Status",
  "bm-status": "BM Status",
  "approval-status": "Approval Status",
  "user-designations": "User Designations",
};

export default function MasterConfigurationDynamicPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const router = useRouter();
  const { type: slug } = use(params);
  
  // If it's one of the specific complex configurations (SLA, Holiday, etc.), 
  // they should have their own static page instead of hitting this dynamic generic one.
  // We'll render this generic one for the simple master tables.
  const title = pageTitles[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const [data, setData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeRecords, setActiveRecords] = useState(0);
  const [inactiveRecords, setInactiveRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: "", description: "", isActive: true, sortOrder: 0 });
  const [formLoading, setFormLoading] = useState(false);

  const fetchRecords = async (query = "") => {
    setIsLoading(true);
    try {
      const q = query ? `?query=${encodeURIComponent(query)}` : "";
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
  }, [slug]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: "", description: "", isActive: true, sortOrder: 0 });
    setDrawerOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      isActive: item.isActive,
      sortOrder: item.sortOrder || 0,
    });
    setDrawerOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await fetch(`/api/master-data/${slug}/${item.id}`, { method: "DELETE" });
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
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

  const columns = useMemo(() => [
    { header: "Name", accessorKey: "name" },
    { header: "Description", accessorKey: "description", cell: (item: any) => item.description || "-" },
  ], []);

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
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="rounded-xl border-slate-200/60 bg-slate-50/50 shadow-sm focus:bg-white dark:border-white/10 dark:bg-white/5"
              />
              <Input
                label="Description (Optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl border-slate-200/60 bg-slate-50/50 shadow-sm focus:bg-white dark:border-white/10 dark:bg-white/5"
              />
            </div>
            
            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <label className="flex cursor-pointer items-start gap-3">
                <div className="flex h-6 items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/20 dark:border-white/20 dark:bg-white/5"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Active Status</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Toggle to enable or disable this record globally.</span>
                </div>
              </label>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={formLoading}
            className="w-full rounded-xl bg-blue-600 py-6 text-[15px] font-bold text-white shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] transition-all hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] dark:shadow-[0_4px_14px_0_rgb(59,130,246,0.39)]"
          >
            {formLoading ? "Saving Changes..." : "Save Changes"}
          </Button>
        </form>
      </FormDrawer>
    </>
  );
}
