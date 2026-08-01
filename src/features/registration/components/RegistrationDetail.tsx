"use client";

import { CheckCircle2, Clock3, FileText, IndianRupee, UserRound, XCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Registration } from "@/features/registration/types/registration.types";
import { CommunicationTimeline } from "@/features/communication/components/CommunicationTimeline";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

type RegistrationDetailProps = {
  registration: Registration;
  onApprove?: () => void;
  onReject?: () => void;
  approving?: boolean;
  actionButton?: React.ReactNode;
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-2xl border border-(--border) bg-white/65 p-4 dark:bg-white/5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="wrap-break-word text-sm font-semibold text-(--text)">{value || "-"}</span>
    </div>
  );
}

function StatusPill({ value, tone }: { value: string; tone?: "green" | "red" | "blue" }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
    red: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[tone ?? "blue"]}`}>
      {value}
    </span>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function RegistrationDetail({
  registration,
  onApprove,
  onReject,
  approving = false,
  actionButton,
}: RegistrationDetailProps) {
  const commissionTo = registration.commissionToName && registration.commissionToEmail
    ? `${registration.commissionToName} (${registration.commissionToEmail})`
    : registration.commissionToName || registration.commissionToEmail;

  const approvalTone =
    registration.approvalStatus === "Approved" || registration.approvalStatus === "Accepted"
      ? "green"
      : registration.approvalStatus === "Rejected"
        ? "red"
        : "blue";

  const advancePaymentTone =
    registration.advancePaymentStatus === "Approved"
      ? "green"
      : registration.advancePaymentStatus === "Rejected"
        ? "red"
        : "blue";

  return (
    <div className="grid min-w-0 gap-5">
      <section className="rounded-2xl border border-(--border) bg-white/70 p-4 shadow-(--shadow-card) sm:rounded-[28px] sm:p-5 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Tracking</p>
            <div className="flex items-center gap-2 mt-2">
              <h2 className="wrap-break-word text-xl font-extrabold sm:text-2xl">{registration.trackingNumber}</h2>
              <PriorityBadge priority={registration.priority} />
            </div>
            <p className="mt-1 text-sm text-soft">{registration.customerName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actionButton}
            <StatusPill value={registration.paymentStatus} />
            {registration.advancePaymentStatus && registration.advancePaymentStatus !== "None" ? (
              <StatusPill value={`Advance: ${registration.advancePaymentStatus}`} tone={advancePaymentTone} />
            ) : null}
            <StatusPill value={registration.approvalStatus} tone={approvalTone} />
            <StatusPill value={registration.trackingStatus} />
          </div>
        </div>
      </section>

      {registration.advancePaymentStatus === "Rejected" && registration.advancePaymentRejectionReason && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-50/80 p-4 dark:bg-rose-500/10">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Advance Payment Rejected</p>
          <p className="mt-1 text-sm font-semibold text-rose-900 dark:text-rose-200">
            Reason: {registration.advancePaymentRejectionReason}
          </p>
          {registration.advancePaymentRejectedBy && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
              Rejected by {registration.advancePaymentRejectedBy} on {registration.advancePaymentRejectedAt ? new Date(registration.advancePaymentRejectedAt).toLocaleString() : "-"}
            </p>
          )}
          <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            Please edit this registration to change the Advance Amount or upload a new payment receipt to re-submit for approval.
          </p>
        </div>
      )}

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <UserRound size={18} /> Customer Info
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Customer Name" value={registration.customerName} />
          <Field label="Mobile" value={registration.mobile} />
          <Field label="Email" value={registration.email} />
          <Field label="Customer Type" value={registration.customerType} />
          {registration.corporateDetail && (
            <Field label="Company Name" value={registration.corporateDetail.companyName} />
          )}
          <Field label="Address" value={registration.address} />
          <Field label="Country" value={registration.country} />
          <Field label="State" value={registration.state} />
          <Field label="City" value={registration.city} />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <FileText size={18} /> Document Details
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Document Type" value={registration.documentType} />
          <Field label="Document Name" value={registration.documentName} />
          <Field label="Issued Country" value={registration.documentIssuedCountry} />
          <Field label="Process Type" value={registration.processType} />
          <Field label="Address Process" value={registration.externalProcess} />
          <Field label="Priority" value={registration.priority} />
          <Field label="Committed SLA" value={registration.committedDuration} />
          <Field label="Delivery Location" value={registration.deliveryLocation} />
          <Field label="Created Date" value={registration.createdDate} />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <IndianRupee size={18} /> Commercial Details
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Total Charges" value={registration.totalCharges.toFixed(2)} />
          <Field label="Advance Paid" value={registration.advancePaid.toFixed(2)} />
          <Field label="Advance Payment Status" value={registration.advancePaymentStatus || "Not Submitted"} />
          <Field label="Balance Amount" value={registration.balanceAmount.toFixed(2)} />
          <Field label="Payment Mode" value={registration.paymentMode} />
          {registration.upiTransactionId && <Field label="UPI Transaction ID" value={registration.upiTransactionId} />}
          {registration.bankName && <Field label="Bank Name" value={registration.bankName} />}
          {registration.transactionRefNo && <Field label="Transaction Reference No" value={registration.transactionRefNo} />}
          {registration.transferDate && <Field label="Transfer Date" value={registration.transferDate} />}
          {registration.chequeNumber && <Field label="Cheque Number" value={registration.chequeNumber} />}
          {registration.chequeDate && <Field label="Cheque Date" value={registration.chequeDate} />}
          {registration.ddNumber && <Field label="DD Number" value={registration.ddNumber} />}
          {registration.ddDate && <Field label="DD Date" value={registration.ddDate} />}
          {registration.cardLast4 && <Field label="Card Last 4 Digits" value={registration.cardLast4} />}
          {registration.approvalCode && <Field label="Approval Code" value={registration.approvalCode} />}
          {registration.paymentGateway && <Field label="Payment Gateway" value={registration.paymentGateway} />}
          {registration.onlineTransactionId && <Field label="Online Transaction ID" value={registration.onlineTransactionId} />}
          {registration.walletName && <Field label="Wallet Name" value={registration.walletName} />}
          {registration.walletTransactionId && <Field label="Wallet Transaction ID" value={registration.walletTransactionId} />}
          {registration.paymentReferenceNo && <Field label="Reference Number" value={registration.paymentReferenceNo} />}
          {registration.paymentDescription && <Field label="Description" value={registration.paymentDescription} />}
          <Field label="Collected Person" value={registration.collectedPerson} />
          <Field label="Commission To" value={commissionTo} />
          <Field label="Registered Person" value={registration.registeredPerson} />
          <Field label="Region of Registration" value={registration.regionOfRegistration} />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <FileText size={18} /> Uploaded Files
        </h3>
        {registration.files.length ? (
          <div className="grid gap-4">
            {["ADVANCE_PAYMENT", "INVOICE", "SUPPORTING_DOCUMENT", "DOCUMENT"].map((cat) => {
              const catFiles = registration.files.filter((f) => f.fileCategory === cat || (cat === "INVOICE" && f.fileCategory === "BILL"));
              if (!catFiles.length) return null;
              const catLabels: Record<string, string> = {
                ADVANCE_PAYMENT: "Advance Payment Upload",
                INVOICE: "Bill Upload",
                SUPPORTING_DOCUMENT: "Supporting Documents Upload",
                DOCUMENT: "Customer Document Upload",
              };

              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {catLabels[cat] || cat.replace(/_/g, " ")} ({catFiles.length})
                  </h4>
                  <div className="grid gap-2">
                    {catFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--border) bg-white/70 px-4 py-3 text-sm font-semibold text-blue-700 dark:bg-white/5 dark:text-blue-200"
                      >
                        <span className="grid min-w-0 gap-1">
                          <span className="truncate">{file.fileName}</span>
                          <span className="text-xs text-muted">
                            {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleString()}
                          </span>
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(`/api/registrations/files/${file.id}`, "_blank")}
                          >
                            Preview / Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-(--border) p-4 text-sm text-soft">
            No files uploaded.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-extrabold">
            <CheckCircle2 size={18} /> Approval
          </h3>
          {onApprove && onReject ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={onApprove} disabled={approving}>
                <CheckCircle2 size={16} /> Approve
              </Button>
              <Button size="sm" variant="danger" onClick={onReject} disabled={approving}>
                <XCircle size={16} /> Reject
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <CommunicationTimeline trackingNumber={registration.trackingNumber} />

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <Clock3 size={18} /> Audit Trail
        </h3>
        <div className="grid gap-2">
          {registration.auditTrail.length ? (
            registration.auditTrail.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-(--border) bg-white/70 p-4 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{item.action}</p>
                  <p className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-1 text-sm text-soft">{item.description}</p>
                {item.performedBy ? <p className="mt-2 text-xs text-muted">By {item.performedBy}</p> : null}
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-(--border) p-4 text-sm text-soft">
              No audit trail entries.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
