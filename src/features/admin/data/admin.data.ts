export type OfficeLocationRow = {
  id: string;
  officeName: string;
  location: string;
  timezone: string;
  employees: number;
  status: "Active" | "Inactive";
};

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
