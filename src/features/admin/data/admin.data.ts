export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  officeLocation: string;
  status: "Active" | "Inactive";
  lastLogin: string;
  createdDate: string;
};

export type RoleRow = {
  id: string;
  name: string;
  badge: string;
  users: number;
  access: string[];
};

export type DepartmentRow = {
  id: string;
  name: string;
  code: string;
  manager: string;
  employeeCount: number;
  status: "Active" | "Inactive";
};

export type OfficeLocationRow = {
  id: string;
  officeName: string;
  location: string;
  timezone: string;
  employees: number;
  status: "Active" | "Inactive";
};

export const users: UserRow[] = [
  {
    id: "USR-1001",
    name: "Ananya Das",
    email: "ananya@geniuserp.com",
    role: "Admin",
    department: "Operations",
    officeLocation: "Kochi HQ",
    status: "Active",
    lastLogin: "10 min ago",
    createdDate: "May 10, 2026",
  },
  {
    id: "USR-1002",
    name: "Rohan James",
    email: "rohan@geniuserp.com",
    role: "Sales Lead",
    department: "Revenue",
    officeLocation: "Bengaluru Hub",
    status: "Active",
    lastLogin: "42 min ago",
    createdDate: "Apr 27, 2026",
  },
  {
    id: "USR-1003",
    name: "Meera S",
    email: "meera@geniuserp.com",
    role: "Support Supervisor",
    department: "Customer Success",
    officeLocation: "Dubai Office",
    status: "Inactive",
    lastLogin: "Yesterday",
    createdDate: "Apr 18, 2026",
  },
  {
    id: "USR-1004",
    name: "Faizal P",
    email: "faizal@geniuserp.com",
    role: "Finance Analyst",
    department: "Finance",
    officeLocation: "Kochi HQ",
    status: "Active",
    lastLogin: "2 hrs ago",
    createdDate: "Mar 31, 2026",
  },
];

export const roles: RoleRow[] = [
  {
    id: "RL-01",
    name: "Admin",
    badge: "Core",
    users: 4,
    access: ["Home", "Admin Management", "Reports", "Revenue"],
  },
  {
    id: "RL-02",
    name: "Sales Lead",
    badge: "Revenue",
    users: 9,
    access: ["Home", "Lead Management", "Revenue Registration", "Search / Report"],
  },
  {
    id: "RL-03",
    name: "Support Supervisor",
    badge: "Operations",
    users: 6,
    access: ["Home", "Account Update", "Ready For Delivery", "Welcome Call"],
  },
];

export const departments: DepartmentRow[] = [
  {
    id: "DP-01",
    name: "Operations",
    code: "OPS",
    manager: "Ananya Das",
    employeeCount: 26,
    status: "Active",
  },
  {
    id: "DP-02",
    name: "Revenue",
    code: "REV",
    manager: "Rohan James",
    employeeCount: 18,
    status: "Active",
  },
  {
    id: "DP-03",
    name: "Customer Success",
    code: "CS",
    manager: "Meera S",
    employeeCount: 14,
    status: "Active",
  },
  {
    id: "DP-04",
    name: "Finance",
    code: "FIN",
    manager: "Faizal P",
    employeeCount: 8,
    status: "Inactive",
  },
];

export const officeLocations: OfficeLocationRow[] = [
  {
    id: "OF-01",
    officeName: "Kochi HQ",
    location: "Kochi, India",
    timezone: "Asia/Kolkata",
    employees: 34,
    status: "Active",
  },
  {
    id: "OF-02",
    officeName: "Bengaluru Hub",
    location: "Bengaluru, India",
    timezone: "Asia/Kolkata",
    employees: 21,
    status: "Active",
  },
  {
    id: "OF-03",
    officeName: "Dubai Office",
    location: "Dubai, UAE",
    timezone: "Asia/Dubai",
    employees: 13,
    status: "Active",
  },
];

export const permissionMatrix = [
  {
    permission: "User CRUD",
    admin: true,
    salesLead: false,
    supportSupervisor: false,
  },
  {
    permission: "Lead pipeline",
    admin: true,
    salesLead: true,
    supportSupervisor: false,
  },
  {
    permission: "Revenue registration",
    admin: true,
    salesLead: true,
    supportSupervisor: false,
  },
  {
    permission: "Delivery queue",
    admin: true,
    salesLead: false,
    supportSupervisor: true,
  },
];
