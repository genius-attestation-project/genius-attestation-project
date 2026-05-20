"use client";

import { Edit3, Plus, Trash2, UserCog, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import type {
  DepartmentRow,
  RoleOption,
  UserAccessRow,
} from "@/features/admin/types/rbac.types";
import { getInitials } from "@/utils/format";

type UserFormState = {
  name: string;
  email: string;
  department: string;
  officeLocation: string;
  roleId: string;
  isActive: boolean;
};

const defaultFormState: UserFormState = {
  name: "",
  email: "",
  department: "",
  officeLocation: "",
  roleId: "",
  isActive: true,
};

export function UsersManagement() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [users, setUsers] = useState<UserAccessRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [editingUser, setEditingUser] = useState<UserAccessRow | null>(null);
  const [formState, setFormState] = useState<UserFormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesQuery =
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          user.department.toLowerCase().includes(query.toLowerCase()) ||
          user.role.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || user.status === statusFilter;

        return matchesQuery && matchesStatus;
      }),
    [query, statusFilter, users],
  );

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const [usersResponse, departmentsResponse] = await Promise.all([
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/departments", { cache: "no-store" }),
      ]);
      const payload = (await usersResponse.json()) as {
        users?: UserAccessRow[];
        roles?: RoleOption[];
        message?: string;
      };
      const departmentsPayload = (await departmentsResponse.json()) as {
        departments?: DepartmentRow[];
        message?: string;
      };

      if (!usersResponse.ok) {
        throw new Error(payload.message ?? "Unable to load users.");
      }

      if (!departmentsResponse.ok) {
        throw new Error(departmentsPayload.message ?? "Unable to load departments.");
      }

      setUsers(payload.users ?? []);
      setRoles(payload.roles ?? []);
      setDepartments(departmentsPayload.departments ?? []);
    } catch (loadError) {
      console.error("Failed to load users", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDrawer() {
    setEditingUser(null);
    setFormState(defaultFormState);
    setIsDrawerOpen(true);
  }

  function openEditDrawer(user: UserAccessRow) {
    setEditingUser(user);
    setFormState({
      name: user.name,
      email: user.email,
      department: user.department === "-" ? "" : user.department,
      officeLocation: user.officeLocation === "-" ? "" : user.officeLocation,
      roleId: user.roleId ?? "",
      isActive: user.status === "Active",
    });
    setIsDrawerOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(editingUser ? `/api/users/${editingUser.id}` : "/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save user.");
      }

      if (formState.roleId && editingUser) {
        await fetch(`/api/users/${editingUser.id}/role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleId: formState.roleId }),
        });
      }

      await loadUsers();
      setIsDrawerOpen(false);
    } catch (submitError) {
      console.error("Failed to save user", submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to save user.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: UserAccessRow) {
    const shouldDelete = window.confirm(`Delete user "${user.name}"?`);

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete user.");
      }

      await loadUsers();
    } catch (deleteError) {
      console.error("Failed to delete user", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete user.");
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Users Module"
        title="Enterprise user management"
        description="Search, review, and organize users with live role assignment and database-backed access control."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus size={16} />
            Add User
          </Button>
        }
      />

      {error ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </DashboardCard>
      ) : null}

      <DashboardCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <SearchBar
              placeholder="Search users, email, department, or role"
              className="w-full md:max-w-md"
              onSearch={setQuery}
            />
            <FilterDropdown
              label="Status"
              options={[
                { label: "All", value: "all" },
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
              ]}
              onChange={setStatusFilter}
            />
          </div>
          <p className="text-sm font-semibold text-soft">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      </DashboardCard>

      <DashboardCard title="Users Directory" description="Live users, roles, and assignment status.">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="User records will appear here once they are added to the workspace."
            action={<Button onClick={openCreateDrawer}>Add User</Button>}
          />
        ) : (
          <>
            <DataTable
              keyField="id"
              rows={filteredUsers}
              columns={[
                {
                  key: "name",
                  label: "User",
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-sm font-extrabold text-white">
                        {getInitials(String(row.name), String(row.email))}
                      </span>
                      <div>
                        <p className="font-extrabold">{String(row.name)}</p>
                        <p className="text-sm text-soft">{String(row.email)}</p>
                      </div>
                    </div>
                  ),
                },
                { key: "role", label: "Role" },
                { key: "department", label: "Department" },
                { key: "officeLocation", label: "Office" },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        row.status === "Active"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10"
                          : "bg-slate-500/10 text-slate-600"
                      }`}
                    >
                      {String(row.status)}
                    </button>
                  ),
                },
                { key: "lastLogin", label: "Last Login" },
                { key: "createdDate", label: "Created" },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => {
                    const user = row as UserAccessRow;

                    return (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDrawer(user)}>
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="secondary" size="icon" onClick={() => openEditDrawer(user)}>
                          <UserCog size={16} />
                        </Button>
                        <Button variant="danger" size="icon" onClick={() => void handleDelete(user)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
            />
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-soft">
              <p>Pagination: 1 of 1</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </DashboardCard>

      <FormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingUser ? "Edit User" : "Add User"}
        description="Manage user profile details and assign an RBAC role."
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            name="name"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            placeholder="Enter full name"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formState.email}
            onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
            placeholder="name@company.com"
          />
          <label className="grid gap-2">
            <span className="text-sm font-bold">Role</span>
            <select
              value={formState.roleId}
              onChange={(event) => setFormState((current) => ({ ...current, roleId: event.target.value }))}
              className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm outline-none focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold">Department</span>
            <select
              value={formState.department}
              onChange={(event) =>
                setFormState((current) => ({ ...current, department: event.target.value }))
              }
              className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm outline-none focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Office Location"
            name="officeLocation"
            value={formState.officeLocation}
            onChange={(event) =>
              setFormState((current) => ({ ...current, officeLocation: event.target.value }))
            }
            placeholder="Kochi HQ"
          />
          <label className="inline-flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((current) => ({ ...current, isActive: event.target.checked }))
              }
              className="h-4 w-4 rounded border-[color:var(--border)] text-blue-600 focus:ring-blue-500"
            />
            Active User
          </label>
          <div className="mt-2 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}
