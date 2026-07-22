"use client";

import { useEffect, useState, useMemo } from "react";
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
  params: { type: string };
}) {
  const router = useRouter();
  const slug = params.type;
  
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
        title={editingItem ? `Edit ${title} Entry` : `Add New ${title} Entry`}
        description={`Fill out the details below to ${editingItem ? "update" : "create"} a ${title.toLowerCase()} entry.`}
      >
        <form onSubmit={handleFormSubmit} className="flex h-full flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Is Active
            </label>
          </div>
          <div className="border-t p-6">
            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </>
  );
}
