"use client";

import { AlertCircle, BriefcaseBusiness, Edit3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import type { DepartmentRow } from "@/features/admin/types/rbac.types";

export function DepartmentManagement() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRow | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadDepartments();
  }, []);

  async function loadDepartments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/departments", { cache: "no-store" });
      const payload = (await response.json()) as {
        departments?: DepartmentRow[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load departments.");
      }

      setDepartments(payload.departments ?? []);
    } catch (loadError) {
      console.error("Failed to load departments", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load departments.");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDrawer() {
    setEditingDepartment(null);
    setDepartmentName("");
    setError("");
    setIsDrawerOpen(true);
  }

  function openEditDrawer(department: DepartmentRow) {
    setEditingDepartment(department);
    setDepartmentName(department.name);
    setError("");
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingDepartment(null);
    setDepartmentName("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = departmentName.trim();

    if (!name) {
      setError("Department name is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        editingDepartment ? `/api/departments/${editingDepartment.id}` : "/api/departments",
        {
          method: editingDepartment ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to save department.");
      }

      await loadDepartments();
      closeDrawer();
    } catch (submitError) {
      console.error("Failed to save department", submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to save department.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(department: DepartmentRow) {
    const shouldDelete = window.confirm(`Delete department "${department.name}"?`);

    if (!shouldDelete) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/departments/${department.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete department.");
      }

      await loadDepartments();
    } catch (deleteError) {
      console.error("Failed to delete department", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete department.");
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Department Module"
        title="Department management"
        description="Create and maintain departments for this workspace."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus size={16} />
            Add Department
          </Button>
        }
      />

      {error ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </DashboardCard>
      ) : null}

      <DashboardCard title="Department Directory" description="Database-backed departments for this workspace.">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load departments"
            description={error}
            action={<Button onClick={() => void loadDepartments()}>Retry</Button>}
          />
        ) : departments.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No departments found"
            description="Departments created for this workspace will appear here."
            action={<Button onClick={openCreateDrawer}>Add Department</Button>}
          />
        ) : (
          <DataTable
            keyField="id"
            rows={departments}
            columns={[
              {
                key: "name",
                label: "Department Name",
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                      <BriefcaseBusiness size={18} />
                    </span>
                    <p className="font-extrabold">{String(row.name)}</p>
                  </div>
                ),
              },
              { key: "createdDate", label: "Created Date" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => {
                  const department = row as DepartmentRow;

                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDrawer(department)}
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        variant="danger"
                        size="icon"
                        onClick={() => void handleDelete(department)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </DashboardCard>

      <FormDrawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        title={editingDepartment ? "Edit Department" : "Add Department"}
        description="Save the department name for this workspace."
        placement="center"
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            label="Department Name"
            name="name"
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
            placeholder="Operations"
            required
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Department"}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}
