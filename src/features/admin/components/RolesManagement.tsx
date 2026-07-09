"use client";

import { Check, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  permissionModules,
  type PermissionAction,
  permissionActions,
} from "@/features/admin/data/rbac.data";
import type { AccessRoleRow, PermissionRow } from "@/features/admin/types/rbac.types";

type FormState = {
  name: string;
  description: string;
  isActive: boolean;
};

const defaultFormState: FormState = {
  name: "",
  description: "",
  isActive: true,
};

export function RolesManagement() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [roles, setRoles] = useState<AccessRoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<AccessRoleRow | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedPermissionScopes, setSelectedPermissionScopes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const permissionGroups = useMemo(() => {
    const grouped = new Map<string, PermissionRow[]>();

    for (const permission of permissions) {
      const current = grouped.get(permission.module) ?? [];
      current.push(permission);
      grouped.set(permission.module, current);
    }

    return grouped;
  }, [permissions]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        fetch("/api/roles", { cache: "no-store" }),
        fetch("/api/permissions", { cache: "no-store" }),
      ]);
      const rolesPayload = (await rolesResponse.json()) as {
        roles?: AccessRoleRow[];
        message?: string;
      };
      const permissionsPayload = (await permissionsResponse.json()) as {
        permissions?: PermissionRow[];
        message?: string;
      };

      if (!rolesResponse.ok) {
        throw new Error(rolesPayload.message ?? "Unable to load roles.");
      }

      if (!permissionsResponse.ok) {
        throw new Error(permissionsPayload.message ?? "Unable to load permissions.");
      }

      setRoles(rolesPayload.roles ?? []);
      setPermissions(permissionsPayload.permissions ?? []);
    } catch (loadError) {
      console.error("Failed to load roles", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDrawer() {
    setSelectedRole(null);
    setFormState(defaultFormState);
    setSelectedPermissions([]);
    setSelectedPermissionScopes({});
    setIsDrawerOpen(true);
  }

  function openEditDrawer(role: AccessRoleRow) {
    setSelectedRole(role);
    setFormState({
      name: role.name,
      description: role.description,
      isActive: role.isActive,
    });
    setSelectedPermissions([...role.permissions, ...role.menuPermissions]);
    setSelectedPermissionScopes(role.permissionScopes ?? {});
    setIsDrawerOpen(true);
  }

  function togglePermission(code: string) {
    setSelectedPermissions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  function handlePermissionScopeChange(code: string, checked: boolean, scope: string) {
    if (checked) {
      if (!selectedPermissions.includes(code)) {
        setSelectedPermissions((p) => [...p, code]);
      }
      setSelectedPermissionScopes((s) => ({ ...s, [code]: scope }));
    } else {
      setSelectedPermissions((p) => p.filter((x) => x !== code));
      setSelectedPermissionScopes((s) => {
        const next = { ...s };
        delete next[code];
        return next;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const roleResponse = await fetch(selectedRole ? `/api/roles/${selectedRole.id}` : "/api/roles", {
        method: selectedRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const rolePayload = (await roleResponse.json()) as {
        role?: AccessRoleRow;
        message?: string;
      };

      if (!roleResponse.ok || !rolePayload.role) {
        throw new Error(rolePayload.message ?? "Unable to save role.");
      }

      const permissionResponse = await fetch(`/api/roles/${rolePayload.role.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          permissionCodes: selectedPermissions,
          permissionScopes: selectedPermissionScopes,
        }),
      });
      const permissionPayload = (await permissionResponse.json()) as {
        message?: string;
      };

      if (!permissionResponse.ok) {
        throw new Error(permissionPayload.message ?? "Unable to save role permissions.");
      }

      await loadData();
      setIsDrawerOpen(false);
      setSelectedRole(null);
    } catch (submitError) {
      console.error("Failed to save role", submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to save role.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(role: AccessRoleRow) {
    const shouldDelete = window.confirm(`Delete role "${role.name}"?`);

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete role.");
      }

      await loadData();
    } catch (deleteError) {
      console.error("Failed to delete role", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete role.");
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Roles Module"
        title="RBAC and permission matrix"
        description="Manage real roles, module access, sidebar permissions, and page visibility from the database."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus size={16} />
            Create Role
          </Button>
        }
      />

      {error ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </DashboardCard>
      ) : null}

      <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DashboardCard title="Role Library" description="Database-backed role definitions and access surfaces.">
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingSkeleton key={index} className="h-36 w-full" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Roles Found"
              description="Create your first role to start assigning permissions and menu access."
              action={<Button onClick={openCreateDrawer}>Create Role</Button>}
            />
          ) : (
            <div className="grid gap-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="min-w-0 rounded-2xl border border-(--border) bg-white/60 p-4 sm:rounded-[24px] dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-extrabold">{role.name}</p>
                      <p className="mt-1 text-sm text-soft">{role.userCount} assigned users</p>
                      <p className="mt-2 text-sm leading-6 text-soft">
                        {role.description || "No description provided."}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        role.isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10"
                          : "bg-slate-100 text-slate-600 dark:bg-white/10"
                      }`}
                    >
                      {role.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.permissions.slice(0, 8).map((permission) => (
                      <span
                        key={permission}
                        className="rounded-full border border-(--border) px-3 py-1 text-xs font-bold text-soft"
                      >
                        {permission}
                      </span>
                    ))}
                    {role.permissions.length > 8 ? (
                      <span className="rounded-full border border-(--border) px-3 py-1 text-xs font-bold text-soft">
                        +{role.permissions.length - 8} more
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDrawer(role)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="danger" size="icon" onClick={() => void handleDelete(role)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Permission Matrix" description="Role visibility and module capabilities.">
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingSkeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Roles Found"
              description="The permission matrix will appear after roles are created."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] text-left text-sm">
                <thead className="text-xs font-extrabold uppercase tracking-[0.22em] text-soft">
                  <tr>
                    <th className="px-4 py-3">Permission</th>
                    {roles.map((role) => (
                      <th key={role.id} className="px-4 py-3">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="px-4 py-4">
                        <p className="font-extrabold">{permission.name}</p>
                        <p className="text-xs text-soft">{permission.code}</p>
                      </td>
                      {roles.map((role) => {
                        const hasPerm = [...role.permissions, ...role.menuPermissions].includes(permission.code);
                        const scope = role.permissionScopes?.[permission.code] ?? "All";
                        return (
                          <PermissionScopeCell
                            key={`${role.id}-${permission.id}`}
                            enabled={hasPerm}
                            scope={hasPerm ? scope : "None"}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
      </section>

      <FormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedRole ? "Edit Role" : "Create Role"}
        description="Create or update roles, menu visibility, and module permissions."
      >
        <form className="grid min-w-0 gap-4 sm:gap-6" onSubmit={handleSubmit}>
          <Input
            label="Role Name"
            name="name"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            placeholder="Operations Manager"
          />
          <label className="grid gap-2">
            <span className="text-sm font-bold">Description</span>
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-28 min-w-0 rounded-2xl border border-(--border) bg-white/80 px-4 py-3 text-sm outline-none focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
              placeholder="Describe what this role can access."
            />
          </label>
          <label className="inline-flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((current) => ({ ...current, isActive: event.target.checked }))
              }
              className="h-4 w-4 rounded border-(--border) text-blue-600 focus:ring-blue-500"
            />
            Active Role
          </label>

          <div className="grid gap-4">
            <div>
              <p className="text-sm font-bold">Permission Matrix</p>
              <p className="mt-1 text-sm text-soft">
                Toggle page access, module access, and sidebar visibility for this role.
              </p>
            </div>

            {permissionModules.map((moduleDefinition) => {
              const groupPermissions =
                permissionGroups.get(moduleDefinition.label)?.filter(
                  (permission) => !permission.code.startsWith("menu."),
                ) ?? [];

              if (groupPermissions.length === 0) {
                return null;
              }

              return (
                <div
                  key={moduleDefinition.key}
                  className="rounded-2xl border border-(--border) bg-white/70 p-4 dark:bg-white/5"
                >
                  <div className="mb-4">
                    <p className="font-extrabold">{moduleDefinition.label}</p>
                    <p className="text-sm text-soft">{moduleDefinition.description}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {permissionActions.map((action) => {
                      const permission = groupPermissions.find((item) =>
                        item.code.endsWith(`.${action}`),
                      );

                      if (!permission) {
                        return null;
                      }

                      return (
                        <PermissionScopeControl
                          key={permission.code}
                          label={toActionLabel(action)}
                          description={permission.code}
                          action={action}
                          checked={selectedPermissions.includes(permission.code)}
                          scope={selectedPermissionScopes[permission.code] ?? "All"}
                          onChange={(checked) => handlePermissionScopeChange(permission.code, checked, selectedPermissionScopes[permission.code] ?? "All")}
                          onScopeChange={(scope) => handlePermissionScopeChange(permission.code, true, scope)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border border-(--border) bg-white/70 p-4 dark:bg-white/5">
              <div className="mb-4">
                <p className="font-extrabold">Menu Visibility</p>
                <p className="text-sm text-soft">Control sidebar and submenu visibility.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(permissionGroups.get("Menu Visibility") ?? []).map((permission) => (
                  <PermissionToggle
                    key={permission.code}
                    label={permission.name}
                    description={permission.code}
                    checked={selectedPermissions.includes(permission.code)}
                    onChange={() => togglePermission(permission.code)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : selectedRole ? "Update Role" : "Save Role"}
            </Button>
          </div>
        </form>
      </FormDrawer>
    </div>
  );
}

function PermissionScopeCell({ enabled, scope }: { enabled: boolean; scope: string }) {
  if (!enabled || scope === "None") {
    return (
      <td className="px-4 py-4">
        <span className="inline-flex h-9 items-center justify-center rounded-2xl bg-slate-500/10 px-3 text-xs font-bold text-slate-500">
          None
        </span>
      </td>
    );
  }

  return (
    <td className="px-4 py-4">
      <span className="inline-flex h-9 items-center justify-center rounded-2xl bg-blue-50 px-3 text-xs font-bold text-blue-600 dark:bg-blue-500/10">
        {scope}
      </span>
    </td>
  );
}

function PermissionToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-(--border) p-3 cursor-pointer hover:border-blue-500/50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border-(--border) text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-soft">{description}</p>
      </div>
    </label>
  );
}

function PermissionScopeControl({
  label,
  description,
  action,
  checked,
  scope,
  onChange,
  onScopeChange,
}: {
  label: string;
  description: string;
  action: string;
  checked: boolean;
  scope: string;
  onChange: (checked: boolean) => void;
  onScopeChange: (scope: string) => void;
}) {
  const isCheckboxOnly = ["create", "print"].includes(action);

  if (isCheckboxOnly) {
    return (
      <label className="flex items-start gap-3 rounded-2xl border border-(--border) p-3 cursor-pointer hover:border-blue-500/50 transition-colors">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-(--border) text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="text-xs text-soft">{description}</p>
        </div>
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-(--border) p-3 hover:border-blue-500/50 transition-colors">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-soft">{description}</p>
      </div>
      <select
        value={checked ? scope : "None"}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "None") {
            onChange(false);
            onScopeChange("None");
          } else {
            onChange(true);
            onScopeChange(val);
          }
        }}
        className="h-9 w-full rounded-xl border border-(--border) bg-white/50 px-3 text-sm font-bold outline-none focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5 cursor-pointer"
      >
        <option value="None">None</option>
        <option value="Own">Own</option>
        <option value="Assigned">Assigned</option>
        <option value="Created">Created</option>
        <option value="Reporting Staff">Reporting Staff</option>
        <option value="Department">Department</option>
        <option value="Office">Office</option>
        <option value="Process Office">Process Office</option>
        <option value="Team">Team</option>
        <option value="All">All</option>
      </select>
    </div>
  );
}

function toActionLabel(action: PermissionAction) {
  return action[0].toUpperCase() + action.slice(1);
}
