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
