"use client";

import { Check, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { permissionMatrix, roles } from "@/features/admin/data/admin.data";

export function RolesManagement() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Roles Module"
        title="RBAC and permission matrix"
        description="Manage role badges, module access, sidebar permissions, and visibility across the ERP workspace."
        actions={
          <Button onClick={() => setIsDrawerOpen(true)}>
            <Plus size={16} />
            Create Role
          </Button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Role Library" description="Role definitions with primary access surfaces.">
          <div className="grid gap-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-[24px] border border-[color:var(--border)] bg-white/60 p-4 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold">{role.name}</p>
                    <p className="mt-1 text-sm text-soft">{role.users} assigned users</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-600 dark:bg-blue-500/10">
                    {role.badge}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {role.access.map((access) => (
                    <span
                      key={access}
                      className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-bold text-soft"
                    >
                      {access}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Permission Matrix" description="Module and sidebar access visibility by role.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-extrabold uppercase tracking-[0.22em] text-soft">
                <tr>
                  <th className="px-4 py-3">Permission</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Sales Lead</th>
                  <th className="px-4 py-3">Support Supervisor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {permissionMatrix.map((row) => (
                  <tr key={row.permission}>
                    <td className="px-4 py-4 font-extrabold">{row.permission}</td>
                    <PermissionCell enabled={row.admin} />
                    <PermissionCell enabled={row.salesLead} />
                    <PermissionCell enabled={row.supportSupervisor} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </section>

      <FormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Role"
        description="Use the same drawer interaction pattern to add new RBAC groups."
      >
        <form className="grid gap-4">
          <Input label="Role Name" name="name" placeholder="Operations Manager" />
          <Input label="Role Badge" name="badge" placeholder="Core / Revenue / Ops" />
          <Input
            label="Module Access"
            name="access"
            placeholder="Home, Lead Management, Search / Report"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Role</Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}

function PermissionCell({ enabled }: { enabled: boolean }) {
  return (
    <td className="px-4 py-4">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
          enabled ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" : "bg-slate-500/10 text-slate-500"
        }`}
      >
        {enabled ? <Check size={16} /> : <ShieldCheck size={16} />}
      </span>
    </td>
  );
}
