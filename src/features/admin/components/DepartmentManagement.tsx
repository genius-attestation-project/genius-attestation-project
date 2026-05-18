"use client";

import { BriefcaseBusiness, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { departments } from "@/features/admin/data/admin.data";

export function DepartmentManagement() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Department Module"
        title="Department structure and ownership"
        description="Track codes, managers, employee counts, and current operating status with a clean enterprise table."
        actions={
          <Button onClick={() => setIsDrawerOpen(true)}>
            <Plus size={16} />
            Add Department
          </Button>
        }
      />

      <DashboardCard title="Department Directory" description="Operations, finance, support, and revenue structure at a glance.">
        <DataTable
          keyField="id"
          rows={departments}
          columns={[
            {
              key: "name",
              label: "Department",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                    <BriefcaseBusiness size={18} />
                  </span>
                  <div>
                    <p className="font-extrabold">{String(row.name)}</p>
                    <p className="text-sm text-soft">Code {String(row.code)}</p>
                  </div>
                </div>
              ),
            },
            { key: "manager", label: "Manager" },
            { key: "employeeCount", label: "Employees" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-600 dark:bg-blue-500/10">
                  {String(row.status)}
                </span>
              ),
            },
          ]}
        />
      </DashboardCard>

      <FormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add Department"
        description="Use the consistent form drawer to add new department records."
      >
        <form className="grid gap-4">
          <Input label="Department Name" name="name" placeholder="Operations" />
          <Input label="Code" name="code" placeholder="OPS" />
          <Input label="Manager" name="manager" placeholder="Manager name" />
          <Input label="Employee Count" name="employeeCount" placeholder="0" />
          <div className="mt-2 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Department</Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}
