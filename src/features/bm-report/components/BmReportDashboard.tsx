"use client";

import { ArrowRightLeft, CheckCheck, Inbox, LoaderCircle, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatsCard } from "@/components/ui/StatsCard";
import type { BmReportItem, BmReportResponse, BmReportStats } from "@/features/bm-report/types/bm-report.types";

type BmReportDashboardProps = {
  currentOfficeLocationName: string;
};

type TabKey = "home" | "inward" | "outward";

const emptyStats: BmReportStats = {
  totalInward: 0,
  totalOutward: 0,
  acceptedToday: 0,
  pendingInward: 0,
};

const tabConfig: Array<{ key: TabKey; label: string; description: string }> = [
  { key: "home", label: "Home", description: "Accepted BM documents for your office" },
  { key: "inward", label: "Inward", description: "Pending documents arriving from other offices" },
  { key: "outward", label: "Outward", description: "Documents your office has routed elsewhere" },
];

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Accepted"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function BmTable({
  activeTab,
  items,
  acceptingId,
  onAccept,
}: {
  activeTab: TabKey;
  items: BmReportItem[];
  acceptingId: string | null;
  onAccept: (id: string) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <EmptyState
        icon={PackageCheck}
        title={`No ${activeTab} records`}
        description="Cross-office BM routing is live. Records will appear here as registrations move between offices."
      />
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
      <div className="overflow-x-auto">
        <table className="min-w-[1020px] text-left text-sm">
          <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
            <tr>
              <th className="px-5 py-4">Registration Number</th>
              <th className="px-5 py-4">Client Name</th>
              <th className="px-5 py-4">Service</th>
              <th className="px-5 py-4">{activeTab === "outward" ? "Delivery Location" : "Source Office"}</th>
              {activeTab === "inward" ? <th className="px-5 py-4">Delivery Location</th> : null}
              {activeTab === "home" ? <th className="px-5 py-4">Accepted Date</th> : null}
              {activeTab === "home" ? <th className="px-5 py-4">Accepted By</th> : null}
              {activeTab === "outward" ? <th className="px-5 py-4">Accepted Date</th> : null}
              {activeTab === "outward" ? <th className="px-5 py-4">Accepted By</th> : null}
              {activeTab === "inward" ? <th className="px-5 py-4">Created By</th> : null}
              {activeTab === "inward" ? <th className="px-5 py-4">Created Date</th> : null}
              <th className="px-5 py-4">Status</th>
              {activeTab === "inward" ? <th className="px-5 py-4">Action</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border) bg-white">
            {items.map((item) => (
              <tr key={item.id} className="transition hover:bg-blue-50/70">
                <td className="px-5 py-4 font-bold text-blue-700">{item.registrationNumber}</td>
                <td className="px-5 py-4">{item.clientName}</td>
                <td className="px-5 py-4">{item.service}</td>
                <td className="px-5 py-4">
                  {activeTab === "outward" ? item.deliveryLocation : item.sourceOffice}
                </td>
                {activeTab === "inward" ? <td className="px-5 py-4">{item.deliveryLocation}</td> : null}
                {activeTab === "home" ? <td className="px-5 py-4">{item.acceptedDate ?? "-"}</td> : null}
                {activeTab === "home" ? <td className="px-5 py-4">{item.acceptedBy ?? "-"}</td> : null}
                {activeTab === "outward" ? <td className="px-5 py-4">{item.acceptedDate ?? "-"}</td> : null}
                {activeTab === "outward" ? <td className="px-5 py-4">{item.acceptedBy ?? "-"}</td> : null}
                {activeTab === "inward" ? <td className="px-5 py-4">{item.createdBy}</td> : null}
                {activeTab === "inward" ? <td className="px-5 py-4">{item.createdDate}</td> : null}
                <td className="px-5 py-4">
                  <StatusBadge status={item.status} />
                </td>
                {activeTab === "inward" ? (
                  <td className="px-5 py-4">
                    <Button
                      size="sm"
                      disabled={acceptingId === item.id}
                      onClick={() => onAccept(item.id)}
                    >
                      {acceptingId === item.id ? "Accepting..." : "Accept"}
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BmReportDashboard({ currentOfficeLocationName }: BmReportDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [homeItems, setHomeItems] = useState<BmReportItem[]>([]);
  const [inwardItems, setInwardItems] = useState<BmReportItem[]>([]);
  const [outwardItems, setOutwardItems] = useState<BmReportItem[]>([]);
  const [stats, setStats] = useState<BmReportStats>(emptyStats);

  async function loadBmReport() {
    if (!currentOfficeLocationName) {
      setHomeItems([]);
      setInwardItems([]);
      setOutwardItems([]);
      setStats(emptyStats);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [home, inward, outward] = await Promise.all([
        parseResponse<BmReportResponse>(await fetch("/api/bm-report/home", { cache: "no-store" })),
        parseResponse<BmReportResponse>(await fetch("/api/bm-report/inward", { cache: "no-store" })),
        parseResponse<BmReportResponse>(await fetch("/api/bm-report/outward", { cache: "no-store" })),
      ]);

      setHomeItems(home.items ?? []);
      setInwardItems(inward.items ?? []);
      setOutwardItems(outward.items ?? []);
      setStats(home.stats ?? inward.stats ?? outward.stats ?? emptyStats);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load BM report.");
      setHomeItems([]);
      setInwardItems([]);
      setOutwardItems([]);
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBmReport();
  }, [currentOfficeLocationName]);

  const activeItems = useMemo(() => {
    if (activeTab === "inward") return inwardItems;
    if (activeTab === "outward") return outwardItems;
    return homeItems;
  }, [activeTab, homeItems, inwardItems, outwardItems]);

  async function handleAccept(id: string) {
    setAcceptingId(id);
    setError("");
    setSuccess("");

    try {
      await parseResponse(await fetch(`/api/bm-report/accept/${id}`, { method: "POST" }));
      setSuccess("Document accepted and moved to Home.");
      setActiveTab("home");
      await loadBmReport();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to accept document.");
    } finally {
      setAcceptingId(null);
    }
  }

  const cards = [
    {
      label: "Total Inward",
      value: stats.totalInward.toLocaleString(),
      delta: "Live",
      description: "Pending inward BM documents",
      icon: Inbox,
      tone: "blue" as const,
    },
    {
      label: "Total Outward",
      value: stats.totalOutward.toLocaleString(),
      delta: "Live",
      description: "Documents sent to other offices",
      icon: ArrowRightLeft,
      tone: "slate" as const,
    },
    {
      label: "Accepted Today",
      value: stats.acceptedToday.toLocaleString(),
      delta: "Today",
      description: "BM documents accepted at this office",
      icon: CheckCheck,
      tone: "blue" as const,
    },
    {
      label: "Pending Inward",
      value: stats.pendingInward.toLocaleString(),
      delta: "Action",
      description: "Documents waiting to be accepted",
      icon: LoaderCircle,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_42%),linear-gradient(135deg,_#ffffff,_#eff6ff)] p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">BM Report</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Office document routing</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Track inward, outward, and accepted BM documents using live revenue registrations routed by office location.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white/90 px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Current Office</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{currentOfficeLocationName || "Unassigned"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
        <div className="flex flex-wrap gap-3">
          {tabConfig.map((tab) => {
            const active = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "min-w-[160px] rounded-2xl border px-4 py-3 text-left transition",
                  active
                    ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "border-(--border) bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50",
                ].join(" ")}
              >
                <span className="block text-sm font-bold">{tab.label}</span>
                <span className={`mt-1 block text-xs ${active ? "text-blue-50" : "text-soft"}`}>{tab.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card)">
          Loading BM report...
        </div>
      ) : currentOfficeLocationName ? (
        <BmTable activeTab={activeTab} items={activeItems} acceptingId={acceptingId} onAccept={handleAccept} />
      ) : (
        <EmptyState
          icon={Inbox}
          title="Office location required"
          description="Assign an office location to this user to activate BM routing, inward, outward, and home views."
        />
      )}
    </div>
  );
}
