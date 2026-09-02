"use client";

import {
  Check,
  Copy,
  ClipboardPaste,
  Search,
  ShieldCheck,
  Building2,
  CheckSquare,
  Square,
  Save,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Layers,
  Sparkles,
  FileCheck2,
  FolderTree,
  BadgeDollarSign,
  ListChecks,
  Home,
  Truck,
  FileSearch,
  Users,
  BadgeCheck,
  Clock3,
  CreditCard,
  BarChart3,
  Handshake,
  ClipboardList,
  PlaneTakeoff,
  BriefcaseBusiness,
} from "lucide-react";
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  moduleOfficeVisibilities: Record<string, string[]>;
  configuredOfficesCount: number;
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

type ModuleDefinitionItem = {
  key: string;
  label: string;
  href: string;
  description: string;
  category: string;
  subModules?: Array<{ key: string; label: string; href?: string }>;
};

// Explicit Module Definition catalog for Section 2 (User Access Matrix)
type ActionDefinition = {
  key: string;
  label: string;
  description?: string;
};

type SubModuleDefinition = {
  label: string;
  actions: ActionDefinition[];
};

type ModulePermissionDefinition = {
  key: string;
  label: string;
  category: string;
  description?: string;
  moduleAccessKey?: string;
  subModules?: SubModuleDefinition[];
  actions?: ActionDefinition[];
};

