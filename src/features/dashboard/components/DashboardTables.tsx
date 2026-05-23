import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LeadRow } from "@/features/lead/types/lead.types";
import { Users } from "lucide-react";

export function DashboardTables({ rows }: { rows: LeadRow[] }) {
  return (
    <DashboardCard
      title="Recent Records"
      description="Latest lead entries from the current workspace pipeline."
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Leads Found"
          description="Recent lead records will appear here once new leads are added."
        />
      ) : (
        <DataTable
          keyField="id"
          columns={[
            { key: "leadCode", label: "Lead ID" },
            { key: "clientName", label: "Client Name" },
            { key: "assignedUser", label: "Owner" },
            { key: "status", label: "Stage" },
            { key: "amount", label: "Revenue" },
            {
              key: "service",
              label: "Priority",
              render: (row) => (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10">
                  {String(row.service)}
                </span>
              ),
            },
          ]}
          rows={rows}
        />
      )}
    </DashboardCard>
  );
}
