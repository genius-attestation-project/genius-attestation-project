import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { recentLeads } from "@/features/dashboard/data/dashboard.data";

export function DashboardTables() {
  return (
    <DashboardCard
      title="Recent Records"
      description="Latest lead entries from the current workspace pipeline."
    >
      <DataTable
        keyField="id"
        columns={[
          { key: "id", label: "Lead ID" },
          { key: "company", label: "Company" },
          { key: "owner", label: "Owner" },
          { key: "stage", label: "Stage" },
          { key: "amount", label: "Revenue" },
          {
            key: "priority",
            label: "Priority",
            render: (row) => (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10">
                {String(row.priority)}
              </span>
            ),
          },
        ]}
        rows={recentLeads}
      />
    </DashboardCard>
  );
}
