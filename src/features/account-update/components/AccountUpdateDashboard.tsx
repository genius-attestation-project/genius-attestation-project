"use client";

import {
  BadgeCheck,
  Banknote,
  ClipboardCheck,
  Eye,
  FileSearch,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  WalletCards,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { StatsCard } from "@/components/ui/StatsCard";
import { Textarea } from "@/components/ui/Textarea";
import type {
  AccountStatementResponse,
  AccountTransactionResponse,
  AdminApprovalItem,
  AdminApprovalResponse,
  PaymentUpdateResponse,
  RegistrationPaymentLookup,
} from "@/features/account-update/types/account-update.types";

type TabKey = "payment-update" | "account-transaction" | "account-statement" | "admin-approval";

type AccountUpdateDashboardProps = {
  canApprove: boolean;
  canApproveAction: boolean;
  canSubmitPayment: boolean;
};

const emptyPaymentData: PaymentUpdateResponse = {
  items: [],
  stats: { pendingPayments: 0, totalCollectionsToday: 0 },
};

const emptyTransactionData: AccountTransactionResponse = {
  items: [],
  stats: { totalCredits: 0, totalDebits: 0 },
};

const emptyStatementData: AccountStatementResponse = {
  creditSummary: [],
  debitSummary: [],
  summary: { totalCredit: 0, totalDebit: 0, openingBalance: 0, closingBalance: 0, netProfitLoss: 0 },
  items: [],
};

const emptyApprovalData: AdminApprovalResponse = {
  items: [],
  stats: { pendingApprovals: 0, approvedToday: 0, resetRequests: 0 },
};

const paymentModes = ["Cash", "Online", "Cheque"];
const transactionTypes = ["Cash", "UPI", "Cheque"];
const debitCategories = [
  "Refreshment Expenses",
  "Travel Expenses",
  "Office Cleaning Expenses",
  "Maid Expenses",
  "Corporate Expenses",
];
const creditCategories = ["Cash From Account Team", "Petty Cash", "Direct Customer Transaction"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed.");
  return payload;
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-bold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full min-w-0 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm outline-none transition focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)]"
      >
        {children}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Pending"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

