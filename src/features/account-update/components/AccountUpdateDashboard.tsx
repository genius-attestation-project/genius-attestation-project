"use client";

import {
  BadgeCheck,
  BadgeDollarSign,
  Calculator,
  CircleX,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { StatsCard } from "@/components/ui/StatsCard";
import { Textarea } from "@/components/ui/Textarea";
import type {
  AccountTallyItem,
  AccountTallyResponse,
  AdminApprovalItem,
  AdminApprovalResponse,
  PaymentUpdateItem,
  PaymentUpdateResponse,
} from "@/features/account-update/types/account-update.types";

type TabKey = "payment-update" | "account-tally" | "admin-approval";

type AccountUpdateDashboardProps = {
  canApprove: boolean;
  canApproveAction: boolean;
  canSubmitPayment: boolean;
};

type ApprovalAction = "approve" | "reject";

const emptyPaymentData: PaymentUpdateResponse = {
  items: [],
  stats: {
    pendingCollections: 0,
    totalBalanceDue: 0,
  },
};

const emptyTallyData: AccountTallyResponse = {
  items: [],
  stats: {
    totalCredit: 0,
    totalDebit: 0,
    totalPending: 0,
  },
};

const emptyApprovalData: AdminApprovalResponse = {
  items: [],
  stats: {
    pendingApprovals: 0,
    approvedToday: 0,
    rejectedToday: 0,
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Rejected"
        ? "bg-rose-50 text-rose-700"
        : status === "Submitted"
          ? "bg-blue-50 text-blue-700"
          : "bg-amber-50 text-amber-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-(--border) bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-soft">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export function AccountUpdateDashboard({
  canApprove,
  canApproveAction,
  canSubmitPayment,
}: AccountUpdateDashboardProps) {
  const [paymentData, setPaymentData] = useState<PaymentUpdateResponse>(emptyPaymentData);
  const [tallyData, setTallyData] = useState<AccountTallyResponse>(emptyTallyData);
  const [approvalData, setApprovalData] = useState<AdminApprovalResponse>(emptyApprovalData);
  const [activeTab, setActiveTab] = useState<TabKey>("payment-update");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentUpdateItem | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [approvalModal, setApprovalModal] = useState<{ action: ApprovalAction; item: AdminApprovalItem } | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const requests: Array<Promise<unknown>> = [
        parseResponse<PaymentUpdateResponse>(await fetch("/api/account-update/payment-update", { cache: "no-store" })),
        parseResponse<AccountTallyResponse>(await fetch("/api/account-update/account-tally", { cache: "no-store" })),
      ];

      if (canApprove) {
        requests.push(
          parseResponse<AdminApprovalResponse>(
            await fetch("/api/account-update/admin-approval", { cache: "no-store" }),
          ),
        );
      }

      const [paymentResponse, tallyResponse, approvalResponse] = await Promise.all(requests);

      setPaymentData(paymentResponse as PaymentUpdateResponse);
      setTallyData(tallyResponse as AccountTallyResponse);
      setApprovalData((approvalResponse as AdminApprovalResponse) ?? emptyApprovalData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load account update data.");
      setPaymentData(emptyPaymentData);
      setTallyData(emptyTallyData);
      setApprovalData(emptyApprovalData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [canApprove]);

  const visibleTabs = useMemo(
    () =>
      [
        { key: "payment-update" as const, label: "Payment Update" },
        { key: "account-tally" as const, label: "Account Tally" },
        ...(canApprove ? [{ key: "admin-approval" as const, label: "Admin Approval" }] : []),
      ],
    [canApprove],
  );

  const cards = useMemo(() => {
    if (activeTab === "account-tally") {
      return [
        {
          label: "Total Credit",
          value: formatCurrency(tallyData.stats.totalCredit),
          delta: "Advance",
          description: "Advance paid collected so far",
          icon: BadgeDollarSign,
          tone: "blue" as const,
        },
        {
          label: "Total Debit",
          value: formatCurrency(tallyData.stats.totalDebit),
          delta: "Collected",
          description: "Balance payments submitted into finance tally",
          icon: Calculator,
          tone: "blue" as const,
        },
        {
          label: "Total Pending",
          value: formatCurrency(tallyData.stats.totalPending),
          delta: "Open",
          description: "Collections still pending after tally",
          icon: ClipboardCheck,
          tone: "amber" as const,
        },
      ];
    }

    if (activeTab === "admin-approval") {
      return [
        {
          label: "Pending Approvals",
          value: approvalData.stats.pendingApprovals.toLocaleString(),
          delta: "Queue",
          description: "Submitted collections awaiting finance action",
          icon: ShieldCheck,
          tone: "amber" as const,
        },
        {
          label: "Approved Today",
          value: approvalData.stats.approvedToday.toLocaleString(),
          delta: "Today",
          description: "Collections released into dashboard revenue today",
          icon: BadgeCheck,
          tone: "blue" as const,
        },
        {
          label: "Rejected Today",
          value: approvalData.stats.rejectedToday.toLocaleString(),
          delta: "Today",
          description: "Collections returned for correction today",
          icon: CircleX,
          tone: "slate" as const,
        },
      ];
    }

    return [
      {
        label: "Pending Collections",
        value: paymentData.stats.pendingCollections.toLocaleString(),
        delta: "Queue",
        description: "Registrations still waiting for balance collection",
        icon: ClipboardCheck,
        tone: "amber" as const,
      },
      {
        label: "Total Balance Due",
        value: formatCurrency(paymentData.stats.totalBalanceDue),
        delta: "Live",
        description: "Outstanding balance currently visible in payment update",
        icon: BadgeDollarSign,
        tone: "blue" as const,
      },
    ];
  }, [activeTab, approvalData.stats, paymentData.stats, tallyData.stats]);

  async function handleSubmitPayment() {
    if (!selectedPayment) {
      return;
    }

    setSubmittingPayment(true);
    setError("");
    setSuccess("");

    try {
      const payload = await parseResponse<{ message?: string }>(
        await fetch(`/api/account-update/payment-submit/${selectedPayment.id}`, {
          method: "POST",
        }),
      );

      setSelectedPayment(null);
      setSuccess(payload.message ?? "Payment submitted successfully.");
      await loadData();
      setActiveTab("account-tally");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit payment.");
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function handleApprovalAction() {
    if (!approvalModal) {
      return;
    }

    if (approvalModal.action === "reject" && !approvalReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    setSubmittingApproval(true);
    setError("");
    setSuccess("");

    try {
      const payload = await parseResponse<{ message?: string }>(
        await fetch(`/api/account-update/admin-approval/${approvalModal.item.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: approvalModal.action,
            reason: approvalReason.trim(),
          }),
        }),
      );

      setApprovalModal(null);
      setApprovalReason("");
      setSuccess(payload.message ?? "Approval updated successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update finance approval.");
    } finally {
      setSubmittingApproval(false);
    }
  }

  const activeApprovalRows = approvalData.items;

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_42%),linear-gradient(135deg,_#ffffff,_#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Account Update</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Financial workflow control</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Move pending balance collections through payment submission, tally reconciliation, and finance approval without duplicating records or breaking the existing registration flow.
        </p>
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
        <div className="flex flex-wrap gap-3">
          {visibleTabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "rounded-2xl border px-4 py-3 text-left transition",
                  active
                    ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "border-(--border) bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50",
                ].join(" ")}
              >
                <span className="block text-sm font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`grid gap-4 ${cards.length >= 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
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
          Loading account update workflow...
        </div>
      ) : activeTab === "payment-update" ? (
        paymentData.items.length ? (
          <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
            <div className="overflow-x-auto">
              <table className="min-w-[1240px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <tr>
                    <th className="px-5 py-4">Tracking Number</th>
                    <th className="px-5 py-4">Customer Name</th>
                    <th className="px-5 py-4">Process Type</th>
                    <th className="px-5 py-4">Total Charges</th>
                    <th className="px-5 py-4">Advance Paid</th>
                    <th className="px-5 py-4">Balance Amount</th>
                    <th className="px-5 py-4">Payment Mode</th>
                    <th className="px-5 py-4">Registration Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white">
                  {paymentData.items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-blue-50/70">
                      <td className="px-5 py-4 font-bold text-blue-700">{item.trackingNumber}</td>
                      <td className="px-5 py-4">{item.customerName}</td>
                      <td className="px-5 py-4">{item.processType}</td>
                      <td className="px-5 py-4">{formatCurrency(item.totalCharges)}</td>
                      <td className="px-5 py-4">{formatCurrency(item.advancePaid)}</td>
                      <td className="px-5 py-4 font-semibold text-amber-700">{formatCurrency(item.balanceAmount)}</td>
                      <td className="px-5 py-4">{item.paymentMode}</td>
                      <td className="px-5 py-4">{item.registrationDate}</td>
                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          onClick={() => setSelectedPayment(item)}
                          disabled={!canSubmitPayment}
                        >
                          Submit Payment
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title="No pending balance collections"
            description="Registrations with outstanding balance will appear here automatically."
          />
        )
      ) : activeTab === "account-tally" ? (
        tallyData.items.length ? (
          <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <tr>
                    <th className="px-5 py-4">Tracking Number</th>
                    <th className="px-5 py-4">Credit</th>
                    <th className="px-5 py-4">Debit</th>
                    <th className="px-5 py-4">Pending Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white">
                  {tallyData.items.map((item: AccountTallyItem) => (
                    <tr key={item.id} className="transition hover:bg-blue-50/70">
                      <td className="px-5 py-4 font-bold text-blue-700">{item.trackingNumber}</td>
                      <td className="px-5 py-4">{formatCurrency(item.credit)}</td>
                      <td className="px-5 py-4">{formatCurrency(item.debit)}</td>
                      <td className="px-5 py-4 font-semibold">{formatCurrency(item.pendingAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-(--border) bg-slate-50 text-sm font-bold text-slate-800">
                  <tr>
                    <td className="px-5 py-4">Totals</td>
                    <td className="px-5 py-4">{formatCurrency(tallyData.stats.totalCredit)}</td>
                    <td className="px-5 py-4">{formatCurrency(tallyData.stats.totalDebit)}</td>
                    <td className="px-5 py-4">{formatCurrency(tallyData.stats.totalPending)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Calculator}
            title="No account tally rows yet"
            description="Financial credit and debit entries will appear once registrations carry payment values."
          />
        )
      ) : activeApprovalRows.length ? (
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] text-left text-sm">
              <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                <tr>
                  <th className="px-5 py-4">Tracking Number</th>
                  <th className="px-5 py-4">Customer Name</th>
                  <th className="px-5 py-4">Process Type</th>
                  <th className="px-5 py-4">Total Charges</th>
                  <th className="px-5 py-4">Advance Paid</th>
                  <th className="px-5 py-4">Balance Amount</th>
                  <th className="px-5 py-4">Submitted By</th>
                  <th className="px-5 py-4">Submitted Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {activeApprovalRows.map((item) => (
                  <tr key={item.id} className="transition hover:bg-blue-50/70">
                    <td className="px-5 py-4 font-bold text-blue-700">{item.trackingNumber}</td>
                    <td className="px-5 py-4">{item.customerName}</td>
                    <td className="px-5 py-4">{item.processType}</td>
                    <td className="px-5 py-4">{formatCurrency(item.totalCharges)}</td>
                    <td className="px-5 py-4">{formatCurrency(item.advancePaid)}</td>
                    <td className="px-5 py-4">{formatCurrency(item.balanceAmount)}</td>
                    <td className="px-5 py-4">{item.submittedBy}</td>
                    <td className="px-5 py-4">{item.submittedDate}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.financeApprovalStatus} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setApprovalModal({ action: "approve", item });
                            setApprovalReason("");
                          }}
                          disabled={!canApproveAction || item.financeApprovalStatus === "Approved"}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setApprovalModal({ action: "reject", item });
                            setApprovalReason(item.rejectionReason ?? "");
                          }}
                          disabled={!canApproveAction}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No finance approvals pending"
          description="Submitted payment updates will appear here for finance review."
        />
      )}

      <FormDrawer
        open={Boolean(selectedPayment)}
        onClose={() => {
          if (!submittingPayment) {
            setSelectedPayment(null);
          }
        }}
        title="Submit balance payment"
        description="Confirm that the pending balance was received successfully so the registration can move into account tally."
        placement="center"
      >
        {selectedPayment ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailBlock label="Tracking Number" value={selectedPayment.trackingNumber} />
              <DetailBlock label="Customer Name" value={selectedPayment.customerName} />
              <DetailBlock label="Balance Amount" value={formatCurrency(selectedPayment.balanceAmount)} />
              <DetailBlock label="Payment Mode" value={selectedPayment.paymentMode} />
            </div>
            <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              Balance received successfully.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSelectedPayment(null)} disabled={submittingPayment}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmitPayment()} disabled={submittingPayment || !canSubmitPayment}>
                {submittingPayment ? "Submitting..." : "Confirm Submit"}
              </Button>
            </div>
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(approvalModal)}
        onClose={() => {
          if (!submittingApproval) {
            setApprovalModal(null);
          }
        }}
        title={approvalModal?.action === "approve" ? "Approve finance update" : "Reject finance update"}
        description={
          approvalModal?.action === "approve"
            ? "Approve this submitted payment so the revenue is counted on the dashboard."
            : "Provide the rejection reason before sending this collection back for correction."
        }
        placement="center"
      >
        {approvalModal ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailBlock label="Tracking Number" value={approvalModal.item.trackingNumber} />
              <DetailBlock label="Customer Name" value={approvalModal.item.customerName} />
              <DetailBlock label="Balance Amount" value={formatCurrency(approvalModal.item.balanceAmount)} />
              <DetailBlock label="Submitted By" value={approvalModal.item.submittedBy} />
            </div>
            {approvalModal.action === "reject" ? (
              <Textarea
                label="Rejection Reason"
                value={approvalReason}
                onChange={(event) => setApprovalReason(event.target.value)}
                placeholder="Explain what must be corrected before approval."
              />
            ) : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setApprovalModal(null)} disabled={submittingApproval}>
                Cancel
              </Button>
              <Button
                variant={approvalModal.action === "approve" ? "primary" : "danger"}
                onClick={() => void handleApprovalAction()}
                disabled={submittingApproval || !canApproveAction}
              >
                {submittingApproval
                  ? approvalModal.action === "approve"
                    ? "Approving..."
                    : "Rejecting..."
                  : approvalModal.action === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </div>
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
