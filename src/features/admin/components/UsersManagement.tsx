"use client";

import { Edit3, Plus, Trash2, UserCog } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { users } from "@/features/admin/data/admin.data";
import { getInitials } from "@/utils/format";

export function UsersManagement() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesQuery =
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          user.department.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || user.status === statusFilter;

        return matchesQuery && matchesStatus;
      }),
    [query, statusFilter],
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Users Module"
        title="Enterprise user management"
        description="Search, review, and organize users with premium table controls, role assignment visibility, and drawer-based forms."
        actions={
          <Button onClick={() => setIsDrawerOpen(true)}>
            <Plus size={16} />
            Add User
          </Button>
        }
      />

      <DashboardCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <SearchBar
              placeholder="Search users, email, or department"
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

      <DashboardCard title="Users Directory" description="Modern table with ownership, role, and location context.">
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
              render: () => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit3 size={16} />
                  </Button>
                  <Button variant="secondary" size="icon">
                    <UserCog size={16} />
                  </Button>
                  <Button variant="danger" size="icon">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ),
            },
          ]}
        />
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-soft">
          <p>Pagination: 1 of 1</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              Previous
            </Button>
            <Button variant="secondary" size="sm">
              Next
            </Button>
          </div>
        </div>
      </DashboardCard>

      <FormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add User"
        description="Drawer-based form pattern for onboarding new workspace users."
      >
        <form className="grid gap-4">
          <Input label="Full Name" name="name" placeholder="Enter full name" />
          <Input label="Email" name="email" type="email" placeholder="name@company.com" />
          <Input label="Role" name="role" placeholder="Admin / Sales Lead / Supervisor" />
          <Input label="Department" name="department" placeholder="Operations" />
          <Input label="Office Location" name="officeLocation" placeholder="Kochi HQ" />
          <div className="mt-2 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}