export function AccountUpdateDashboard({
  canApprove,
  canApproveAction,
  canSubmitPayment,
}: AccountUpdateDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("payment-update");
  const [paymentData, setPaymentData] = useState<PaymentUpdateResponse>(emptyPaymentData);
  const [transactionData, setTransactionData] = useState<AccountTransactionResponse>(emptyTransactionData);
  const [statementData, setStatementData] = useState<AccountStatementResponse>(emptyStatementData);
  const [approvalData, setApprovalData] = useState<AdminApprovalResponse>(emptyApprovalData);
  const [registration, setRegistration] = useState<RegistrationPaymentLookup | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [statementSearch, setStatementSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminApprovalItem | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<AdminApprovalItem | null>(null);
  const [receiptZoom, setReceiptZoom] = useState(1);
  const [paymentForm, setPaymentForm] = useState({
    paymentMode: "Cash",
    amountPaid: "",
    invoiceNumber: "",
    paymentDate: todayKey(),
    receiptFile: null as File | null,
  });
  const [transactionForm, setTransactionForm] = useState({
    transactionType: "Cash",
    creditOrDebit: "Debit",
    category: debitCategories[0],
    amount: "",
    date: todayKey(),
    description: "",
    billFile: null as File | null,
  });

  async function loadData(search = statementSearch) {
    setLoading(true);
    setError("");

    try {
      const [payments, transactions, statement, approvals] = await Promise.all([
        parseResponse<PaymentUpdateResponse>(await fetch("/api/account-update/payment-update", { cache: "no-store" })),
        parseResponse<AccountTransactionResponse>(
          await fetch("/api/account-update/account-transaction", { cache: "no-store" }),
        ),
        parseResponse<AccountStatementResponse>(
          await fetch(`/api/account-update/account-statement?search=${encodeURIComponent(search)}`, {
            cache: "no-store",
          }),
        ),
        canApprove
          ? parseResponse<AdminApprovalResponse>(
              await fetch("/api/account-update/admin-approval", { cache: "no-store" }),
            )
          : Promise.resolve(emptyApprovalData),
      ]);

      setPaymentData(payments);
      setTransactionData(transactions);
      setStatementData(statement);
      setApprovalData(approvals);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load account update data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [canApprove]);

  const visibleTabs = useMemo(
    () => [
      { key: "payment-update" as const, label: "Payment Update", icon: WalletCards },
      { key: "account-transaction" as const, label: "Account Transaction", icon: ReceiptText },
      { key: "account-statement" as const, label: "Account Statement", icon: FileSearch },
      ...(canApprove ? [{ key: "admin-approval" as const, label: "Admin Approval", icon: ShieldCheck }] : []),
    ],
    [canApprove],
  );

  const cards = useMemo(() => {
    if (activeTab === "account-transaction") {
      return [
        { label: "Total Credits", value: formatCurrency(transactionData.stats.totalCredits), delta: "Income", description: "All saved credit transactions", icon: Banknote, tone: "blue" as const },
        { label: "Total Debits", value: formatCurrency(transactionData.stats.totalDebits), delta: "Expense", description: "All saved debit transactions", icon: ReceiptText, tone: "amber" as const },
      ];
    }
    if (activeTab === "account-statement") {
      return [
        { label: "Opening Balance", value: formatCurrency(statementData.summary.openingBalance), delta: "Today", description: "Balance carried from previous day", icon: ClipboardCheck, tone: "slate" as const },
        { label: "Closing Balance", value: formatCurrency(statementData.summary.closingBalance), delta: "Live", description: "Current ledger balance", icon: Banknote, tone: "blue" as const },
        { label: "Net Profit/Loss", value: formatCurrency(statementData.summary.netProfitLoss), delta: "Net", description: "Credits minus debits", icon: BadgeCheck, tone: "amber" as const },
      ];
    }
    if (activeTab === "admin-approval") {
      return [
        { label: "Pending Approvals", value: approvalData.stats.pendingApprovals.toLocaleString(), delta: "Queue", description: "Payment updates awaiting approval", icon: ShieldCheck, tone: "amber" as const },
        { label: "Approved Today", value: approvalData.stats.approvedToday.toLocaleString(), delta: "Today", description: "Payments moved into statement", icon: BadgeCheck, tone: "blue" as const },
        { label: "Reset Requests", value: approvalData.stats.resetRequests.toLocaleString(), delta: "Today", description: "Approvals reversed today", icon: RotateCcw, tone: "slate" as const },
      ];
    }
    return [
      { label: "Pending Payments", value: paymentData.stats.pendingPayments.toLocaleString(), delta: "Queue", description: "Payment updates waiting for approval", icon: ClipboardCheck, tone: "amber" as const },
      { label: "Total Collections Today", value: formatCurrency(paymentData.stats.totalCollectionsToday), delta: "Today", description: "Submitted payment update amount", icon: Banknote, tone: "blue" as const },
    ];
  }, [activeTab, approvalData.stats, paymentData.stats, statementData.summary, transactionData.stats]);

  async function lookupTrackingNumber() {
    if (!trackingNumber.trim()) {
      setError("Tracking number is required.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = await parseResponse<{ registration: RegistrationPaymentLookup }>(
        await fetch(`/api/account-update/payment-lookup/${encodeURIComponent(trackingNumber.trim())}`),
      );
      setRegistration(payload.registration);
      setPaymentForm((current) => ({
        ...current,
        amountPaid: String(payload.registration.advancePaid || payload.registration.balanceAmount),
      }));
    } catch (requestError) {
      setRegistration(null);
      setError(requestError instanceof Error ? requestError.message : "Tracking lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPayment() {
    if (!registration) {
      setError("Search and select a tracking number first.");
      return;
    }

    if (!paymentForm.receiptFile) {
      setError("Receipt file is required");
      return;
    }

    const formData = new FormData();
    formData.set("trackingNumber", registration.trackingNumber);
    formData.set("paymentMode", paymentForm.paymentMode);
    formData.set("amountPaid", paymentForm.amountPaid);
    formData.set("invoiceNumber", paymentForm.invoiceNumber);
    formData.set("paymentDate", paymentForm.paymentDate);
    if (paymentForm.receiptFile) formData.set("receiptFile", paymentForm.receiptFile);

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = await parseResponse<{ message?: string }>(
        await fetch("/api/account-update/payment-update", { method: "POST", body: formData }),
      );
      setMessage(payload.message ?? "Payment submitted.");
      setRegistration(null);
      setTrackingNumber("");
      setPaymentForm({ paymentMode: "Cash", amountPaid: "", invoiceNumber: "", paymentDate: todayKey(), receiptFile: null });
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit payment.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTransaction() {
    const formData = new FormData();
    formData.set("transactionType", transactionForm.transactionType);
    formData.set("category", transactionForm.category);
    formData.set("amount", transactionForm.amount);
    formData.set("date", transactionForm.date);
    formData.set("description", transactionForm.description);
    if (transactionForm.billFile) formData.set("billFile", transactionForm.billFile);

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = await parseResponse<{ message?: string }>(
        await fetch("/api/account-update/account-transaction", { method: "POST", body: formData }),
      );
      setMessage(payload.message ?? "Transaction saved.");
      setTransactionForm({
        transactionType: "Cash",
        creditOrDebit: "Debit",
        category: debitCategories[0],
        amount: "",
        date: todayKey(),
        description: "",
        billFile: null,
      });
      await loadData();
      setActiveTab("account-statement");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save transaction.");
    } finally {
      setBusy(false);
    }
  }

  async function updateApproval(item: AdminApprovalItem, action: "approve" | "reset", reason = "") {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = await parseResponse<{ message?: string }>(
        await fetch(`/api/account-update/admin-approval/${item.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        }),
      );
      setMessage(payload.message ?? "Approval updated.");
      setResetTarget(null);
      setResetReason("");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update approval.");
    } finally {
      setBusy(false);
    }
  }

  function viewReceipt(item: AdminApprovalItem) {
    if (!item.receiptFileUrl) {
      setError("Receipt is not available for this payment update.");
      return;
    }

    if (item.receiptMimeType === "application/pdf") {
      window.open(item.receiptFileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (item.receiptMimeType?.startsWith("image/")) {
      setReceiptZoom(1);
      setReceiptPreview(item);
      return;
    }

    window.open(item.receiptFileUrl, "_blank", "noopener,noreferrer");
  }

  const categories = transactionForm.creditOrDebit === "Credit" ? creditCategories : debitCategories;

  return (
    <div className="grid min-w-0 gap-5">
      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-(--shadow-card) sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Accounts Module</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Accounting control center</h1>
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white p-3 shadow-(--shadow-card)">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left text-sm font-bold transition ${
                  active ? "border-blue-500 bg-blue-600 text-white" : "border-(--border) bg-white text-slate-700 hover:bg-blue-50"
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`grid gap-4 ${cards.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {cards.map((card) => <StatsCard key={card.label} {...card} />)}
      </section>

      {error ? <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      {loading ? (
        <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card)">Loading accounts...</div>
      ) : null}

      {!loading && activeTab === "payment-update" ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="grid gap-4 rounded-[28px] border border-(--border) bg-white p-5 shadow-(--shadow-card)">
            <div className="flex gap-2">
              <Input label="Tracking Number" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
              <Button size="icon" className="mt-7 shrink-0" onClick={() => void lookupTrackingNumber()} disabled={busy}><Search size={18} /></Button>
            </div>
            {registration ? (
              <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm">
                <strong>{registration.customerName}</strong>
                <span>{registration.processType}</span>
                <span>Total: {formatCurrency(registration.totalCharges)}</span>
                <span>Advance: {formatCurrency(registration.advancePaid)}</span>
                <span>Balance: {formatCurrency(registration.balanceAmount)}</span>
              </div>
            ) : null}
            <SelectField label="Mode Of Payment" value={paymentForm.paymentMode} onChange={(value) => setPaymentForm((current) => ({ ...current, paymentMode: value }))}>
              {paymentModes.map((mode) => <option key={mode}>{mode}</option>)}
            </SelectField>
            <Input label="Amount Paid" type="number" value={paymentForm.amountPaid} onChange={(event) => setPaymentForm((current) => ({ ...current, amountPaid: event.target.value }))} />
            <Input label="Invoice Number" value={paymentForm.invoiceNumber} onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceNumber: event.target.value }))} />
            <Input label="Payment Date" type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} />
            <Input label="Transaction Receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setPaymentForm((current) => ({ ...current, receiptFile: event.target.files?.[0] ?? null }))} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setRegistration(null); setTrackingNumber(""); }} disabled={busy}>Reset</Button>
              <Button onClick={() => void submitPayment()} disabled={busy || !canSubmitPayment}><Save size={16} />Submit Payment</Button>
            </div>
          </div>
          <PaymentTable data={paymentData} />
        </section>
      ) : null}

      {!loading && activeTab === "account-transaction" ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="grid gap-4 rounded-[28px] border border-(--border) bg-white p-5 shadow-(--shadow-card)">
            <SelectField label="Transaction Type" value={transactionForm.transactionType} onChange={(value) => setTransactionForm((current) => ({ ...current, transactionType: value }))}>
              {transactionTypes.map((type) => <option key={type}>{type}</option>)}
            </SelectField>
            <SelectField label="Credit / Debit" value={transactionForm.creditOrDebit} onChange={(value) => setTransactionForm((current) => ({ ...current, creditOrDebit: value, category: value === "Credit" ? creditCategories[0] : debitCategories[0] }))}>
              <option>Debit</option>
              <option>Credit</option>
            </SelectField>
            <SelectField label="Category" value={transactionForm.category} onChange={(value) => setTransactionForm((current) => ({ ...current, category: value }))}>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </SelectField>
            <Input label="Amount" type="number" value={transactionForm.amount} onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))} />
            <Input label="Date" type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))} />
            <Textarea label="Reference / Description" value={transactionForm.description} onChange={(event) => setTransactionForm((current) => ({ ...current, description: event.target.value }))} />
            <Input label="Upload Bill / Voucher" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setTransactionForm((current) => ({ ...current, billFile: event.target.files?.[0] ?? null }))} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTransactionForm((current) => ({ ...current, amount: "", description: "", billFile: null }))} disabled={busy}>Cancel</Button>
              <Button onClick={() => void saveTransaction()} disabled={busy}><Save size={16} />Save Transaction</Button>
            </div>
          </div>
          <TransactionTable data={transactionData} />
        </section>
      ) : null}

      {!loading && activeTab === "account-statement" ? (
        <section className="grid gap-5">
          <div className="rounded-[28px] border border-(--border) bg-white p-5 shadow-(--shadow-card)">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input label="Global Tracking Search" placeholder="Tracking / Invoice / Voucher No." value={statementSearch} onChange={(event) => setStatementSearch(event.target.value)} />
              <Button className="sm:mt-7" onClick={() => void loadData(statementSearch)}><Search size={16} />Search</Button>
            </div>
          </div>
          <SummaryTables statementData={statementData} />
          <StatementTable data={statementData} />
        </section>
      ) : null}

      {!loading && activeTab === "admin-approval" ? (
        <ApprovalTable
          data={approvalData}
          busy={busy}
          canApproveAction={canApproveAction}
          onApprove={(item) => void updateApproval(item, "approve")}
          onReset={(item) => setResetTarget(item)}
          onViewReceipt={viewReceipt}
        />
      ) : null}

      {resetTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="grid w-full max-w-lg gap-4 rounded-[28px] border border-(--border) bg-white p-5 shadow-xl">
            <h2 className="text-lg font-extrabold">Reset approval</h2>
            <p className="text-sm text-soft">{resetTarget.trackingNumber} will return to Pending and its ledger credit will be reversed.</p>
            <Textarea label="Reset Reason" value={resetReason} onChange={(event) => setResetReason(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResetTarget(null)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={() => void updateApproval(resetTarget, "reset", resetReason)} disabled={busy}>Reset</Button>
            </div>
          </div>
        </div>
      ) : null}

      {receiptPreview?.receiptFileUrl ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-4 rounded-[28px] border border-(--border) bg-white p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-base font-extrabold">{receiptPreview.receiptFileName ?? "Transaction Receipt"}</h2>
                <p className="text-sm text-soft">
                  {receiptPreview.trackingNumber} | {receiptPreview.invoiceNumber} | {receiptPreview.paymentDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="secondary" onClick={() => setReceiptZoom((value) => Math.max(0.5, value - 0.25))}>
                  <ZoomOut size={17} />
                </Button>
                <span className="min-w-14 text-center text-sm font-bold">{Math.round(receiptZoom * 100)}%</span>
                <Button size="icon" variant="secondary" onClick={() => setReceiptZoom((value) => Math.min(3, value + 0.25))}>
                  <ZoomIn size={17} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setReceiptPreview(null)}>
                  <X size={18} />
                </Button>
              </div>
            </div>
            <div className="min-h-0 overflow-auto rounded-2xl border border-(--border) bg-slate-100 p-4 text-center">
              <img
                src={receiptPreview.receiptFileUrl}
                alt={receiptPreview.receiptFileName ?? "Transaction receipt"}
                className="mx-auto max-w-none rounded-xl shadow-lg"
                style={{ width: `${receiptZoom * 100}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaymentTable({ data }: { data: PaymentUpdateResponse }) {
  if (!data.items.length) return <EmptyState icon={WalletCards} title="No payment updates" description="Submitted payments will appear here." />;
  return (
    <TableShell minWidth="980px">
      <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
        <tr><th className="px-5 py-4">Tracking</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Mode</th><th className="px-5 py-4">Invoice</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4">Status</th></tr>
      </thead>
      <tbody className="divide-y divide-(--border)">
        {data.items.map((item) => <tr key={item.id}><td className="px-5 py-4 font-bold text-blue-700">{item.trackingNumber}</td><td className="px-5 py-4">{item.customerName}</td><td className="px-5 py-4">{formatCurrency(item.amountPaid)}</td><td className="px-5 py-4">{item.paymentMode}</td><td className="px-5 py-4">{item.invoiceNumber}</td><td className="px-5 py-4">{item.submittedAt}</td><td className="px-5 py-4"><StatusBadge status={item.approvalStatus} /></td></tr>)}
      </tbody>
    </TableShell>
  );
}

function TransactionTable({ data }: { data: AccountTransactionResponse }) {
  if (!data.items.length) return <EmptyState icon={ReceiptText} title="No account transactions" description="Credits and expenses will appear here." />;
  return (
    <TableShell minWidth="920px">
      <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
        <tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Voucher</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">By</th></tr>
      </thead>
      <tbody className="divide-y divide-(--border)">
        {data.items.map((item) => <tr key={item.id}><td className="px-5 py-4">{item.date}</td><td className="px-5 py-4 font-bold text-blue-700">{item.voucherNumber}</td><td className="px-5 py-4">{item.creditOrDebit}</td><td className="px-5 py-4">{item.category}</td><td className="px-5 py-4">{formatCurrency(item.amount)}</td><td className="px-5 py-4">{item.createdBy}</td></tr>)}
      </tbody>
    </TableShell>
  );
}

function SummaryTables({ statementData }: { statementData: AccountStatementResponse }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MiniSummary title="Credit (Income)" rows={statementData.creditSummary} total={statementData.summary.totalCredit} />
      <MiniSummary title="Debit (Expenses)" rows={statementData.debitSummary} total={statementData.summary.totalDebit} />
    </div>
  );
}

function MiniSummary({ title, rows, total }: { title: string; rows: Array<{ particulars: string; amount: number }>; total: number }) {
  return (
    <div className="rounded-[28px] border border-(--border) bg-white p-5 shadow-(--shadow-card)">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-soft">{title}</h2>
      <div className="mt-4 grid gap-2">
        {rows.length ? rows.map((row) => <div key={row.particulars} className="flex justify-between gap-3 text-sm"><span>{row.particulars}</span><strong>{formatCurrency(row.amount)}</strong></div>) : <p className="text-sm text-soft">No entries yet.</p>}
      </div>
      <div className="mt-4 flex justify-between border-t border-(--border) pt-4 font-extrabold"><span>Total</span><span>{formatCurrency(total)}</span></div>
    </div>
  );
}

function StatementTable({ data }: { data: AccountStatementResponse }) {
  if (!data.items.length) return <EmptyState icon={FileSearch} title="No statement entries" description="Approved payments and account transactions will appear here." />;
  return (
    <TableShell minWidth="1120px">
      <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
        <tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Tracking</th><th className="px-5 py-4">Particulars</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Credit</th><th className="px-5 py-4">Debit</th><th className="px-5 py-4">Running Balance</th></tr>
      </thead>
      <tbody className="divide-y divide-(--border)">
        {data.items.map((item) => <tr key={item.id}><td className="px-5 py-4">{item.date}</td><td className="px-5 py-4 font-bold text-blue-700">{item.trackingNumber}</td><td className="px-5 py-4">{item.particulars}</td><td className="px-5 py-4">{item.type}</td><td className="px-5 py-4">{formatCurrency(item.credit)}</td><td className="px-5 py-4">{formatCurrency(item.debit)}</td><td className="px-5 py-4 font-bold">{formatCurrency(item.runningBalance)}</td></tr>)}
      </tbody>
    </TableShell>
  );
}

function ApprovalTable({
  data,
  busy,
  canApproveAction,
  onApprove,
  onReset,
  onViewReceipt,
}: {
  data: AdminApprovalResponse;
  busy: boolean;
  canApproveAction: boolean;
  onApprove: (item: AdminApprovalItem) => void;
  onReset: (item: AdminApprovalItem) => void;
  onViewReceipt: (item: AdminApprovalItem) => void;
}) {
  if (!data.items.length) return <EmptyState icon={ShieldCheck} title="No submitted payment updates" description="Payment updates will appear here for finance action." />;
  return (
    <TableShell minWidth="1500px">
      <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
        <tr><th className="px-5 py-4">Tracking Number</th><th className="px-5 py-4">Customer Name</th><th className="px-5 py-4">Process Type</th><th className="px-5 py-4">Total Charges</th><th className="px-5 py-4">Advance Paid</th><th className="px-5 py-4">Balance Amount</th><th className="px-5 py-4">Payment Mode</th><th className="px-5 py-4">Invoice Number</th><th className="px-5 py-4">Payment Date</th><th className="px-5 py-4">Transaction Receipt</th><th className="px-5 py-4">Submitted By</th><th className="px-5 py-4">Submitted Date</th><th className="px-5 py-4">Actions</th></tr>
      </thead>
      <tbody className="divide-y divide-(--border)">
        {data.items.map((item) => <tr key={item.id}><td className="px-5 py-4 font-bold text-blue-700">{item.trackingNumber}</td><td className="px-5 py-4">{item.customerName}</td><td className="px-5 py-4">{item.processType}</td><td className="px-5 py-4">{formatCurrency(item.totalCharges)}</td><td className="px-5 py-4">{formatCurrency(item.advancePaid)}</td><td className="px-5 py-4">{formatCurrency(item.balanceAmount)}</td><td className="px-5 py-4">{item.paymentMode}</td><td className="px-5 py-4">{item.invoiceNumber}</td><td className="px-5 py-4">{item.paymentDate}</td><td className="px-5 py-4">{item.receiptFileUrl ? <Button size="sm" variant="secondary" onClick={() => onViewReceipt(item)}><Eye size={14} />View Receipt</Button> : <span className="text-sm text-soft">No receipt</span>}</td><td className="px-5 py-4">{item.submittedBy}</td><td className="px-5 py-4">{item.submittedDate}</td><td className="px-5 py-4"><div className="flex gap-2"><Button size="sm" onClick={() => onApprove(item)} disabled={busy || !canApproveAction || item.approvalStatus === "Approved"}>Approve</Button><Button size="sm" variant="danger" onClick={() => onReset(item)} disabled={busy || !canApproveAction || item.approvalStatus !== "Approved"}><RefreshCw size={14} />Reset</Button></div><div className="mt-2"><StatusBadge status={item.approvalStatus} /></div></td></tr>)}
      </tbody>
    </TableShell>
  );
}

function TableShell({ minWidth, children }: { minWidth: string; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>{children}</table>
      </div>
    </div>
  );
}
