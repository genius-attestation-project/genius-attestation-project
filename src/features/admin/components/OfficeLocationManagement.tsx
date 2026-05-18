"use client";

import { MapPinHouse, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { officeLocations } from "@/features/admin/data/admin.data";

export function OfficeLocationManagement() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Office Location Module"
        title="Global office location management"
        description="Maintain office names, locations, timezones, staffing totals, and active site status in one premium workspace."
        actions={
          <Button onClick={() => setIsDrawerOpen(true)}>
            <Plus size={16} />
            Add Office
          </Button>
        }
      />

      <DashboardCard title="Office Directory" description="Location visibility with timezone and staffing context.">
        <DataTable
          keyField="id"
          rows={officeLocations}
          columns={[
            {
              key: "officeName",
              label: "Office",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    <MapPinHouse size={18} />
                  </span>
                  <div>
                    <p className="font-extrabold">{String(row.officeName)}</p>
                    <p className="text-sm text-soft">{String(row.location)}</p>
                  </div>
                </div>
              ),
            },
            { key: "timezone", label: "Timezone" },
            { key: "employees", label: "Employees" },
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
        title="Add Office Location"
        description="Responsive drawer form for new office metadata."
      >
        <form className="grid gap-4">
          <Input label="Office Name" name="officeName" placeholder="Kochi HQ" />
          <Input label="Location" name="location" placeholder="Kochi, India" />
          <Input label="Timezone" name="timezone" placeholder="Asia/Kolkata" />
          <Input label="Employees" name="employees" placeholder="0" />
          <div className="mt-2 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Office</Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}