const MODULE_PERMISSIONS_CATALOG: ModulePermissionDefinition[] = [
  {
    key: "revenue_registration",
    label: "REVENUE REGISTRATION",
    category: "Operations",
    description: "Revenue collection, document registration, customer billing, and exports.",
    moduleAccessKey: "revenue_registration.view",
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
    key: "pending_approval",
    label: "PENDING APPROVAL",
    category: "Finance & Approvals",
    description: "Individual enterprise approval queues for advance payments, movements, and workflows.",
    moduleAccessKey: "pending_approval.view",
    subModules: [
      {
        label: "Advance Payment Approval",
        actions: [
          { key: "advance_payment_approval.view", label: "View" },
          { key: "advance_payment_approval.approve", label: "Approve" },
          { key: "advance_payment_approval.reject", label: "Reject" },
        ],
      },
      {
        label: "Movement Approval",
        actions: [
          { key: "movement_approval.view", label: "View" },
          { key: "movement_approval.approve", label: "Approve" },
        ],
      },
      {
        label: "Advance Details Approval",
        actions: [
          { key: "advance_details_approval.view", label: "View" },
          { key: "advance_details_approval.manage", label: "Manage (Edit / Delete)" },
        ],
      },
      {
        label: "Corporate Details Approval",
        actions: [
          { key: "corporate_details_approval.view", label: "View" },
          { key: "corporate_details_approval.approve", label: "Approve" },
          { key: "corporate_details_approval.reject", label: "Reject" },
          { key: "corporate_details_approval.edit", label: "Edit" },
        ],
      },
      {
        label: "LOB Requests",
        actions: [
          { key: "lobApproval.view", label: "View" },
          { key: "lobApproval.approve", label: "Approve" },
          { key: "lobApproval.reject", label: "Reject" },
          { key: "lobApproval.return", label: "Return" },
        ],
      },
      {
        label: "Inactive Leads",
        actions: [
          { key: "inactiveLead.view", label: "View" },
          { key: "inactiveLead.approve", label: "Approve" },
          { key: "inactiveLead.reject", label: "Reject" },
          { key: "inactiveLead.return", label: "Return" },
        ],
      },
      {
        label: "Overdue Follow-ups",
        actions: [
          { key: "overdueFollowup.view", label: "View" },
          { key: "overdueFollowup.approve", label: "Approve" },
          { key: "overdueFollowup.reject", label: "Reject" },
          { key: "overdueFollowup.return", label: "Return" },
        ],
      },
    ],
  },
  {
    key: "lead_management",
    label: "LEAD MANAGEMENT",
    category: "Sales & CRM",
    description: "Lead pipelines, followups, assignments, LOB requests, and closed conversions.",
    moduleAccessKey: "lead_management.view",
    subModules: [
      {
        label: "Lead Access Scope",
        actions: [
          { key: "leads.view_all", label: "View All Leads (All Permitted Offices)" },
          { key: "leads.view_own", label: "View Own Leads (Created / Assigned to User)" },
          { key: "leads.view_assigned_users", label: "View Assigned Users Leads (Reporting Staff)" },
        ],
      },
      {
        label: "All Leads Actions",
        actions: [
          { key: "leads.view", label: "View" },
          { key: "leads.create", label: "Create" },
          { key: "leads.edit", label: "Edit" },
          { key: "leads.delete", label: "Delete" },
          { key: "leads.export", label: "Export" },
          { key: "leads.import", label: "Import" },
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
    key: "master_configuration",
    label: "MASTER CONFIGURATION",
    category: "Configuration",
    description: "System master registries, document categories, process types, and account menus.",
    moduleAccessKey: "master_configuration.view",
    subModules: [
      {
        label: "Departments",
        actions: [
          { key: "departments.view", label: "View" },
          { key: "departments.create", label: "Create" },
          { key: "departments.edit", label: "Edit" },
          { key: "departments.delete", label: "Delete" },
        ],
      },
      {
        label: "Office Locations",
        actions: [
          { key: "office_locations.view", label: "View" },
          { key: "office_locations.create", label: "Create" },
          { key: "office_locations.edit", label: "Edit" },
          { key: "office_locations.delete", label: "Delete" },
        ],
      },
      {
        label: "Document Types",
        actions: [
          { key: "master_configuration.document_types.view", label: "View" },
          { key: "master_configuration.document_types.create", label: "Create" },
          { key: "master_configuration.document_types.edit", label: "Edit" },
          { key: "master_configuration.document_types.delete", label: "Delete" },
        ],
      },
      {
        label: "Document Type Categories",
        actions: [
          { key: "master_configuration.document_type_categories.view", label: "View" },
          { key: "master_configuration.document_type_categories.create", label: "Create" },
          { key: "master_configuration.document_type_categories.edit", label: "Edit" },
          { key: "master_configuration.document_type_categories.delete", label: "Delete" },
        ],
      },
      {
        label: "Process Types",
        actions: [
          { key: "master_configuration.process_types.view", label: "View" },
          { key: "master_configuration.process_types.create", label: "Create" },
          { key: "master_configuration.process_types.edit", label: "Edit" },
          { key: "master_configuration.process_types.delete", label: "Delete" },
        ],
      },
      {
        label: "Sub Process",
        actions: [
          { key: "master_configuration.sub_process.view", label: "View" },
          { key: "master_configuration.sub_process.create", label: "Create" },
          { key: "master_configuration.sub_process.edit", label: "Edit" },
          { key: "master_configuration.sub_process.delete", label: "Delete" },
        ],
      },
      {
        label: "Customer Types",
        actions: [
          { key: "master_configuration.customer_types.view", label: "View" },
          { key: "master_configuration.customer_types.create", label: "Create" },
          { key: "master_configuration.customer_types.edit", label: "Edit" },
          { key: "master_configuration.customer_types.delete", label: "Delete" },
        ],
      },
      {
        label: "Corporate Details",
        actions: [
          { key: "master_configuration.corporate_details.view", label: "View" },
          { key: "master_configuration.corporate_details.create", label: "Create" },
          { key: "master_configuration.corporate_details.edit", label: "Edit" },
          { key: "master_configuration.corporate_details.delete", label: "Delete" },
        ],
      },
      {
        label: "Payment Mode",
        actions: [
          { key: "master_configuration.payment_mode.view", label: "View" },
          { key: "master_configuration.payment_mode.create", label: "Create" },
          { key: "master_configuration.payment_mode.edit", label: "Edit" },
          { key: "master_configuration.payment_mode.delete", label: "Delete" },
        ],
      },
      {
        label: "Courier Companies",
        actions: [
          { key: "master_configuration.courier_companies.view", label: "View" },
          { key: "master_configuration.courier_companies.create", label: "Create" },
          { key: "master_configuration.courier_companies.edit", label: "Edit" },
          { key: "master_configuration.courier_companies.delete", label: "Delete" },
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
    key: "process",
    label: "PROCESS MODULE",
    category: "Processing",
    description: "Office document processing, transfers, inbound receipts, and dispatch outbounds.",
    moduleAccessKey: "process.view",
    subModules: [
      {
        label: "Document In Hand",
        actions: [
          { key: "process.document_in_hand.view", label: "View" },
          { key: "process.document_in_hand.transfer", label: "Transfer To Assigned Office" },
          { key: "process.document_in_hand.actions", label: "Transfer / Process Actions (Create/Edit/Complete/Delete)" },
        ],
      },
      {
        label: "Inbound",
        actions: [
          { key: "process.inbound.view", label: "View" },
          { key: "process.inbound.receive", label: "Receive Document" },
          { key: "process.inbound.return", label: "Return Document" },
        ],
      },
      {
        label: "Outbound",
        actions: [
          { key: "process.outbound.view", label: "View" },
          { key: "process.outbound.retrieve", label: "Send / Retrieve Document" },
        ],
      },
      {
        label: "Bundle Movement",
        actions: [{ key: "process.bundle_movement.view", label: "View Movement History" }],
      },
    ],
  },
  {
    key: "ready_for_delivery",
    label: "READY FOR DELIVERY",
    category: "Operations",
    description: "Queue for documents ready for final handover and customer dispatch.",
    moduleAccessKey: "ready_for_delivery.view",
    actions: [
      { key: "ready_for_delivery.view", label: "View" },
      { key: "ready_for_delivery.deliver", label: "Deliver Document" },
      { key: "ready_for_delivery.undo", label: "Undo Delivery" },
      { key: "ready_for_delivery.view_details", label: "View Details" },
      { key: "ready_for_delivery.export", label: "Export" },
      { key: "ready_for_delivery.edit", label: "Edit" },
      { key: "ready_for_delivery.delete", label: "Delete" },
    ],
  },
  {
    key: "home",
    label: "HOME WORKFLOW",
    category: "Workflow",
    description: "HQ Document in hand, internal bundle routing, transfer receipts, and audit history.",
    moduleAccessKey: "home.view",
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
          { key: "home.outbound.retrieve", label: "Send / Retrieve" },
        ],
      },
      {
        label: "Movement History",
        actions: [{ key: "home.movement_history.view", label: "View Movement History" }],
      },
    ],
  },
  {
    key: "search_report",
    label: "SEARCH / REPORT",
    category: "Analytics & Reports",
    description: "Unified cross-office tracking number search, customer lookups, and report exports.",
    moduleAccessKey: "search_report.view",
    actions: [
      { key: "search_report.view", label: "View Reports" },
      { key: "search_report.export", label: "Export Reports" },
    ],
  },
  {
    key: "account_modules",
    label: "ACCOUNT MODULES",
    category: "Finance & Accounts",
    description: "Financial transactions, payment vouchers, ledger entries, and accounting statements.",
    subModules: [
      {
        label: "Account Panel",
        actions: [
          { key: "account_panel.view", label: "View" },
          { key: "account_panel.create", label: "Create" },
          { key: "account_panel.edit", label: "Edit" },
          { key: "account_panel.delete", label: "Delete" },
        ],
      },
      {
        label: "Account Statements",
        actions: [
          { key: "account_statements.view", label: "View" },
          { key: "account_statements.export", label: "Export" },
          { key: "account_statements.edit", label: "Edit" },
          { key: "account_statements.delete", label: "Delete" },
        ],
      },
    ],
  },
  {
    key: "reports",
    label: "REPORTS & ANALYTICS",
    category: "Analytics & Reports",
    description: "Consolidated enterprise analytics, registration summaries, and business intelligence.",
    moduleAccessKey: "reports.view",
    actions: [
      { key: "reports.view", label: "View" },
      { key: "reports.export", label: "Export" },
    ],
  },
  {
    key: "bm_report",
    label: "BM REPORT",
    category: "Analytics & Reports",
    description: "Branch Manager specific reporting and executive KPIs.",
    moduleAccessKey: "bm_report.view",
    actions: [
      { key: "bm_report.view", label: "View" },
      { key: "bm_report.export", label: "Export" },
    ],
  },
  {
    key: "assigned_office",
    label: "ASSIGNED OFFICE",
    category: "Operations",
    description: "External outsourced office portals, rate cards, and task delegation.",
    moduleAccessKey: "assigned_office.view",
    actions: [
      { key: "assigned_office.view", label: "View" },
      { key: "assigned_office.manage", label: "Manage" },
      { key: "assigned_office.create", label: "Create" },
      { key: "assigned_office.edit", label: "Edit" },
      { key: "assigned_office.delete", label: "Delete" },
      { key: "assigned_office.export", label: "Export" },
    ],
  },
  {
    key: "welcome_call",
    label: "WELCOME CALL",
    category: "Operations",
    description: "Post-registration customer onboarding, feedback recording, and status updates.",
    moduleAccessKey: "welcome_call.view",
    actions: [
      { key: "welcome_call.view", label: "View" },
      { key: "welcome_call.complete", label: "Complete" },
    ],
  },
  {
    key: "attendance",
    label: "ATTENDANCE",
    category: "HR & Staff",
    description: "Staff biometric check-in, geofencing logs, daily summaries, and approval controls.",
    moduleAccessKey: "attendance.view",
    subModules: [
      {
        label: "Dashboard & Records",
        actions: [
          { key: "attendance.view", label: "View Dashboard" },
          { key: "attendance.records.view", label: "View Records" },
        ],
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
          { key: "attendance_approval.view", label: "Approval Authority" },
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
    category: "HR & Staff",
    description: "Leave application requests, quota calculations, team approvals, and balance reports.",
    moduleAccessKey: "leave.view",
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
    category: "HR & Staff",
    description: "Payroll computation, salary calculators, monthly dispatches, and audit statements.",
    moduleAccessKey: "salary.view",
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
        actions: [
          { key: "salary.generate", label: "Generate" },
          { key: "salary.approve", label: "Approve" },
        ],
      },
      {
        label: "Reports",
        actions: [{ key: "salary.report", label: "Report" }],
      },
    ],
  },
  {
    key: "admin_management",
    label: "ADMIN MANAGEMENT",
    category: "Administration",
    description: "Workspace users, roles & permission matrices, department setups, and branch profiles.",
    moduleAccessKey: "admin_management.view",
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
  const [modules, setModules] = useState<ModuleDefinitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search & Filter state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [permSearchQuery, setPermSearchQuery] = useState("");

  // Accordion state for Tab 2
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    revenue_registration: true,
    pending_approval: true,
    lead_management: true,
    master_configuration: true,
  });

  // Office Visibility editing state: userId -> { moduleKey -> officeLocationIds[] }
  const [officeVisMap, setOfficeVisMap] = useState<Record<string, Record<string, string[]>>>({});
  const [savingModuleKey, setSavingModuleKey] = useState<string | null>(null);
  const [savingAllOffices, setSavingAllOffices] = useState(false);

  // Module Permissions editing state (Tab 2)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPermMap, setUserPermMap] = useState<Record<string, string[]>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Copy / Paste Office Visibility state
  const [copiedOfficeVisState, setCopiedOfficeVisState] = useState<{
    sourceUserId: string;
    sourceUserName: string;
    moduleOfficeMap: Record<string, string[]>;
  } | null>(null);
  const [pasteOfficeModalOpen, setPasteOfficeModalOpen] = useState(false);

  // Copy / Paste Permissions state (Tab 2)
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
    if (pasteConfirmModalOpen || pasteOfficeModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pasteConfirmModalOpen, pasteOfficeModalOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (pasteConfirmModalOpen) setPasteConfirmModalOpen(false);
        if (pasteOfficeModalOpen) setPasteOfficeModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pasteConfirmModalOpen, pasteOfficeModalOpen]);

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
        modules?: ModuleDefinitionItem[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load user access data.");
      }

      const fetchedUsers = payload.users ?? [];
      const fetchedOffices = payload.officeLocations ?? [];
      const fetchedModules = payload.modules ?? [];

      setUsers(fetchedUsers);
      setOfficeLocations(fetchedOffices);
      setModules(fetchedModules);

      // Initialize officeVisMap from user moduleOfficeVisibilities
      const visMap: Record<string, Record<string, string[]>> = {};
      for (const u of fetchedUsers) {
        visMap[u.id] = { ...(u.moduleOfficeVisibilities ?? {}) };
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

  // Filtered users for user selector
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleName.toLowerCase().includes(q)
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

  // Filter dynamic modules for search in Tab 1
  const filteredModules = useMemo(() => {
    if (!moduleSearchQuery.trim()) return modules;
    const q = moduleSearchQuery.toLowerCase().trim();
    return modules.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [modules, moduleSearchQuery]);

  // Filter permission modules for search in Tab 2
  const filteredPermissionCatalog = useMemo(() => {
    if (!permSearchQuery.trim()) return MODULE_PERMISSIONS_CATALOG;
    const q = permSearchQuery.toLowerCase().trim();
    return MODULE_PERMISSIONS_CATALOG.filter((m) => {
      const matchLabel = m.label.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q) ?? false;
      const matchCategory = m.category.toLowerCase().includes(q);
      const matchSub = m.subModules?.some(
        (sm) =>
          sm.label.toLowerCase().includes(q) ||
          sm.actions.some((a) => a.label.toLowerCase().includes(q) || a.key.toLowerCase().includes(q))
      ) ?? false;
      const matchActions = m.actions?.some(
        (a) => a.label.toLowerCase().includes(q) || a.key.toLowerCase().includes(q)
      ) ?? false;
      return matchLabel || matchDesc || matchCategory || matchSub || matchActions;
    });
  }, [permSearchQuery]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  // Module office update handler
  function handleModuleOfficesChange(userId: string, moduleKey: string, officeIds: string[]) {
    setOfficeVisMap((prev) => {
      const userMap = { ...(prev[userId] ?? {}) };
      userMap[moduleKey] = officeIds;
      return { ...prev, [userId]: userMap };
    });
  }

  // Save specific module visibility
  async function handleSaveSingleModuleVisibility(userId: string, moduleKey: string) {
    if (!selectedUser) return;
    setSavingModuleKey(moduleKey);
    setError("");
    setSuccessMessage("");

    try {
      const targetOffices = officeVisMap[userId]?.[moduleKey] ?? [];
      const response = await fetch("/api/admin/user-access/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          moduleKey,
          officeLocationIds: targetOffices,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? `Failed to save visibility for ${moduleKey}.`);
      }

      const moduleName = modules.find((m) => m.key === moduleKey)?.label ?? moduleKey;
      setSuccessMessage(`Saved office visibility for ${moduleName}!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Save module office visibility failed", err);
      setError(err instanceof Error ? err.message : "Failed to save module office visibility.");
    } finally {
      setSavingModuleKey(null);
    }
  }

  // Save all modules visibility for selected user
  async function handleSaveAllOfficeVisibility(userId: string) {
    if (!selectedUser) return;
    setSavingAllOffices(true);
    setError("");
    setSuccessMessage("");

    try {
      const targetMap = officeVisMap[userId] ?? {};
      const response = await fetch("/api/admin/user-access/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          moduleOfficeMap: targetMap,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save all module office visibilities.");
      }

      setSuccessMessage(`All module office visibilities saved for ${selectedUser.name}!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Save all office visibility failed", err);
      setError(err instanceof Error ? err.message : "Failed to save office visibility.");
    } finally {
      setSavingAllOffices(false);
    }
  }

  // Copy Office Visibility from selected user
  function handleCopyOfficeVisibility() {
    if (!selectedUser || !selectedUserId) return;
    const currentMap = officeVisMap[selectedUserId] ?? {};
    setCopiedOfficeVisState({
      sourceUserId: selectedUserId,
      sourceUserName: selectedUser.name,
      moduleOfficeMap: JSON.parse(JSON.stringify(currentMap)),
    });
    setSuccessMessage(`Copied module-wise office visibility from ${selectedUser.name}!`);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  // Paste Office Visibility to selected user
  async function handleConfirmPasteOfficeVisibility() {
    if (!selectedUserId || !copiedOfficeVisState || !selectedUser) return;
    setError("");

    try {
      const response = await fetch("/api/admin/user-access/copy-office-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUserId: copiedOfficeVisState.sourceUserId,
          targetUserId: selectedUserId,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to paste office visibility.");
      }

      // Update local state
      setOfficeVisMap((prev) => ({
        ...prev,
        [selectedUserId]: JSON.parse(JSON.stringify(copiedOfficeVisState.moduleOfficeMap)),
      }));

      setPasteOfficeModalOpen(false);
      setSuccessMessage(
        `Applied and saved module-wise office visibility from ${copiedOfficeVisState.sourceUserName} to ${selectedUser.name}!`
      );
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Failed to paste office visibility", err);
      setError(err instanceof Error ? err.message : "Failed to paste office visibility.");
    }
  }

  // ==========================================
  // SECTION 2 (PERMISSIONS) HANDLERS
  // ==========================================
  function togglePermissionKey(key: string) {
    if (!selectedUserId) return;
    setUserPermMap((prev) => {
      const current = prev[selectedUserId] ?? [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      return { ...prev, [selectedUserId]: next };
    });
  }

  function toggleAllModulePermissions(moduleDef: ModulePermissionDefinition, enable: boolean) {
    if (!selectedUserId) return;
    const allKeys: string[] = [];

    if (moduleDef.moduleAccessKey) {
      allKeys.push(moduleDef.moduleAccessKey);
    }
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

  function toggleSubModulePermissions(subModule: SubModuleDefinition, enable: boolean) {
    if (!selectedUserId) return;
    const allKeys = subModule.actions.map((a) => a.key);

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

  function toggleAccordion(moduleKey: string) {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  }

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

  function handleConfirmPaste() {
    if (!selectedUserId || !copiedPermissionsState) return;

    setUserPermMap((prev) => ({
      ...prev,
      [selectedUserId]: [...copiedPermissionsState.permissionKeys],
    }));

    setPasteConfirmModalOpen(false);
    setSuccessMessage(
      `Pasted permissions from ${copiedPermissionsState.sourceUserName}! Click 'Save Permissions' to persist.`
    );
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Admin Management"
        title="User Access Management"
        description="Granular per-user authorization: Module-Wise Office Visibility and Detailed Module & Action Permissions."
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
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
        </DashboardCard>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 animate-in fade-in duration-150">
          {successMessage}
        </div>
      ) : null}

      {/* Tab Navigation Header */}
      <div className="flex border-b border-(--border) gap-6 font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("offices")}
          className={`pb-3 text-sm transition-colors border-b-2 cursor-pointer ${
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
          className={`pb-3 text-sm transition-colors border-b-2 cursor-pointer ${
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
        /* SECTION 1: REDESIGNED MODULE-WISE OFFICE VISIBILITY */
        /* =================================================== */
        <section className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Left Column: User Selector List */}
          <DashboardCard
            title="Users"
            description="Select a user to configure granular module-wise office access."
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

            <div className="flex flex-col gap-1.5 max-h-160 overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                const userModuleMap = officeVisMap[u.id] ?? {};
                const configuredModuleCount = Object.keys(userModuleMap).filter(
                  (k) => (userModuleMap[k] ?? []).length > 0
                ).length;
                const distinctOffices = Array.from(
                  new Set(Object.values(userModuleMap).flat().filter(Boolean))
                );

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`flex items-center gap-3 rounded-2xl p-3 text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-200 border-2 border-blue-500 shadow-xs"
                        : "hover:bg-black/5 dark:hover:bg-white/5 text-foreground border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-sm">{u.name}</p>
                      <p className="truncate text-[11px] text-soft">{u.email}</p>
                      <div className="flex items-center gap-2 text-[11px] mt-1 font-semibold text-soft">
                        <span className="rounded-md bg-black/5 px-1.5 py-0.5 dark:bg-white/10 text-foreground">
                          {u.roleName}
                        </span>
                        <span>•</span>
                        <span className={u.isSuperAdmin ? "text-purple-600 dark:text-purple-400 font-bold" : ""}>
                          {u.isSuperAdmin
                            ? "All Offices"
                            : distinctOffices.length > 0
                            ? `${distinctOffices.length} offices (${configuredModuleCount} modules)`
                            : "0 offices"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DashboardCard>

          {/* Right Column: Module-Wise Office Visibility Configuration */}
          {selectedUser ? (
            <div className="flex flex-col gap-6">
              {/* Header Bar */}
              <DashboardCard>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-foreground">
                        Office Visibility Access — {selectedUser.name}
                      </h3>
                      <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-extrabold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {selectedUser.roleName}
                      </span>
                    </div>
                    <p className="text-xs text-soft mt-1">
                      Configure granular office visibility separately for every module. Server-side queries enforce these exact scopes.
                    </p>
                  </div>

                  {/* Actions: Copy / Paste / Save All */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyOfficeVisibility}
                      title="Copy all module office assignments from this user"
                    >
                      <Copy size={14} />
                      Copy Visibility
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        !copiedOfficeVisState ||
                        copiedOfficeVisState.sourceUserId === selectedUser.id ||
                        selectedUser.isSuperAdmin
                      }
                      onClick={() => setPasteOfficeModalOpen(true)}
                      title="Paste copied module office assignments to this user"
                    >
                      <ClipboardPaste size={14} />
                      Paste Visibility
                    </Button>
                    {!selectedUser.isSuperAdmin && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={savingAllOffices}
                        onClick={() => void handleSaveAllOfficeVisibility(selectedUser.id)}
                      >
                        <Save size={14} />
                        {savingAllOffices ? "Saving..." : "Save All Visibility"}
                      </Button>
                    )}
                  </div>
                </div>

                {copiedOfficeVisState ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50/70 dark:bg-blue-950/30 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                      <span>
                        Clipboard ready: Copied module visibility from{" "}
                        <strong className="font-extrabold">{copiedOfficeVisState.sourceUserName}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCopiedOfficeVisState(null)}
                      className="text-soft hover:text-foreground cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null}
              </DashboardCard>

              {/* Super Admin Notice */}
              {selectedUser.isSuperAdmin ? (
                <div className="rounded-3xl border border-purple-200 bg-purple-50 p-6 text-sm font-semibold text-purple-900 dark:border-purple-900/30 dark:bg-purple-950/40 dark:text-purple-300 flex items-start gap-4">
                  <ShieldCheck className="h-8 w-8 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-base">Super Admin — Unrestricted Root Visibility</h4>
                    <p className="text-purple-700 dark:text-purple-300/80 font-normal mt-1 leading-relaxed">
                      Super Admin users possess unrestricted visibility across all operational modules and all assigned & global office locations. Backend queries automatically grant full access without requiring manual office assignment.
                    </p>
                  </div>
                </div>
              ) : (
                /* Dynamic Module-Wise Office Assigners */
                <div className="flex flex-col gap-4">
                  {/* Module Search Filter */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
                    <input
                      type="text"
                      value={moduleSearchQuery}
                      onChange={(e) => setModuleSearchQuery(e.target.value)}
                      placeholder="Search system modules (e.g. Revenue Registration, Process Module, Ready For Delivery, Home)..."
                      className="w-full rounded-2xl border border-(--border) bg-white/70 pl-9 pr-8 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-white/5"
                    />
                    {moduleSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setModuleSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-soft hover:text-foreground cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {filteredModules.length === 0 ? (
                    <EmptyState
                      icon={Building2}
                      title="No modules match your search"
                      description={`No system modules match "${moduleSearchQuery}".`}
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-1">
                      {filteredModules.map((moduleItem) => {
                        const userModuleOffices =
                          officeVisMap[selectedUser.id]?.[moduleItem.key] ?? [];

                        return (
                          <ModuleOfficeCard
                            key={moduleItem.key}
                            moduleItem={moduleItem}
                            selectedOfficeIds={userModuleOffices}
                            assignedOffices={assignedOffices}
                            globalOffices={globalOffices}
                            isSaving={savingModuleKey === moduleItem.key}
                            onChange={(newIds) =>
                              handleModuleOfficesChange(selectedUser.id, moduleItem.key, newIds)
                            }
                            onSave={() =>
                              handleSaveSingleModuleVisibility(selectedUser.id, moduleItem.key)
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Select a User"
              description="Choose a user from the left panel to configure module-wise office visibility."
            />
          )}
        </section>
      ) : (
        /* =================================================== */
        /* SECTION 2: MODULE & ACTION PERMISSIONS (REDESIGNED) */
        /* =================================================== */
        <section className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Left Column: User Selector List */}
          <DashboardCard title="Users" description="Select a user to configure granular permissions.">
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

            <div className="flex flex-col gap-1.5 max-h-160 overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                const userKeys = userPermMap[u.id] ?? [];
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`flex items-center gap-3 rounded-2xl p-3 text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-200 border-2 border-blue-500 shadow-xs"
                        : "hover:bg-black/5 dark:hover:bg-white/5 text-foreground border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-sm">{u.name}</p>
                      <p className="truncate text-[11px] text-soft">{u.email}</p>
                      <div className="flex items-center gap-2 text-[11px] mt-1 font-semibold text-soft">
                        <span className="rounded-md bg-black/5 px-1.5 py-0.5 dark:bg-white/10 text-foreground">
                          {u.roleName}
                        </span>
                        <span>•</span>
                        <span className={u.isSuperAdmin ? "text-purple-600 dark:text-purple-400 font-bold" : ""}>
                          {u.isSuperAdmin ? "Full Access" : `${userKeys.length} permissions`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DashboardCard>

          {/* Right Column: Permission Matrix for Selected User */}
          {selectedUser ? (
            <div className="flex flex-col gap-6">
              {/* Header Bar */}
              <DashboardCard>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-foreground">
                        Module & Action Permissions — {selectedUser.name}
                      </h3>
                      <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-extrabold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {selectedUser.roleName}
                      </span>
                    </div>
                    <p className="text-xs text-soft mt-1">
                      Configure granular module visibility, approval types, and action capabilities for this individual user.
                    </p>
                  </div>

                  {/* Actions: Copy / Paste / Save */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopyPermissions}>
                      <Copy size={14} />
                      Copy Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!copiedPermissionsState || copiedPermissionsState.sourceUserId === selectedUser.id}
                      onClick={() => setPasteConfirmModalOpen(true)}
                    >
                      <ClipboardPaste size={14} />
                      Paste Permissions
                    </Button>
                    {!selectedUser.isSuperAdmin && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={savingPermissions}
                        onClick={() => void handleSavePermissions()}
                      >
                        <Save size={14} />
                        {savingPermissions ? "Saving..." : "Save Permissions"}
                      </Button>
                    )}
                  </div>
                </div>

                {copiedPermissionsState ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50/70 dark:bg-blue-950/30 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                      <span>
                        Clipboard ready: Copied permissions from{" "}
                        <strong className="font-extrabold">{copiedPermissionsState.sourceUserName}</strong> (
                        {copiedPermissionsState.permissionKeys.length} items)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCopiedPermissionsState(null)}
                      className="text-soft hover:text-foreground cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null}
              </DashboardCard>

              {/* Super Admin Notice */}
              {selectedUser.isSuperAdmin ? (
                <div className="rounded-3xl border border-purple-200 bg-purple-50 p-6 text-sm font-semibold text-purple-900 dark:border-purple-900/30 dark:bg-purple-950/40 dark:text-purple-300 flex items-start gap-4">
                  <ShieldCheck className="h-8 w-8 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-base">Super Admin — Root System Access</h4>
                    <p className="text-purple-700 dark:text-purple-300/80 font-normal mt-1 leading-relaxed">
                      Super Admin users automatically hold unrestricted permissions across all system modules, approval queues, and actions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Permissions Search Filter */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
                    <input
                      type="text"
                      value={permSearchQuery}
                      onChange={(e) => setPermSearchQuery(e.target.value)}
                      placeholder="Search permission modules or actions (e.g. Revenue Registration, Movement Approval, View Own Leads)..."
                      className="w-full rounded-2xl border border-(--border) bg-white/70 pl-9 pr-8 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-white/5"
                    />
                    {permSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPermSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-soft hover:text-foreground cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Module Matrix Cards */}
                  <div className="grid gap-4">
                    {filteredPermissionCatalog.map((moduleDef) => {
                      const userKeys = userPermMap[selectedUser.id] ?? [];
                      const isExpanded = expandedModules[moduleDef.key] ?? true;

                      // Count active permissions in this module
                      const allModuleKeys: string[] = [];
                      if (moduleDef.moduleAccessKey) allModuleKeys.push(moduleDef.moduleAccessKey);
                      if (moduleDef.actions) {
                        for (const a of moduleDef.actions) allModuleKeys.push(a.key);
                      }
                      if (moduleDef.subModules) {
                        for (const sm of moduleDef.subModules) {
                          for (const a of sm.actions) allModuleKeys.push(a.key);
                        }
                      }
                      const activeCount = allModuleKeys.filter((k) => userKeys.includes(k)).length;

                      return (
                        <div
                          key={moduleDef.key}
                          className="rounded-3xl border border-(--border) bg-white/70 p-5 shadow-xs transition-all dark:bg-white/5 dark:border-white/10"
                        >
                          {/* Module Accordion Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) pb-3">
                            <div
                              className="flex items-center gap-3 cursor-pointer select-none"
                              onClick={() => toggleAccordion(moduleDef.key)}
                            >
                              <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {moduleDef.category}
                              </span>
                              <h4 className="text-sm font-extrabold text-foreground">{moduleDef.label}</h4>
                              <span className="text-xs text-soft font-semibold">
                                ({activeCount}/{allModuleKeys.length} enabled)
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={16} className="text-soft" />
                              ) : (
                                <ChevronDown size={16} className="text-soft" />
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleAllModulePermissions(moduleDef, true)}
                                className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                              >
                                Select All
                              </button>
                              <span className="text-soft">|</span>
                              <button
                                type="button"
                                onClick={() => toggleAllModulePermissions(moduleDef, false)}
                                className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400 cursor-pointer"
                              >
                                Deselect All
                              </button>
                            </div>
                          </div>

                          {/* Accordion Body */}
                          {isExpanded && (
                            <div className="mt-4 flex flex-col gap-4 animate-in fade-in duration-150">
                              {moduleDef.description ? (
                                <p className="text-xs text-soft">{moduleDef.description}</p>
                              ) : null}

                              {/* Top-Level Actions */}
                              {moduleDef.actions && moduleDef.actions.length > 0 ? (
                                <div>
                                  <p className="mb-2 text-xs font-extrabold text-soft uppercase tracking-wider">
                                    Actions & Operations
                                  </p>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {moduleDef.actions.map((action) => {
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
                              ) : null}

                              {/* Submodules / Approval Types / Scopes */}
                              {moduleDef.subModules && moduleDef.subModules.length > 0 ? (
                                <div className="grid gap-4">
                                  {moduleDef.subModules.map((subModule) => {
                                    const subModuleKeys = subModule.actions.map((a) => a.key);
                                    const allChecked = subModuleKeys.every((k) => userKeys.includes(k));

                                    return (
                                      <div
                                        key={subModule.label}
                                        className="rounded-2xl border border-(--border) bg-black/5 dark:bg-white/5 p-4"
                                      >
                                        <div className="flex items-center justify-between mb-3 border-b border-(--border) pb-2">
                                          <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                                            {subModule.label}
                                          </p>
                                          <div className="flex items-center gap-2 text-[11px]">
                                            <button
                                              type="button"
                                              onClick={() => toggleSubModulePermissions(subModule, true)}
                                              className="font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                                            >
                                              All
                                            </button>
                                            <span className="text-soft">|</span>
                                            <button
                                              type="button"
                                              onClick={() => toggleSubModulePermissions(subModule, false)}
                                              className="font-bold text-rose-600 hover:underline dark:text-rose-400 cursor-pointer"
                                            >
                                              Clear
                                            </button>
                                          </div>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="Select a User"
              description="Select a user from the left list to configure individual module and action permissions."
            />
          )}
        </section>
      )}

      {/* Paste Office Visibility Confirmation Modal */}
      {mounted && pasteOfficeModalOpen && copiedOfficeVisState && selectedUser
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setPasteOfficeModalOpen(false);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="paste-office-modal-title"
                className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4 text-slate-900 dark:text-white"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      <ClipboardPaste size={20} />
                    </div>
                    <h3
                      id="paste-office-modal-title"
                      className="text-lg font-extrabold text-slate-900 dark:text-white"
                    >
                      Paste Office Visibility
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasteOfficeModalOpen(false)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Are you sure you want to copy and apply all module-wise office visibility
                  permissions from{" "}
                  <strong className="font-extrabold text-slate-900 dark:text-white">
                    {copiedOfficeVisState.sourceUserName}
                  </strong>{" "}
                  to{" "}
                  <strong className="font-extrabold text-slate-900 dark:text-white">
                    {selectedUser.name}
                  </strong>
                  ?
                </p>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-50/80 p-4 text-xs font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                  <p className="font-bold mb-1">Configuration Overview:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                    <li>This will overwrite target user&apos;s current module office visibility.</li>
                    <li>Individual action permissions will remain untouched.</li>
                    <li>Changes will be saved and enforced immediately.</li>
                  </ul>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPasteOfficeModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void handleConfirmPasteOfficeVisibility()}
                  >
                    Confirm & Apply Visibility
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Paste Permissions Confirmation Modal (Section 2) */}
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
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      <ClipboardPaste size={20} />
                    </div>
                    <h3
                      id="paste-confirm-modal-title"
                      className="text-lg font-extrabold text-slate-900 dark:text-white"
                    >
                      Confirm Paste Permissions
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasteConfirmModalOpen(false)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Replace <strong className="font-bold text-slate-900 dark:text-white">{selectedUser.name}</strong>&apos;s current module/action permissions with the copied permission set ({copiedPermissionsState.permissionKeys.length} permissions) from{" "}
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

/**
 * ModuleOfficeCard: Dedicated component for configuring offices for a single module.
 * Features Categorized Multi-Select Dropdown (Assigned Offices vs Global Offices),
 * Search, Select All, Clear All, Selected Count display, and Save button.
 */
function ModuleOfficeCard({
  moduleItem,
  selectedOfficeIds,
  assignedOffices,
  globalOffices,
  isSaving,
  onChange,
  onSave,
}: {
  moduleItem: ModuleDefinitionItem;
  selectedOfficeIds: string[];
  assignedOffices: OfficeLocationItem[];
  globalOffices: OfficeLocationItem[];
  isSaving: boolean;
  onChange: (officeIds: string[]) => void;
  onSave: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredAssigned = useMemo(() => {
    if (!searchQuery.trim()) return assignedOffices;
    const q = searchQuery.toLowerCase().trim();
    return assignedOffices.filter(
      (o) => o.officeName.toLowerCase().includes(q) || o.location.toLowerCase().includes(q)
    );
  }, [assignedOffices, searchQuery]);

  const filteredGlobal = useMemo(() => {
    if (!searchQuery.trim()) return globalOffices;
    const q = searchQuery.toLowerCase().trim();
    return globalOffices.filter(
      (o) => o.officeName.toLowerCase().includes(q) || o.location.toLowerCase().includes(q)
    );
  }, [globalOffices, searchQuery]);

  const selectedCount = selectedOfficeIds.length;
  const assignedIds = new Set(assignedOffices.map((o) => o.id));
  const globalIds = new Set(globalOffices.map((o) => o.id));

  const selectedAssignedCount = selectedOfficeIds.filter((id) => assignedIds.has(id)).length;
  const selectedGlobalCount = selectedOfficeIds.filter((id) => globalIds.has(id)).length;

  function toggleOffice(officeId: string) {
    if (selectedOfficeIds.includes(officeId)) {
      onChange(selectedOfficeIds.filter((id) => id !== officeId));
    } else {
      onChange([...selectedOfficeIds, officeId]);
    }
  }

  function handleSelectAll() {
    const allIds = Array.from(
      new Set([...assignedOffices.map((o) => o.id), ...globalOffices.map((o) => o.id)])
    );
    onChange(allIds);
  }

  function handleClearAll() {
    onChange([]);
  }

  function handleSelectAllAssigned() {
    const nonAssigned = selectedOfficeIds.filter((id) => !assignedIds.has(id));
    onChange(Array.from(new Set([...nonAssigned, ...assignedOffices.map((o) => o.id)])));
  }

  function handleClearAllAssigned() {
    onChange(selectedOfficeIds.filter((id) => !assignedIds.has(id)));
  }

  function handleSelectAllGlobal() {
    const nonGlobal = selectedOfficeIds.filter((id) => !globalIds.has(id));
    onChange(Array.from(new Set([...nonGlobal, ...globalOffices.map((o) => o.id)])));
  }

  function handleClearAllGlobal() {
    onChange(selectedOfficeIds.filter((id) => !globalIds.has(id)));
  }

  // Get office names for pill display
  const allOfficeMap = useMemo(() => {
    const map = new Map<string, { name: string; isAssigned: boolean }>();
    for (const o of assignedOffices) map.set(o.id, { name: o.officeName, isAssigned: true });
    for (const o of globalOffices) map.set(o.id, { name: o.officeName, isAssigned: false });
    return map;
  }, [assignedOffices, globalOffices]);

  return (
    <div className="rounded-3xl border border-(--border) bg-white/70 p-5 shadow-xs transition-all dark:bg-white/5 dark:border-white/10 hover:border-blue-500/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Module Title & Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {moduleItem.category}
            </span>
            <h4 className="text-sm font-extrabold text-foreground">{moduleItem.label}</h4>
          </div>
          <p className="text-xs text-soft mt-1 leading-relaxed">{moduleItem.description}</p>
        </div>

        {/* Action Button: Save Module Visibility */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            disabled={isSaving}
            onClick={onSave}
            className="text-xs"
          >
            <Save size={13} />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Office Multi-Select Dropdown Container */}
      <div className="mt-4 pt-3 border-t border-(--border) flex flex-col gap-2.5" ref={dropdownRef}>
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Building2 size={14} className="text-blue-600 dark:text-blue-400" />
            Office Visibility:
          </label>
          <span className="text-[11px] font-semibold text-soft">
            {selectedCount === 0
              ? "No offices visible (Deny Access)"
              : `${selectedCount} ${selectedCount === 1 ? "office" : "offices"} visible`}
          </span>
        </div>

        {/* Dropdown Trigger Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs transition-all cursor-pointer ${
              isOpen
                ? "border-blue-500 bg-white ring-2 ring-blue-500/20 dark:bg-[#12141a]"
                : "border-(--border) bg-white/60 hover:bg-white hover:border-slate-400 dark:bg-white/5 dark:hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className={`font-bold ${
                  selectedCount > 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {selectedCount === 0
                  ? "Select Offices ▼"
                  : `${selectedCount} offices selected`}
              </span>
              {selectedCount > 0 ? (
                <span className="text-[11px] text-soft">
                  ({selectedAssignedCount} assigned, {selectedGlobalCount} global)
                </span>
              ) : null}
            </div>
            {isOpen ? <ChevronUp size={16} className="text-soft" /> : <ChevronDown size={16} className="text-soft" />}
          </button>

          {/* Dropdown Popover Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#12141a] animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3 max-h-96 overflow-hidden">
              {/* Search in Dropdown */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search offices..."
                  className="w-full rounded-xl border border-(--border) bg-slate-50/80 pl-8 pr-7 py-1.5 text-xs outline-none focus:border-blue-500 dark:bg-white/5"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-soft hover:text-foreground cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between border-b border-(--border) pb-2 text-[11px]">
                <span className="font-extrabold text-soft uppercase tracking-wider">
                  {selectedCount} Selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-soft">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="font-bold text-rose-600 hover:underline dark:text-rose-400 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Scrollable Categories List */}
              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                {/* 1. ASSIGNED OFFICES */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Building2 size={13} />
                      Assigned Offices ({selectedAssignedCount}/{assignedOffices.length})
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={handleSelectAllAssigned}
                        className="text-soft hover:text-foreground cursor-pointer"
                      >
                        All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleClearAllAssigned}
                        className="text-soft hover:text-foreground cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {filteredAssigned.length === 0 ? (
                    <p className="text-[11px] text-soft py-1 italic">No assigned offices found.</p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {filteredAssigned.map((office) => {
                        const checked = selectedOfficeIds.includes(office.id);
                        return (
                          <label
                            key={office.id}
                            className={`flex items-center gap-2.5 rounded-xl border p-2 cursor-pointer transition-colors ${
                              checked
                                ? "border-blue-500 bg-blue-50/80 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
                                : "border-(--border) bg-white/40 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white/10"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOffice(office.id)}
                              className="h-3.5 w-3.5 rounded border-(--border) text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="truncate text-xs font-bold">{office.officeName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. GLOBAL OFFICES */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 size={13} />
                      Global Offices ({selectedGlobalCount}/{globalOffices.length})
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={handleSelectAllGlobal}
                        className="text-soft hover:text-foreground cursor-pointer"
                      >
                        All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleClearAllGlobal}
                        className="text-soft hover:text-foreground cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {filteredGlobal.length === 0 ? (
                    <p className="text-[11px] text-soft py-1 italic">No global offices found.</p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {filteredGlobal.map((office) => {
                        const checked = selectedOfficeIds.includes(office.id);
                        return (
                          <label
                            key={office.id}
                            className={`flex items-center gap-2.5 rounded-xl border p-2 cursor-pointer transition-colors ${
                              checked
                                ? "border-blue-500 bg-blue-50/80 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
                                : "border-(--border) bg-white/40 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white/10"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOffice(office.id)}
                              className="h-3.5 w-3.5 rounded border-(--border) text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="truncate text-xs font-bold">{office.officeName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Offices Tag Pills Below Dropdown */}
        {selectedOfficeIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedOfficeIds.map((id) => {
              const info = allOfficeMap.get(id);
              if (!info) return null;
              return (
                <span
                  key={id}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold border transition-colors ${
                    info.isAssigned
                      ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
                      : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10"
                  }`}
                >
                  <span className="truncate max-w-40">{info.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleOffice(id)}
                    className="hover:opacity-70 cursor-pointer p-0.5"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
