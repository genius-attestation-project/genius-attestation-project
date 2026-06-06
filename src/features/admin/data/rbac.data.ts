import {
  BadgeCheck,
  BadgeDollarSign,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  Clock3,
  FileSearch,
  Handshake,
  Home,
  Layers3,
  MessageSquareQuote,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const permissionActions = ["view", "create", "edit", "delete", "manage", "export"] as const;

export type PermissionAction = (typeof permissionActions)[number];

export type NavigationItemDefinition = {
  label: string;
  href: string;
  icon: LucideIcon;
  menuPermission: string;
  pagePermission: string;
  children?: NavigationItemDefinition[];
};

export type PermissionModuleDefinition = {
  key: string;
  label: string;
  description: string;
  actions?: readonly PermissionAction[];
};

export const sidebarNavigation: NavigationItemDefinition[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Home,
    menuPermission: "menu.dashboard",
    pagePermission: "dashboard.view",
  },
  {
    label: "Admin Management",
    href: "/dashboard/admin-management",
    icon: ShieldCheck,
    menuPermission: "menu.admin-management",
    pagePermission: "admin_management.view",
    children: [
      {
        label: "Users",
        href: "/dashboard/admin-management/users",
        icon: Users,
        menuPermission: "menu.admin-management.users",
        pagePermission: "users.view",
      },
      {
        label: "Roles",
        href: "/dashboard/admin-management/roles",
        icon: ShieldCheck,
        menuPermission: "menu.admin-management.roles",
        pagePermission: "roles.view",
      },
      {
        label: "Department",
        href: "/dashboard/admin-management/department",
        icon: BriefcaseBusiness,
        menuPermission: "menu.admin-management.department",
        pagePermission: "departments.view",
      },
      {
        label: "Office Location",
        href: "/dashboard/admin-management/office-location",
        icon: UserCheck,
        menuPermission: "menu.admin-management.office-location",
        pagePermission: "office_locations.view",
      },
    ],
  },
  {
    label: "Lead Management",
    href: "/dashboard/lead-management",
    icon: Users,
    menuPermission: "menu.lead-management",
    pagePermission: "lead_management.view",
    children: [
      {
        label: "All Leads",
        href: "/dashboard/lead-management/all-leads",
        icon: Users,
        menuPermission: "menu.lead-management.all-leads",
        pagePermission: "leads.view",
      },
      {
        label: "Followups",
        href: "/dashboard/lead-management/followups",
        icon: Clock3,
        menuPermission: "menu.lead-management.followups",
        pagePermission: "followups.view",
      },
      {
        label: "Assign Leads",
        href: "/dashboard/lead-management/assign-leads",
        icon: UserRoundPlus,
        menuPermission: "menu.lead-management.assign-leads",
        pagePermission: "assigned_leads.view",
      },
      {
        label: "Pending Approval",
        href: "/dashboard/lead-management/pending-approval",
        icon: BadgeCheck,
        menuPermission: "menu.lead-management.pending-approval",
        pagePermission: "pending_approval.view",
      },
      {
        label: "LOB",
        href: "/dashboard/lead-management/lob",
        icon: Layers3,
        menuPermission: "menu.lead-management.lob",
        pagePermission: "lob.view",
      },
      {
        label: "Closed",
        href: "/dashboard/lead-management/closed",
        icon: PencilLine,
        menuPermission: "menu.lead-management.closed",
        pagePermission: "closed_leads.view",
      },
    ],
  },
  {
    label: "Revenue Registration",
    href: "/dashboard/revenue-registration",
    icon: BadgeDollarSign,
    menuPermission: "menu.revenue-registration",
    pagePermission: "revenue_registration.view",
  },
  {
    label: "Search / Report",
    href: "/dashboard/search-report",
    icon: FileSearch,
    menuPermission: "menu.search-report",
    pagePermission: "search_report.view",
  },
  {
    label: "BM Report",
    href: "/dashboard/bm-report",
    icon: ChartNoAxesColumn,
    menuPermission: "menu.bm-report",
    pagePermission: "bm_report.view",
  },
  {
    label: "Account Update",
    href: "/dashboard/account-update",
    icon: RefreshCw,
    menuPermission: "menu.account-update",
    pagePermission: "account_update.view",
  },
  {
    label: "Ready For Delivery",
    href: "/dashboard/ready-for-delivery",
    icon: Truck,
    menuPermission: "menu.ready-for-delivery",
    pagePermission: "ready_for_delivery.view",
  },
  {
    label: "Welcome Call",
    href: "/dashboard/welcome-call",
    icon: Handshake,
    menuPermission: "menu.welcome-call",
    pagePermission: "welcome_call.view",
  },
  {
    label: "Quote Of The Day",
    href: "/dashboard/quote-of-the-day",
    icon: MessageSquareQuote,
    menuPermission: "menu.quote-of-the-day",
    pagePermission: "quote_of_the_day.view",
  },
];

