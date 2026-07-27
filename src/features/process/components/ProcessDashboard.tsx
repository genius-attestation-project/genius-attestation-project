"use client";

import { AssignedOfficeClient } from "@/features/assigned-office/components/AssignedOfficeClient";

export function ProcessDashboard() {
  return <AssignedOfficeClient permissions={{ "assigned_office.view": true }} />;
}
