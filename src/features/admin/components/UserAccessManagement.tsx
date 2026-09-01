"use client";

import { Check, Copy, ClipboardPaste, Search, ShieldCheck, UserCheck, Building2, CheckSquare, Square, Save, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";

type UserAccessItem = {
  id: string;
  name: string;
  email: string;
  image: string;
  roleName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  hasUserPermissions: boolean;
  officeLocationIds: string[];
  permissionKeys: string[];
};

type OfficeLocationItem = {
  id: string;
  officeName: string;
  location: string;
  isProcessOffice?: boolean;
  isAssignedOffice?: boolean;
  category?: string;
  sourceType?: string;
};

// Explicit Module Definition catalog for User Access Matrix (maps to real system features)
type ActionDefinition = {
  key: string;
  label: string;
};

type SubModuleDefinition = {
  label: string;
  actions: ActionDefinition[];
};

type ModuleDefinition = {
  key: string;
  label: string;
  subModules?: SubModuleDefinition[];
  actions?: ActionDefinition[];
};

const MODULE_PERMISSIONS_CATALOG: ModuleDefinition[] = [
  {
    key: "revenue_registration",
    label: "REVENUE REGISTRATION",
    actions: [
      { key: "revenue_registration.view", label: "View" },
      { key: "revenue_registration.create", label: "Create" },
      { key: "revenue_registration.edit", label: "Edit" },
      { key: "revenue_registration.delete", label: "Delete" },
      { key: "revenue_registration.import", label: "Import" },
      { key: "revenue_registration.export", label: "Export" },
    ],
  },
  {
    key: "home",
    label: "HOME",
    subModules: [
      {
        label: "Document In Hand",
        actions: [
          { key: "home.document_in_hand.view", label: "View" },
          { key: "home.document_in_hand.transfer", label: "Transfer" },
        ],
      },
      {
        label: "Inbound Bundles",
        actions: [
          { key: "home.inbound.view", label: "View" },
          { key: "home.inbound.receive", label: "Receive" },
          { key: "home.inbound.return", label: "Return" },
        ],
      },
      {
        label: "Outbound Bundles",
        actions: [
          { key: "home.outbound.view", label: "View" },
          { key: "home.outbound.retrieve", label: "Retrieve" },
        ],
      },
      {
        label: "Movement History",
        actions: [{ key: "home.movement_history.view", label: "View" }],
      },
    ],
  },
  {
    key: "process",
    label: "PROCESS MODULE",
    subModules: [
      {
        label: "Document In Hand",
        actions: [
          { key: "process.document_in_hand.view", label: "View" },
          { key: "process.document_in_hand.transfer", label: "Transfer To Assigned Office" },
          { key: "process.document_in_hand.actions", label: "Transfer / Process Actions" },
        ],
      },
      {
        label: "Inbound",
        actions: [
          { key: "process.inbound.view", label: "View" },
          { key: "process.inbound.receive", label: "Receive" },
          { key: "process.inbound.return", label: "Return" },
        ],
      },
      {
        label: "Outbound",
        actions: [
          { key: "process.outbound.view", label: "View" },
          { key: "process.outbound.retrieve", label: "Retrieve" },
        ],
      },
      {
        label: "Bundle Movement",
        actions: [{ key: "process.bundle_movement.view", label: "View" }],
      },
    ],
  },
  {
    key: "ready_for_delivery",
    label: "READY FOR DELIVERY",
    actions: [
      { key: "ready_for_delivery.view", label: "View" },
      { key: "ready_for_delivery.deliver", label: "Deliver" },
    ],
  },
  {
    key: "welcome_call",
    label: "WELCOME CALL",
    actions: [
      { key: "welcome_call.view", label: "View" },
      { key: "welcome_call.complete", label: "Complete" },
    ],
  },
  {
    key: "lead_management",
    label: "LEAD MANAGEMENT",
    subModules: [
      {
        label: "All Leads",
        actions: [
          { key: "leads.view", label: "View" },
          { key: "leads.create", label: "Create" },
          { key: "leads.edit", label: "Edit" },
          { key: "leads.delete", label: "Delete" },
        ],
      },
      {
        label: "Followups",
        actions: [
          { key: "followups.view", label: "View" },
          { key: "followups.manage", label: "Manage" },
        ],
      },
      {
        label: "Assign Leads",
        actions: [
          { key: "assigned_leads.view", label: "View" },
          { key: "assigned_leads.assign", label: "Assign" },
        ],
      },
      {
        label: "LOB",
        actions: [
          { key: "lob.view", label: "View" },
          { key: "lob.request", label: "Request" },
        ],
      },
      {
        label: "Closed Leads",
        actions: [{ key: "closed_leads.view", label: "View" }],
      },
    ],
  },
  {
    key: "pending_approval",
    label: "PENDING APPROVAL",
    actions: [
      { key: "pending_approval.view", label: "View" },
      { key: "pending_approval.approve", label: "Approve" },
      { key: "pending_approval.reject", label: "Reject" },
    ],
  },
  {
    key: "search_report",
    label: "SEARCH / REPORT",
    actions: [
      { key: "search_report.view", label: "View" },
      { key: "search_report.export", label: "Export" },
    ],
  },
  {
    key: "reports",
    label: "REPORTS & ANALYTICS",
    actions: [
      { key: "reports.view", label: "View" },
      { key: "reports.export", label: "Export" },
    ],
  },
  {
    key: "bm_report",
    label: "BM REPORT",
    actions: [
      { key: "bm_report.view", label: "View" },
      { key: "bm_report.export", label: "Export" },
    ],
  },
  {
    key: "assigned_office",
    label: "ASSIGNED OFFICE",
    actions: [
      { key: "assigned_office.view", label: "View" },
      { key: "assigned_office.manage", label: "Manage" },
    ],
  },
  {
    key: "account_modules",
    label: "ACCOUNT MODULES",
    subModules: [
      {
        label: "Account Panel",
        actions: [
          { key: "account_panel.view", label: "View" },
          { key: "account_panel.create", label: "Create" },
        ],
      },
      {
        label: "Account Statements",
        actions: [
          { key: "account_statements.view", label: "View" },
          { key: "account_statements.export", label: "Export" },
        ],
      },
    ],
  },
  {
    key: "attendance",
    label: "ATTENDANCE",
    subModules: [
      {
        label: "Dashboard & Records",
        actions: [{ key: "attendance.view", label: "View" }],
      },
      {
        label: "Check Out",
        actions: [
          { key: "attendance.check_out.view", label: "View" },
          { key: "attendance.check_out.manage", label: "Manage" },
        ],
      },
      {
        label: "Daily Summary",
        actions: [
          { key: "attendance.summary.create", label: "Create" },
          { key: "attendance.summary.view", label: "View Approval" },
        ],
      },
      {
        label: "Settings",
        actions: [{ key: "attendance_settings.manage", label: "Manage Settings" }],
      },
    ],
  },
  {
    key: "leave",
    label: "LEAVE MANAGEMENT",
    subModules: [
      {
        label: "Apply Leave",
        actions: [{ key: "leave.create", label: "Apply" }],
      },
      {
        label: "Requests",
        actions: [{ key: "leave.view", label: "View" }],
      },
      {
        label: "Approval",
        actions: [{ key: "leave.approve", label: "Approve" }],
      },
      {
        label: "Reports",
        actions: [{ key: "leave.report", label: "Report" }],
      },
    ],
  },
  {
    key: "salary",
    label: "SALARY MANAGEMENT",
    subModules: [
      {
        label: "Dashboard",
        actions: [{ key: "salary.view", label: "View" }],
      },
      {
        label: "Calculator",
        actions: [{ key: "salary.calculate", label: "Calculate" }],
      },
      {
        label: "Monthly Payroll",
        actions: [{ key: "salary.generate", label: "Generate" }],
      },
      {
        label: "Reports",
        actions: [{ key: "salary.report", label: "Report" }],
      },
    ],
  },
  {
    key: "master_configuration",
    label: "MASTER CONFIGURATION",
    subModules: [
      {
        label: "General Configurations",
        actions: [
          { key: "master_configuration.view", label: "View" },
          { key: "master_configuration.manage", label: "Manage" },
        ],
      },
      {
        label: "Account Menu",
        actions: [
          { key: "account_menu.view", label: "View" },
          { key: "account_menu.create", label: "Create" },
          { key: "account_menu.update", label: "Update" },
          { key: "account_menu.delete", label: "Delete" },
        ],
      },
    ],
  },
  {
    key: "admin_management",
    label: "ADMIN MANAGEMENT",
    subModules: [
      {
        label: "Users",
        actions: [
          { key: "users.view", label: "View" },
          { key: "users.create", label: "Create" },
          { key: "users.edit", label: "Edit" },
          { key: "users.delete", label: "Delete" },
        ],
      },
      {
        label: "Roles / Access Management",
        actions: [
          { key: "roles.view", label: "View" },
          { key: "access_management.manage_offices", label: "Manage Office Visibility" },
          { key: "access_management.manage_permissions", label: "Manage User Permissions" },
        ],
      },
      {
        label: "Department",
        actions: [
          { key: "departments.view", label: "View" },
          { key: "departments.manage", label: "Manage" },
        ],
      },
      {
        label: "Office Location",
        actions: [
          { key: "office_locations.view", label: "View" },
          { key: "office_locations.manage", label: "Manage" },
        ],
      },
    ],
  },
];

export function UserAccessManagement() {
  const [activeTab, setActiveTab] = useState<"offices" | "permissions">("offices");
  const [users, setUsers] = useState<UserAccessItem[]>([]);
  const [officeLocations, setOfficeLocations] = useState<OfficeLocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search & Filter state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [officeSearchQuery, setOfficeSearchQuery] = useState("");

  // Office Visibility editing state: userId -> officeLocationIds[]
  const [officeVisMap, setOfficeVisMap] = useState<Record<string, string[]>>({});
  const [savingOfficesUser, setSavingOfficesUser] = useState<string | null>(null);

  // Module Permissions editing state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPermMap, setUserPermMap] = useState<Record<string, string[]>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Copy / Paste permissions state
  const [copiedPermissionsState, setCopiedPermissionsState] = useState<{
    sourceUserName: string;
    sourceUserId: string;
    permissionKeys: string[];
  } | null>(null);

  const [pasteConfirmModalOpen, setPasteConfirmModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (pasteConfirmModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pasteConfirmModalOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && pasteConfirmModalOpen) {
        setPasteConfirmModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pasteConfirmModalOpen]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/user-access", { cache: "no-store" });
      const payload = (await response.json()) as {
        users?: UserAccessItem[];
        officeLocations?: OfficeLocationItem[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load user access data.");
      }

      const fetchedUsers = payload.users ?? [];
      const fetchedOffices = payload.officeLocations ?? [];

      setUsers(fetchedUsers);
      setOfficeLocations(fetchedOffices);

      // Initialize officeVisMap
      const visMap: Record<string, string[]> = {};
      for (const u of fetchedUsers) {
        visMap[u.id] = [...u.officeLocationIds];
      }
      setOfficeVisMap(visMap);

      // Initialize userPermMap
      const permMap: Record<string, string[]> = {};
      for (const u of fetchedUsers) {
        permMap[u.id] = [...u.permissionKeys];
      }
      setUserPermMap(permMap);

      if (fetchedUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(fetchedUsers[0].id);
      }
    } catch (err) {
      console.error("Failed to load user access data", err);
      setError(err instanceof Error ? err.message : "Unable to load access data.");
    } finally {
      setLoading(false);
    }
  }

  // Filtered users for Section 1 & Section 2 user selector
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.roleName.toLowerCase().includes(q)
    );
  }, [users, userSearchQuery]);

  // Categorize officeLocations into Assigned Offices & Global Offices
  const { assignedOffices, globalOffices } = useMemo(() => {
    const assigned: OfficeLocationItem[] = [];
    const global: OfficeLocationItem[] = [];

    for (const office of officeLocations) {
      const isAssigned = Boolean(
        office.sourceType === "ASSIGNED_OFFICE" ||
        office.category === "ASSIGNED_OFFICE" ||
        office.isAssignedOffice
      );
      if (isAssigned) {
        assigned.push(office);
      } else {
        global.push(office);
      }
    }

    return { assignedOffices: assigned, globalOffices: global };
  }, [officeLocations]);

  // Filtered assigned offices for search
  const filteredAssignedOffices = useMemo(() => {
    if (!officeSearchQuery.trim()) return assignedOffices;
    const q = officeSearchQuery.toLowerCase().trim();
    return assignedOffices.filter(
      (o) => o.officeName.toLowerCase().includes(q) || (o.location && o.location.toLowerCase().includes(q))
    );
  }, [assignedOffices, officeSearchQuery]);

  // Filtered global offices for search
  const filteredGlobalOffices = useMemo(() => {
    if (!officeSearchQuery.trim()) return globalOffices;
    const q = officeSearchQuery.toLowerCase().trim();
    return globalOffices.filter(
      (o) => o.officeName.toLowerCase().includes(q) || (o.location && o.location.toLowerCase().includes(q))
    );
  }, [globalOffices, officeSearchQuery]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  // Office Visibility Toggle for User
  function toggleOfficeForUser(userId: string, officeId: string) {
    setOfficeVisMap((prev) => {
      const current = prev[userId] ?? [];
      const next = current.includes(officeId)
        ? current.filter((id) => id !== officeId)
        : [...current, officeId];
      return { ...prev, [userId]: next };
    });
  }

  function selectAllAssignedOfficesForUser(userId: string) {
    const assignedIds = new Set(assignedOffices.map((o) => o.id));
    setOfficeVisMap((prev) => {
      const current = prev[userId] ?? [];
      const nonAssignedCurrent = current.filter((id) => !assignedIds.has(id));
      return {
        ...prev,
        [userId]: Array.from(new Set([...nonAssignedCurrent, ...assignedOffices.map((o) => o.id)])),
      };
    });
  }

  function clearAllAssignedOfficesForUser(userId: string) {
    const assignedIds = new Set(assignedOffices.map((o) => o.id));
    setOfficeVisMap((prev) => {
      const current = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: current.filter((id) => !assignedIds.has(id)),
      };
    });
  }

  function selectAllGlobalOfficesForUser(userId: string) {
    const globalIds = new Set(globalOffices.map((o) => o.id));
    setOfficeVisMap((prev) => {
      const current = prev[userId] ?? [];
      const nonGlobalCurrent = current.filter((id) => !globalIds.has(id));
      return {
        ...prev,
        [userId]: Array.from(new Set([...nonGlobalCurrent, ...globalOffices.map((o) => o.id)])),
      };
    });
  }

  function clearAllGlobalOfficesForUser(userId: string) {
    const globalIds = new Set(globalOffices.map((o) => o.id));
    setOfficeVisMap((prev) => {
      const current = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: current.filter((id) => !globalIds.has(id)),
      };
    });
  }

  // Save Office Visibility for a specific user
  async function handleSaveOfficeVisibility(userId: string) {
    setSavingOfficesUser(userId);
    setError("");
    setSuccessMessage("");

    try {
      const targetOffices = officeVisMap[userId] ?? [];
      const response = await fetch("/api/admin/user-access/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, officeLocationIds: targetOffices }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save office visibility.");
      }

      setSuccessMessage("Office visibility saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Save office visibility failed", err);
      setError(err instanceof Error ? err.message : "Failed to save office visibility.");
    } finally {
      setSavingOfficesUser(null);
    }
  }

  // Permission Key Toggle for selected user
  function togglePermissionKey(key: string) {
    if (!selectedUserId) return;
    setUserPermMap((prev) => {
      const current = prev[selectedUserId] ?? [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      return { ...prev, [selectedUserId]: next };
    });
  }

  // Select All / Deselect All for a whole module
  function toggleAllModulePermissions(moduleDef: ModuleDefinition, enable: boolean) {
    if (!selectedUserId) return;
    const allKeys: string[] = [];

    if (moduleDef.actions) {
      for (const a of moduleDef.actions) allKeys.push(a.key);
    }
    if (moduleDef.subModules) {
      for (const sm of moduleDef.subModules) {
        for (const a of sm.actions) allKeys.push(a.key);
      }
    }

    setUserPermMap((prev) => {
      const current = prev[selectedUserId] ?? [];
      if (enable) {
        const next = Array.from(new Set([...current, ...allKeys]));
        return { ...prev, [selectedUserId]: next };
      } else {
        const next = current.filter((k) => !allKeys.includes(k));
        return { ...prev, [selectedUserId]: next };
      }
    });
  }

  // Save Module & Action Permissions for selected user
  async function handleSavePermissions() {
    if (!selectedUserId) return;
    setSavingPermissions(true);
    setError("");
    setSuccessMessage("");

    try {
      const targetPermissions = userPermMap[selectedUserId] ?? [];
      const response = await fetch("/api/admin/user-access/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, permissionKeys: targetPermissions }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save user permissions.");
      }

      setSuccessMessage(`Permissions for ${selectedUser?.name} saved successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Save permissions failed", err);
      setError(err instanceof Error ? err.message : "Failed to save user permissions.");
    } finally {
      setSavingPermissions(false);
    }
  }

  // Copy permissions from selected user
  function handleCopyPermissions() {
    if (!selectedUser || !selectedUserId) return;
    const currentKeys = userPermMap[selectedUserId] ?? [];
    setCopiedPermissionsState({
      sourceUserId: selectedUserId,
      sourceUserName: selectedUser.name,
      permissionKeys: [...currentKeys],
    });
    setSuccessMessage(`Copied permissions from ${selectedUser.name}!`);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  // Paste permissions to selected user (triggered after confirmation)
  function handleConfirmPaste() {
    if (!selectedUserId || !copiedPermissionsState) return;

    setUserPermMap((prev) => ({
      ...prev,
      [selectedUserId]: [...copiedPermissionsState.permissionKeys],
    }));

    setPasteConfirmModalOpen(false);
    setSuccessMessage(`Pasted permissions from ${copiedPermissionsState.sourceUserName}! Click 'Save Permissions' to persist.`);
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Admin Management"
        title="User Access Management"
        description="Redesigned per-user access control: Office Visibility Scoping and Granular Module & Action Permissions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "offices" ? "primary" : "ghost"}
              onClick={() => setActiveTab("offices")}
            >
              <Building2 size={16} />
              Office Visibility Access
            </Button>
            <Button
              variant={activeTab === "permissions" ? "primary" : "ghost"}
              onClick={() => setActiveTab("permissions")}
            >
              <ShieldCheck size={16} />
              Module & Action Permissions
            </Button>
          </div>
        }
      />

      {error ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </DashboardCard>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {successMessage}
        </div>
      ) : null}

      {/* Tab Navigation Header */}
      <div className="flex border-b border-(--border) gap-6 font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("offices")}
          className={`pb-3 text-sm transition-colors border-b-2 ${
            activeTab === "offices"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-soft hover:text-foreground"
          }`}
        >
          1. Office Visibility Access
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("permissions")}
          className={`pb-3 text-sm transition-colors border-b-2 ${
            activeTab === "permissions"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-soft hover:text-foreground"
          }`}
        >
          2. Module & Action Permissions
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : activeTab === "offices" ? (
        /* =================================================== */
        /* SECTION 1: OFFICE VISIBILITY ACCESS                */
        /* =================================================== */
        /* =================================================== */
        /* SECTION 1: OFFICE VISIBILITY ACCESS                */
        /* =================================================== */
        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left Column: User Selector List */}
          <DashboardCard
            title="Users"
            description="Select a user to configure office visibility permissions."
          >
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user..."
                  className="w-full rounded-xl border border-(--border) bg-white/60 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 dark:bg-white/5"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 max-h-150 overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                const userOffices = officeVisMap[u.id] ?? [];
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setOfficeSearchQuery("");
                    }}
                    className={`flex items-center gap-3 rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-500/10 font-bold text-blue-600 dark:text-blue-400 border border-blue-500/30"
                        : "hover:bg-black/5 dark:hover:bg-white/5 text-foreground border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-black/5 dark:bg-white/10 text-soft"
                      }`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{u.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-soft">
                        <span className="truncate">{u.roleName}</span>
                        <span>•</span>
                        <span>{u.isSuperAdmin ? "All Offices" : `${userOffices.length} offices`}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DashboardCard>

          {/* Right Column: Permitted Office Locations Configuration */}
          {selectedUser ? (
            <DashboardCard
              title={`Office Visibility — ${selectedUser.name}`}
              description="Control which office locations this user can access. System queries enforce this server-side."
              action={
                !selectedUser.isSuperAdmin && (
                  <Button
                    size="sm"
                    disabled={savingOfficesUser === selectedUser.id}
                    onClick={() => void handleSaveOfficeVisibility(selectedUser.id)}
                  >
                    <Save size={14} />
                    {savingOfficesUser === selectedUser.id ? "Saving..." : "Save Visibility"}
                  </Button>
                )
              }
            >
              {selectedUser.isSuperAdmin ? (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-xs font-semibold text-purple-900 dark:border-purple-900/30 dark:bg-purple-950/40 dark:text-purple-300 flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400 shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm">Root Scoped — Full Office Access</p>
                    <p className="text-purple-700 dark:text-purple-300/80 font-normal mt-0.5">
                      Super Admin users automatically have full unrestricted access to all assigned and global office locations across the workspace.
                    </p>
                  </div>
                </div>
              ) : (
                (() => {
                  const userPermittedIds = officeVisMap[selectedUser.id] ?? [];
                  const selectedAssignedCount = assignedOffices.filter((o) =>
                    userPermittedIds.includes(o.id)
                  ).length;
                  const selectedGlobalCount = globalOffices.filter((o) =>
                    userPermittedIds.includes(o.id)
                  ).length;

                  return (
                    <div className="flex flex-col gap-6">
                      {/* Search Filter Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
                        <input
                          type="text"
                          value={officeSearchQuery}
                          onChange={(e) => setOfficeSearchQuery(e.target.value)}
                          placeholder="Search offices by name or location..."
                          className="w-full rounded-xl border border-(--border) bg-white/60 pl-9 pr-8 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-white/5"
                        />
                        {officeSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setOfficeSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-soft hover:text-foreground cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* SECTION A — ASSIGNED OFFICES */}
                      <div className="rounded-2xl border border-(--border) bg-black/5 dark:bg-white/5 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-(--border) pb-3">
                          <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                              <Building2 size={15} />
                              ASSIGNED OFFICES
                            </h4>
                            <p className="text-xs text-soft mt-0.5 font-semibold">
                              {selectedAssignedCount} selected ({assignedOffices.length} total)
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => selectAllAssignedOfficesForUser(selectedUser.id)}
                              disabled={assignedOffices.length === 0}
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => clearAllAssignedOfficesForUser(selectedUser.id)}
                              disabled={assignedOffices.length === 0}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>

                        {/* Assigned Offices Grid */}
                        <div className="max-h-72 overflow-y-auto pr-1">
                          {assignedOffices.length === 0 ? (
                            <div className="py-6 text-center text-xs text-soft font-medium">
                              No assigned offices are available.
                            </div>
                          ) : filteredAssignedOffices.length === 0 ? (
                            <div className="py-6 text-center text-xs text-soft font-medium">
                              No assigned offices match your search "{officeSearchQuery}".
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {filteredAssignedOffices.map((office) => {
                                const isChecked = userPermittedIds.includes(office.id);
                                return (
                                  <button
                                    key={office.id}
                                    type="button"
                                    onClick={() => toggleOfficeForUser(selectedUser.id, office.id)}
                                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
                                      isChecked
                                        ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 shadow-sm"
                                        : "border-(--border) bg-white/60 dark:bg-white/5 hover:border-blue-400/60 hover:bg-black/5 dark:hover:bg-white/10 text-foreground"
                                    }`}
                                  >
                                    <div className="shrink-0">
                                      {isChecked ? (
                                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      ) : (
                                        <Square className="h-4 w-4 text-soft" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-bold">{office.officeName}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION B — GLOBAL OFFICES */}
                      <div className="rounded-2xl border border-(--border) bg-black/5 dark:bg-white/5 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-(--border) pb-3">
                          <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <Building2 size={15} />
                              GLOBAL OFFICES
                            </h4>
                            <p className="text-xs text-soft mt-0.5 font-semibold">
                              {selectedGlobalCount} selected ({globalOffices.length} total)
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => selectAllGlobalOfficesForUser(selectedUser.id)}
                              disabled={globalOffices.length === 0}
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => clearAllGlobalOfficesForUser(selectedUser.id)}
                              disabled={globalOffices.length === 0}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>

                        {/* Global Offices Grid */}
                        <div className="max-h-72 overflow-y-auto pr-1">
                          {globalOffices.length === 0 ? (
                            <div className="py-6 text-center text-xs text-soft font-medium">
                              No global office locations are available.
                            </div>
                          ) : filteredGlobalOffices.length === 0 ? (
                            <div className="py-6 text-center text-xs text-soft font-medium">
                              No global offices match your search "{officeSearchQuery}".
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {filteredGlobalOffices.map((office) => {
                                const isChecked = userPermittedIds.includes(office.id);
                                return (
                                  <button
                                    key={office.id}
                                    type="button"
                                    onClick={() => toggleOfficeForUser(selectedUser.id, office.id)}
                                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
                                      isChecked
                                        ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 shadow-sm"
                                        : "border-(--border) bg-white/60 dark:bg-white/5 hover:border-blue-400/60 hover:bg-black/5 dark:hover:bg-white/10 text-foreground"
                                    }`}
                                  >
                                    <div className="shrink-0">
                                      {isChecked ? (
                                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      ) : (
                                        <Square className="h-4 w-4 text-soft" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-bold">{office.officeName}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </DashboardCard>
          ) : null}
        </section>
      ) : (
        /* =================================================== */
        /* SECTION 2: MODULE & ACTION PERMISSIONS              */
        /* =================================================== */
        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left Column: User Selector List */}
          <DashboardCard title="Users" description="Select a user to configure permissions.">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user..."
                  className="w-full rounded-xl border border-(--border) bg-white/60 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 dark:bg-white/5"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 max-h-150 overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`flex items-center gap-3 rounded-xl p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-blue-600 font-extrabold text-white shadow-sm"
                        : "hover:bg-black/5 text-foreground dark:hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{u.name}</p>
                      <p className={`truncate text-[11px] ${isSelected ? "text-blue-100" : "text-soft"}`}>
                        {u.roleName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </DashboardCard>

          {/* Right Column: Permission Matrix for Selected User */}
          <DashboardCard
            title={selectedUser ? `Permission Matrix: ${selectedUser.name}` : "Module & Action Permissions"}
            description="Configure exact module visibility, sub-module access, and action capabilities for this individual user."
          >
            {selectedUser ? (
              <div className="flex flex-col gap-6">
                {/* Action Bar: Copy / Paste / Save */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-(--border) bg-white/40 p-4 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleCopyPermissions}>
                      <Copy size={15} />
                      Copy Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!copiedPermissionsState}
                      onClick={() => setPasteConfirmModalOpen(true)}
                    >
                      <ClipboardPaste size={15} />
                      Paste Permissions
                    </Button>
                    {copiedPermissionsState ? (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        Copied from: {copiedPermissionsState.sourceUserName}
                      </span>
                    ) : null}
                  </div>

                  <Button
                    variant="primary"
                    disabled={savingPermissions || selectedUser.isSuperAdmin}
                    onClick={() => void handleSavePermissions()}
                  >
                    <Save size={16} />
                    {savingPermissions ? "Saving..." : "Save Permissions"}
                  </Button>
                </div>

                {selectedUser.isSuperAdmin ? (
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-50 p-4 text-sm font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                    <ShieldCheck className="mb-1 inline-block h-5 w-5 mr-1" />
                    Root Super Admin possesses full administrative access across all modules and actions.
                  </div>
                ) : null}

                {/* Module Matrix */}
                <div className="grid gap-6">
                  {MODULE_PERMISSIONS_CATALOG.map((moduleDef) => {
                    const userKeys = userPermMap[selectedUser.id] ?? [];

                    return (
                      <div
                        key={moduleDef.key}
                        className="rounded-2xl border border-(--border) bg-white/60 p-5 dark:bg-white/5"
                      >
                        <div className="mb-4 flex items-center justify-between border-b border-(--border) pb-3">
                          <h4 className="font-extrabold text-foreground">{moduleDef.label}</h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAllModulePermissions(moduleDef, true)}
                              className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Select All
                            </button>
                            <span className="text-soft">|</span>
                            <button
                              type="button"
                              onClick={() => toggleAllModulePermissions(moduleDef, false)}
                              className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        {/* Flat Actions */}
                        {moduleDef.actions && moduleDef.actions.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {moduleDef.actions.map((action) => {
                              const checked = userKeys.includes(action.key);
                              return (
                                <label
                                  key={action.key}
                                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                                    checked
                                      ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/30"
                                      : "border-(--border) bg-white/40 hover:border-slate-400 dark:bg-white/5"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={selectedUser.isSuperAdmin}
                                    onChange={() => togglePermissionKey(action.key)}
                                    className="h-4 w-4 rounded border-(--border) text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-bold text-foreground">{action.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}

                        {/* Sub-modules */}
                        {moduleDef.subModules && moduleDef.subModules.length > 0 ? (
                          <div className="grid gap-4">
                            {moduleDef.subModules.map((subModule) => (
                              <div key={subModule.label} className="rounded-xl border border-(--border) p-3">
                                <p className="mb-2 text-xs font-extrabold text-soft uppercase tracking-wider">
                                  {subModule.label}
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {subModule.actions.map((action) => {
                                    const checked = userKeys.includes(action.key);
                                    return (
                                      <label
                                        key={action.key}
                                        className={`flex items-center gap-3 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                                          checked
                                            ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/30"
                                            : "border-(--border) bg-white/40 hover:border-slate-400 dark:bg-white/5"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={selectedUser.isSuperAdmin}
                                          onChange={() => togglePermissionKey(action.key)}
                                          className="h-4 w-4 rounded border-(--border) text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-foreground">
                                          {action.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={ShieldCheck}
                title="Select a User"
                description="Select a user from the left list to configure individual module and action permissions."
              />
            )}
          </DashboardCard>
        </section>
      )}

      {/* Paste Confirmation Modal */}
      {mounted && pasteConfirmModalOpen && copiedPermissionsState && selectedUser
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setPasteConfirmModalOpen(false);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="paste-confirm-modal-title"
                className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4 text-slate-900 dark:text-white"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <h3 id="paste-confirm-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Confirm Paste Permissions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPasteConfirmModalOpen(false)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Replace <strong className="font-bold text-slate-900 dark:text-white">{selectedUser.name}</strong>&apos;s current module/action permissions with the copied permission set from{" "}
                  <strong className="font-bold text-slate-900 dark:text-white">{copiedPermissionsState.sourceUserName}</strong>?
                </p>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-50/80 p-3.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  Note: Office Visibility for {selectedUser.name} will remain unchanged.
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPasteConfirmModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleConfirmPaste}
                  >
                    Apply Copied Permissions
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
