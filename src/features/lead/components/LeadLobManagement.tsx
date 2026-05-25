"use client";

import { AlertCircle, Layers3 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import type { LobResponse } from "@/features/lead/types/lead.types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function LeadLobManagement() {
  const [data, setData] = useState<LobResponse>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/leads/lob", { cache: "no-store" });
        const payload = (await response.json()) as LobResponse & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load LOB data.");
        }

        if (!ignore) {
          setData(payload);
        }
      } catch (fetchError) {
        console.error("Failed to load LOB data", fetchError);

        if (!ignore) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load LOB data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Lead Management"
        title="LOB"
        description="Live line-of-business performance grouped by service from PostgreSQL."
      />

      <DashboardCard title="Service Performance" description="Lead volume and revenue by service.">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load LOB data"
            description={error}
            action={<Button onClick={() => window.location.reload()}>Retry</Button>}
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Layers3}
            title="No Leads Found"
            description="No line-of-business data is available yet."
          />
        ) : (
          <DataTable
            keyField="service"
            rows={data.items}
            columns={[
              { key: "service", label: "Service" },
              { key: "leadCount", label: "Total Leads" },
              { key: "activeLeads", label: "Active Leads" },
              { key: "closedLeads", label: "Closed Leads" },
              {
                key: "totalRevenue",
                label: "Revenue",
                render: (row) => currencyFormatter.format(Number(row.totalRevenue)),
              },
            ]}
          />
        )}
      </DashboardCard>
    </div>
  );
}