export const permissionModules: PermissionModuleDefinition[] = [
  { key: "dashboard", label: "Dashboard", description: "Dashboard module access." },
  { key: "admin_management", label: "Admin Management", description: "Admin workspace access." },
  { key: "users", label: "Users", description: "User management access." },
  { key: "roles", label: "Roles", description: "Role and RBAC access." },
  { key: "departments", label: "Department", description: "Department administration." },
  { key: "office_locations", label: "Office Location", description: "Office location administration." },
  { key: "lead_management", label: "Lead Management", description: "Lead workspace access." },
  { key: "leads", label: "All Leads", description: "Lead CRUD access." },
  { key: "followups", label: "Followups", description: "Followup lead access." },
  { key: "assigned_leads", label: "Assign Leads", description: "Assigned lead access." },
  { key: "pending_approval", label: "Pending Approval", description: "Pending approval access." },
  { key: "lob", label: "LOB", description: "Line of business access." },
  { key: "closed_leads", label: "Closed Leads", description: "Closed lead access." },
  { key: "revenue_registration", label: "Revenue Registration", description: "Revenue module access." },
  { key: "search_report", label: "Search / Report", description: "Search and reporting access." },
  { key: "bm_report", label: "BM Report", description: "BM reporting access." },
  { key: "account_update", label: "Account Update", description: "Account update access." },
  { key: "ready_for_delivery", label: "Ready For Delivery", description: "Delivery queue access." },
  { key: "welcome_call", label: "Welcome Call", description: "Welcome call access." },
  { key: "quote_of_the_day", label: "Quote Of The Day", description: "Quote of the day access." },
];

export const defaultRoleDefinitions = [
  {
    name: "Super Admin",
    description: "Full access to every module, API, and menu.",
    isActive: true,
    permissions: "*" as const,
  },
  {
    name: "Admin",
    description: "Administrative access across all operational modules.",
    isActive: true,
    permissions: "*" as const,
  },
  {
    name: "Manager",
    description: "Cross-functional team management access.",
    isActive: true,
    permissions: [
      "dashboard.view",
      "lead_management.view",
      "leads.view",
      "leads.create",
      "leads.edit",
      "followups.view",
      "pending_approval.view",
      "pending_approval.edit",
      "lob.view",
      "closed_leads.view",
      "search_report.view",
      "search_report.export",
      "account_update.view",
      "ready_for_delivery.view",
      "welcome_call.view",
      "menu.dashboard",
      "menu.lead-management",
      "menu.lead-management.all-leads",
      "menu.lead-management.followups",
      "menu.lead-management.pending-approval",
      "menu.lead-management.lob",
      "menu.lead-management.closed",
      "menu.search-report",
      "menu.account-update",
      "menu.ready-for-delivery",
      "menu.welcome-call",
    ],
  },
  {
    name: "Staff",
    description: "Basic operational access to assigned lead workflows.",
    isActive: true,
    permissions: [
      "dashboard.view",
      "lead_management.view",
      "leads.view",
      "followups.view",
      "menu.dashboard",
      "menu.lead-management",
      "menu.lead-management.all-leads",
      "menu.lead-management.followups",
    ],
  },
  {
    name: "Sales",
    description: "Sales-focused access to lead creation, editing, and reporting.",
    isActive: true,
    permissions: [
      "dashboard.view",
      "lead_management.view",
      "leads.view",
      "leads.create",
      "leads.edit",
      "followups.view",
      "revenue_registration.view",
      "search_report.view",
      "search_report.export",
      "menu.dashboard",
      "menu.lead-management",
      "menu.lead-management.all-leads",
      "menu.lead-management.followups",
      "menu.revenue-registration",
      "menu.search-report",
    ],
  },
  {
    name: "Operations",
    description: "Operational access to delivery, approvals, and account updates.",
    isActive: true,
    permissions: [
      "dashboard.view",
      "lead_management.view",
      "leads.view",
      "followups.view",
      "pending_approval.view",
      "pending_approval.edit",
      "account_update.view",
      "ready_for_delivery.view",
      "welcome_call.view",
      "menu.dashboard",
      "menu.lead-management",
      "menu.lead-management.all-leads",
      "menu.lead-management.followups",
      "menu.lead-management.pending-approval",
      "menu.account-update",
      "menu.ready-for-delivery",
      "menu.welcome-call",
    ],
  },
] as const;

export function buildPermissionCatalog() {
  const permissionEntries = permissionModules.flatMap((moduleDefinition) =>
    permissionActions.map((action) => ({
      code: `${moduleDefinition.key}.${action}`,
      name: `${moduleDefinition.label} ${action[0].toUpperCase()}${action.slice(1)}`,
      module: moduleDefinition.label,
      description: `${action[0].toUpperCase()}${action.slice(1)} permission for ${moduleDefinition.label}.`,
    })),
  );

  const menuEntries = flattenNavigation(sidebarNavigation).map((item) => ({
    code: item.menuPermission,
    name: `${item.label} Menu`,
    module: "Menu Visibility",
    description: `Controls visibility for the ${item.label} navigation item.`,
  }));

  return [...permissionEntries, ...menuEntries];
}

export function flattenNavigation(items: NavigationItemDefinition[]): NavigationItemDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavigation(item.children) : [])]);
}
