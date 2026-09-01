export type CatalogAction = {
  key: string;               // Unique matrix key, e.g. "account_menu.view"
  label: string;             // Display label, e.g. "View"
  code: string;              // System permission code, e.g. "account_menu.view"
  menuPermissions?: string[];// Navigation menu permission codes to grant
  impliedPermissions?: string[]; // Implied parent page or action codes
};

export type CatalogSubModule = {
  key: string;
  label: string;
  actions: CatalogAction[];
};

export type CatalogModule = {
  key: string;
  label: string;
  description?: string;
  subModules?: CatalogSubModule[];
  actions?: CatalogAction[];
};

export const PERMISSION_CATALOG: CatalogModule[] = [
  {
    key: "revenue_registration",
    label: "REVENUE REGISTRATION",
    description: "Revenue registration document management",
    actions: [
      {
        key: "revenue_registration.view",
        label: "View",
        code: "revenue_registration.view",
        menuPermissions: ["menu.revenue-registration"],
        impliedPermissions: ["revenue_registration.view"],
      },
      {
        key: "revenue_registration.create",
        label: "Create",
        code: "revenue_registration.create",
        menuPermissions: ["menu.revenue-registration"],
        impliedPermissions: ["revenue_registration.view"],
      },
      {
        key: "revenue_registration.edit",
        label: "Edit",
        code: "revenue_registration.edit",
        menuPermissions: ["menu.revenue-registration"],
        impliedPermissions: ["revenue_registration.view"],
      },
      {
        key: "revenue_registration.delete",
        label: "Delete",
        code: "revenue_registration.delete",
        menuPermissions: ["menu.revenue-registration"],
        impliedPermissions: ["revenue_registration.view"],
      },
      {
        key: "revenue_registration.import",
        label: "Import",
        code: "revenue_registration.import",
        menuPermissions: ["menu.revenue-registration"],
        impliedPermissions: ["revenue_registration.view", "revenue_registration.downloadTemplate", "revenue_registration.viewImportHistory"],
      },
      {
        key: "revenue_registration.export",
        label: "Export",
        code: "revenue_registration.export",
        menuPermissions: ["menu.revenue-registration"],
        impliedPermissions: ["revenue_registration.view"],
      },
    ],
  },
  {
    key: "home",
    label: "HOME",
    description: "Home document workflow and bundle management",
    subModules: [
      {
        key: "document_in_hand",
        label: "Document In Hand",
        actions: [
          {
            key: "home.document_in_hand.view",
            label: "View",
            code: "home.view",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view"],
          },
          {
            key: "home.document_in_hand.transfer",
            label: "Transfer",
            code: "home.transfer",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view"],
          },
        ],
      },
      {
        key: "inbound_bundles",
        label: "Inbound Bundles",
        actions: [
          {
            key: "home.inbound.view",
            label: "View",
            code: "home.view",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view"],
          },
          {
            key: "home.inbound.receive",
            label: "Receive",
            code: "home.receive",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view"],
          },
          {
            key: "home.inbound.return",
            label: "Return",
            code: "home.return",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view"],
          },
        ],
      },
      {
        key: "outbound_bundles",
        label: "Outbound Bundles",
        actions: [
          {
            key: "home.outbound.view",
            label: "View",
            code: "home.view",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view"],
          },
          {
            key: "home.outbound.retrieve",
            label: "Retrieve",
            code: "home.retrieve",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view"],
          },
        ],
      },
      {
        key: "movement_history",
        label: "Movement History",
        actions: [
          {
            key: "home.movement_history.view",
            label: "View",
            code: "movement_history.view",
            menuPermissions: ["menu.home"],
            impliedPermissions: ["home.view", "document_movement.view"],
          },
        ],
      },
    ],
  },
  {
    key: "process",
    label: "PROCESS MODULE",
    description: "External process assignment and bundle processing",
    subModules: [
      {
        key: "process_document_in_hand",
        label: "Document In Hand",
        actions: [
          {
            key: "process.document_in_hand.view",
            label: "View",
            code: "process.view",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
          {
            key: "process.document_in_hand.transfer",
            label: "Transfer To Assigned Office",
            code: "process.transfer",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
          {
            key: "process.document_in_hand.actions",
            label: "Transfer / Process Actions",
            code: "process.create",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view", "process.edit", "process.move", "process.complete"],
          },
        ],
      },
      {
        key: "process_inbound",
        label: "Inbound",
        actions: [
          {
            key: "process.inbound.view",
            label: "View",
            code: "process.view",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
          {
            key: "process.inbound.receive",
            label: "Receive",
            code: "process.receive",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
          {
            key: "process.inbound.return",
            label: "Return",
            code: "process.return",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
        ],
      },
      {
        key: "process_outbound",
        label: "Outbound",
        actions: [
          {
            key: "process.outbound.view",
            label: "View",
            code: "process.view",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
          {
            key: "process.outbound.retrieve",
            label: "Retrieve",
            code: "process.retrieve",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
        ],
      },
      {
        key: "process_bundle_movement",
        label: "Bundle Movement",
        actions: [
          {
            key: "process.bundle_movement.view",
            label: "View",
            code: "document_movement.view",
            menuPermissions: ["menu.process"],
            impliedPermissions: ["process.view"],
          },
        ],
      },
    ],
  },
  {
    key: "ready_for_delivery",
    label: "READY FOR DELIVERY",
    description: "Completed document delivery console",
    actions: [
      {
        key: "ready_for_delivery.view",
        label: "View",
        code: "ready_for_delivery.view",
        menuPermissions: ["menu.ready-for-delivery"],
        impliedPermissions: ["ready_for_delivery.view"],
      },
      {
        key: "ready_for_delivery.deliver",
        label: "Deliver",
        code: "ready_for_delivery.deliver",
        menuPermissions: ["menu.ready-for-delivery"],
        impliedPermissions: ["ready_for_delivery.view", "ready_for_delivery.undo", "ready_for_delivery.view_details"],
      },
    ],
  },
  {
    key: "welcome_call",
    label: "WELCOME CALL",
    description: "Post-registration welcome calls",
    actions: [
      {
        key: "welcome_call.view",
        label: "View",
        code: "welcome_call.view",
        menuPermissions: ["menu.welcome-call"],
        impliedPermissions: ["welcome_call.view"],
      },
      {
        key: "welcome_call.complete",
        label: "Complete",
        code: "welcome_call.complete",
        menuPermissions: ["menu.welcome-call"],
        impliedPermissions: ["welcome_call.view"],
      },
    ],
  },
  {
    key: "lead_management",
    label: "LEAD MANAGEMENT",
    description: "Leads, followups, LOB, and approvals",
    subModules: [
      {
        key: "all_leads",
        label: "All Leads",
        actions: [
          {
            key: "leads.view",
            label: "View",
            code: "leads.view",
            menuPermissions: ["menu.lead-management", "menu.lead-management.all-leads"],
            impliedPermissions: ["lead_management.view"],
          },
          {
            key: "leads.create",
            label: "Create",
            code: "leads.create",
            menuPermissions: ["menu.lead-management", "menu.lead-management.all-leads"],
            impliedPermissions: ["leads.view", "lead_management.view"],
          },
          {
            key: "leads.edit",
            label: "Edit",
            code: "leads.edit",
            menuPermissions: ["menu.lead-management", "menu.lead-management.all-leads"],
            impliedPermissions: ["leads.view", "lead_management.view"],
          },
          {
            key: "leads.delete",
            label: "Delete",
            code: "leads.delete",
            menuPermissions: ["menu.lead-management", "menu.lead-management.all-leads"],
            impliedPermissions: ["leads.view", "lead_management.view"],
          },
        ],
      },
      {
        key: "followups",
        label: "Followups",
        actions: [
          {
            key: "followups.view",
            label: "View",
            code: "followups.view",
            menuPermissions: ["menu.lead-management", "menu.lead-management.followups"],
            impliedPermissions: ["lead_management.view"],
          },
          {
            key: "followups.manage",
            label: "Manage",
            code: "followups.edit",
            menuPermissions: ["menu.lead-management", "menu.lead-management.followups"],
            impliedPermissions: ["followups.view", "lead_management.view"],
          },
        ],
      },
      {
        key: "assign_leads",
        label: "Assign Leads",
        actions: [
          {
            key: "assigned_leads.view",
            label: "View",
            code: "assigned_leads.view",
            menuPermissions: ["menu.lead-management", "menu.lead-management.assign-leads"],
            impliedPermissions: ["lead_management.view"],
          },
          {
            key: "assigned_leads.assign",
            label: "Assign",
            code: "assigned_leads.assign",
            menuPermissions: ["menu.lead-management", "menu.lead-management.assign-leads"],
            impliedPermissions: ["assigned_leads.view", "lead_management.view"],
          },
        ],
      },
      {
        key: "lob",
        label: "LOB",
        actions: [
          {
            key: "lob.view",
            label: "View",
            code: "lob.view",
            menuPermissions: ["menu.lead-management", "menu.lead-management.lob"],
            impliedPermissions: ["lead_management.view"],
          },
          {
            key: "lob.request",
            label: "Request",
            code: "lob.request",
            menuPermissions: ["menu.lead-management", "menu.lead-management.lob"],
            impliedPermissions: ["lob.view", "lead_management.view"],
          },
        ],
      },
      {
        key: "closed_leads",
        label: "Closed Leads",
        actions: [
          {
            key: "closed_leads.view",
            label: "View",
            code: "closed_leads.view",
            menuPermissions: ["menu.lead-management", "menu.lead-management.closed"],
            impliedPermissions: ["lead_management.view"],
          },
        ],
      },
      {
        key: "pending_approval",
        label: "Pending Approval",
        actions: [
          {
            key: "pending_approval.view",
            label: "View",
            code: "pending_approval.view",
            menuPermissions: ["menu.lead-management", "menu.lead-management.pending-approval"],
            impliedPermissions: ["lead_management.view"],
          },
          {
            key: "pending_approval.approve",
            label: "Approve",
            code: "pending_approval.approve",
            menuPermissions: ["menu.lead-management", "menu.lead-management.pending-approval"],
            impliedPermissions: ["pending_approval.view", "lead_management.view"],
          },
          {
            key: "pending_approval.reject",
            label: "Reject",
            code: "pending_approval.reject",
            menuPermissions: ["menu.lead-management", "menu.lead-management.pending-approval"],
            impliedPermissions: ["pending_approval.view", "lead_management.view"],
          },
        ],
      },
    ],
  },
  {
    key: "search_report",
    label: "SEARCH / REPORT",
    actions: [
      {
        key: "search_report.view",
        label: "View",
        code: "search_report.view",
        menuPermissions: ["menu.search-report", "menu.search-report.general"],
        impliedPermissions: ["search_report.view"],
      },
      {
        key: "search_report.export",
        label: "Export",
        code: "search_report.export",
        menuPermissions: ["menu.search-report"],
        impliedPermissions: ["search_report.view"],
      },
    ],
  },
  {
    key: "reports",
    label: "REPORTS & ANALYTICS",
    actions: [
      {
        key: "reports.view",
        label: "View",
        code: "reports.view",
        menuPermissions: ["menu.reports"],
        impliedPermissions: ["reports.view"],
      },
      {
        key: "reports.export",
        label: "Export",
        code: "reports.export",
        menuPermissions: ["menu.reports"],
        impliedPermissions: ["reports.view"],
      },
    ],
  },
  {
    key: "bm_report",
    label: "BM REPORT",
    actions: [
      {
        key: "bm_report.view",
        label: "View",
        code: "bm_report.view",
        menuPermissions: ["menu.bm-report"],
        impliedPermissions: ["bm_report.view"],
      },
      {
        key: "bm_report.export",
        label: "Export",
        code: "bm_report.export",
        menuPermissions: ["menu.bm-report"],
        impliedPermissions: ["bm_report.view"],
      },
    ],
  },
  {
    key: "assigned_office",
    label: "ASSIGNED OFFICE",
    actions: [
      {
        key: "assigned_office.view",
        label: "View",
        code: "assigned_office.view",
        menuPermissions: ["menu.assigned-office"],
        impliedPermissions: ["assigned_office.view"],
      },
      {
        key: "assigned_office.manage",
        label: "Manage",
        code: "assigned_office.manage",
        menuPermissions: ["menu.assigned-office"],
        impliedPermissions: ["assigned_office.view"],
      },
    ],
  },
  {
    key: "account_modules",
    label: "ACCOUNT MODULES",
    subModules: [
      {
        key: "account_panel",
        label: "Account Panel",
        actions: [
          {
            key: "account_panel.view",
            label: "View",
            code: "account_panel.view",
            menuPermissions: ["menu.account-panel"],
            impliedPermissions: ["account_panel.view"],
          },
          {
            key: "account_panel.create",
            label: "Create",
            code: "account_panel.create",
            menuPermissions: ["menu.account-panel"],
            impliedPermissions: ["account_panel.view"],
          },
        ],
      },
      {
        key: "account_statements",
        label: "Account Statements",
        actions: [
          {
            key: "account_statements.view",
            label: "View",
            code: "account_statements.view",
            menuPermissions: ["menu.account-statements"],
            impliedPermissions: ["account_statements.view"],
          },
          {
            key: "account_statements.export",
            label: "Export",
            code: "account_statements.export",
            menuPermissions: ["menu.account-statements"],
            impliedPermissions: ["account_statements.view"],
          },
        ],
      },
    ],
  },
  {
    key: "attendance",
    label: "ATTENDANCE",
    subModules: [
      {
        key: "attendance_records",
        label: "Dashboard & Records",
        actions: [
          {
            key: "attendance.view",
            label: "View",
            code: "attendance.view",
            menuPermissions: ["menu.attendance", "menu.attendance.dashboard", "menu.attendance.records"],
            impliedPermissions: ["attendance.view"],
          },
        ],
      },
      {
        key: "attendance_checkin",
        label: "Check In",
        actions: [
          {
            key: "attendance.check_in.view",
            label: "View",
            code: "attendance.check_in.view",
            menuPermissions: ["menu.attendance", "menu.attendance.records"],
            impliedPermissions: ["attendance.view"],
          },
        ],
      },
      {
        key: "attendance_checkout",
        label: "Check Out",
        actions: [
          {
            key: "attendance.check_out.view",
            label: "View",
            code: "attendance.check_out.view",
            menuPermissions: ["menu.attendance", "menu.attendance.records"],
            impliedPermissions: ["attendance.view"],
          },
        ],
      },
      {
        key: "daily_summary",
        label: "Daily Summary",
        actions: [
          {
            key: "attendance.summary.create",
            label: "Create",
            code: "attendance.summary.create",
            menuPermissions: ["menu.attendance", "menu.attendance.daily-summary"],
            impliedPermissions: ["attendance.view"],
          },
          {
            key: "attendance.summary.view",
            label: "View Approval",
            code: "attendance.summary.view",
            menuPermissions: ["menu.attendance", "menu.attendance.daily-summary-approval", "menu.attendance.approval"],
            impliedPermissions: ["attendance.view"],
          },
        ],
      },
      {
        key: "attendance_settings",
        label: "Settings",
        actions: [
          {
            key: "attendance_settings.manage",
            label: "Manage Settings",
            code: "attendance_settings.manage",
            menuPermissions: ["menu.attendance", "menu.attendance.settings"],
            impliedPermissions: ["attendance.view"],
          },
        ],
      },
    ],
  },
  {
    key: "leave",
    label: "LEAVE MANAGEMENT",
    subModules: [
      {
        key: "apply_leave",
        label: "Apply Leave",
        actions: [
          {
            key: "leave.create",
            label: "Apply",
            code: "leave.create",
            menuPermissions: ["menu.leave-management", "menu.leave-management.apply"],
            impliedPermissions: ["leave.view"],
          },
        ],
      },
      {
        key: "leave_requests",
        label: "Requests",
        actions: [
          {
            key: "leave.view",
            label: "View",
            code: "leave.view",
            menuPermissions: ["menu.leave-management", "menu.leave-management.requests"],
            impliedPermissions: ["leave.view"],
          },
        ],
      },
      {
        key: "leave_approval",
        label: "Approval",
        actions: [
          {
            key: "leave.approve",
            label: "Approve",
            code: "leave.approve",
            menuPermissions: ["menu.leave-management", "menu.leave-management.approval"],
            impliedPermissions: ["leave.view"],
          },
        ],
      },
      {
        key: "leave_reports",
        label: "Reports",
        actions: [
          {
            key: "leave.report",
            label: "Report",
            code: "leave.report",
            menuPermissions: ["menu.leave-management", "menu.leave-management.reports"],
            impliedPermissions: ["leave.view"],
          },
        ],
      },
    ],
  },
  {
    key: "salary",
    label: "SALARY MANAGEMENT",
    subModules: [
      {
        key: "salary_dashboard",
        label: "Dashboard",
        actions: [
          {
            key: "salary.view",
            label: "View",
            code: "salary.view",
            menuPermissions: ["menu.salary-management", "menu.salary-management.dashboard"],
            impliedPermissions: ["salary.view"],
          },
        ],
      },
      {
        key: "salary_calculator",
        label: "Calculator",
        actions: [
          {
            key: "salary.calculate",
            label: "Calculate",
            code: "salary.calculate",
            menuPermissions: ["menu.salary-management", "menu.salary-management.calculator"],
            impliedPermissions: ["salary.view"],
          },
        ],
      },
      {
        key: "monthly_payroll",
        label: "Monthly Payroll",
        actions: [
          {
            key: "salary.generate",
            label: "Generate",
            code: "salary.generate",
            menuPermissions: ["menu.salary-management", "menu.salary-management.monthly-payroll"],
            impliedPermissions: ["salary.view"],
          },
        ],
      },
      {
        key: "salary_reports",
        label: "Reports",
        actions: [
          {
            key: "salary.report",
            label: "Report",
            code: "salary.report",
            menuPermissions: ["menu.salary-management", "menu.salary-management.reports"],
            impliedPermissions: ["salary.view"],
          },
        ],
      },
    ],
  },
  {
    key: "master_configuration",
    label: "MASTER CONFIGURATION",
    description: "Master settings and option tables",
    subModules: [
      {
        key: "account_menu",
        label: "Account Menu",
        actions: [
          {
            key: "account_menu.view",
            label: "View",
            code: "account_menu.view",
            menuPermissions: ["menu.master-configuration", "menu.master-configuration.account-menu"],
            impliedPermissions: ["master_configuration.view", "account_menu.view"],
          },
          {
            key: "account_menu.manage",
            label: "Manage",
            code: "account_menu.update",
            menuPermissions: ["menu.master-configuration", "menu.master-configuration.account-menu"],
            impliedPermissions: ["master_configuration.view", "account_menu.view"],
          },
        ],
      },
      {
        key: "master_general",
        label: "General Master Settings",
        actions: [
          {
            key: "master_configuration.view",
            label: "View",
            code: "master_configuration.view",
            menuPermissions: ["menu.master-configuration"],
            impliedPermissions: ["master_configuration.view"],
          },
          {
            key: "master_configuration.manage",
            label: "Manage",
            code: "master_configuration.manage",
            menuPermissions: ["menu.master-configuration"],
            impliedPermissions: ["master_configuration.view"],
          },
        ],
      },
    ],
  },
  {
    key: "admin_management",
    label: "ADMIN MANAGEMENT",
    description: "Users, Roles, Departments, and Office Locations",
    subModules: [
      {
        key: "users",
        label: "Users",
        actions: [
          {
            key: "users.view",
            label: "View",
            code: "users.view",
            menuPermissions: ["menu.admin-management", "menu.admin-management.users"],
            impliedPermissions: ["admin_management.view"],
          },
          {
            key: "users.create",
            label: "Create",
            code: "users.create",
            menuPermissions: ["menu.admin-management", "menu.admin-management.users"],
            impliedPermissions: ["users.view", "admin_management.view"],
          },
          {
            key: "users.edit",
            label: "Edit",
            code: "users.edit",
            menuPermissions: ["menu.admin-management", "menu.admin-management.users"],
            impliedPermissions: ["users.view", "admin_management.view"],
          },
          {
            key: "users.delete",
            label: "Delete",
            code: "users.delete",
            menuPermissions: ["menu.admin-management", "menu.admin-management.users"],
            impliedPermissions: ["users.view", "admin_management.view"],
          },
        ],
      },
      {
        key: "roles",
        label: "Roles",
        actions: [
          {
            key: "roles.view",
            label: "View",
            code: "roles.view",
            menuPermissions: ["menu.admin-management", "menu.admin-management.roles"],
            impliedPermissions: ["admin_management.view"],
          },
        ],
      },
      {
        key: "department",
        label: "Department",
        actions: [
          {
            key: "departments.view",
            label: "View",
            code: "departments.view",
            menuPermissions: ["menu.admin-management", "menu.admin-management.department"],
            impliedPermissions: ["admin_management.view"],
          },
          {
            key: "departments.manage",
            label: "Manage",
            code: "departments.manage",
            menuPermissions: ["menu.admin-management", "menu.admin-management.department"],
            impliedPermissions: ["departments.view", "admin_management.view"],
          },
        ],
      },
      {
        key: "office_location",
        label: "Office Location",
        actions: [
          {
            key: "office_locations.view",
            label: "View",
            code: "office_locations.view",
            menuPermissions: ["menu.admin-management", "menu.admin-management.office-location"],
            impliedPermissions: ["admin_management.view"],
          },
          {
            key: "office_locations.manage",
            label: "Manage",
            code: "office_locations.manage",
            menuPermissions: ["menu.admin-management", "menu.admin-management.office-location"],
            impliedPermissions: ["office_locations.view", "admin_management.view"],
          },
        ],
      },
    ],
  },
];

/**
 * Builds a lookup map of all catalog actions indexed by action.key and action.code.
 */
const ACTION_KEY_LOOKUP = new Map<string, CatalogAction>();

for (const mod of PERMISSION_CATALOG) {
  if (mod.actions) {
    for (const act of mod.actions) {
      ACTION_KEY_LOOKUP.set(act.key, act);
      ACTION_KEY_LOOKUP.set(act.code, act);
    }
  }
  if (mod.subModules) {
    for (const sub of mod.subModules) {
      for (const act of sub.actions) {
        ACTION_KEY_LOOKUP.set(act.key, act);
        ACTION_KEY_LOOKUP.set(act.code, act);
      }
    }
  }
}

/**
 * Dynamically expands any given permission keys/codes into their complete set of
 * system permission codes, menu navigation codes, and implied parent page codes.
 */
export function expandPermissionsFromCatalog(keys: string[]): string[] {
  const result = new Set<string>(keys);

  for (const key of keys) {
    const action = ACTION_KEY_LOOKUP.get(key);
    if (action) {
      result.add(action.code);
      if (action.menuPermissions) {
        for (const m of action.menuPermissions) result.add(m);
      }
      if (action.impliedPermissions) {
        for (const imp of action.impliedPermissions) result.add(imp);
      }
    } else {
      // Fallback heuristics for unmapped or legacy permission keys
      if (key.startsWith("revenue_registration.")) {
        result.add("revenue_registration.view");
        result.add("menu.revenue-registration");
      } else if (key.startsWith("home.")) {
        result.add("home.view");
        result.add("menu.home");
      } else if (key.startsWith("process.")) {
        result.add("process.view");
        result.add("menu.process");
      } else if (key.startsWith("ready_for_delivery.")) {
        result.add("ready_for_delivery.view");
        result.add("menu.ready-for-delivery");
      } else if (key.startsWith("welcome_call.")) {
        result.add("welcome_call.view");
        result.add("menu.welcome-call");
      } else if (key.startsWith("leads.") || key.startsWith("followups.") || key.startsWith("assigned_leads.") || key.startsWith("lob.") || key.startsWith("closed_leads.")) {
        result.add("lead_management.view");
        result.add("menu.lead-management");
      } else if (key.startsWith("account_menu.")) {
        result.add("account_menu.view");
        result.add("master_configuration.view");
        result.add("menu.master-configuration");
        result.add("menu.master-configuration.account-menu");
      } else if (key.startsWith("attendance.")) {
        result.add("attendance.view");
        result.add("menu.attendance");
      }
    }
  }

  return Array.from(result);
}
