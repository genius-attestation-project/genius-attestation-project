"use client";

import { CheckCircle2, Clock3, FileText, IndianRupee, UserRound, XCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Registration } from "@/features/registration/types/registration.types";

type RegistrationDetailProps = {
  registration: Registration;
  onApprove?: () => void;
  onReject?: () => void;
  approving?: boolean;
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-2xl border border-[color:var(--border)] bg-white/65 p-4 dark:bg-white/5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="break-words text-sm font-semibold text-[color:var(--text)]">{value || "-"}</span>
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

  return (
    <div className="grid min-w-0 gap-5">
      <section className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4 shadow-[var(--shadow-card)] sm:rounded-[28px] sm:p-5 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Tracking</p>
            <h2 className="mt-2 break-words text-xl font-extrabold sm:text-2xl">{registration.trackingNumber}</h2>
            <p className="mt-1 text-sm text-soft">{registration.customerName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill value={registration.paymentStatus} />
            <StatusPill value={registration.approvalStatus} tone={approvalTone} />
            <StatusPill value={registration.trackingStatus} />
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <UserRound size={18} /> Customer Info
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Customer Name" value={registration.customerName} />
          <Field label="Mobile" value={registration.mobile} />
          <Field label="Email" value={registration.email} />
          <Field label="Customer Type" value={registration.customerType} />
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
          <Field label="Balance Amount" value={registration.balanceAmount.toFixed(2)} />
          <Field label="Payment Mode" value={registration.paymentMode} />
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
          <div className="grid gap-2">
            {registration.files.map((file) => (
              <a
                key={file.id}
                href={`/api/registrations/files/${file.id}`}
                target="_blank"
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 py-3 text-sm font-semibold text-blue-700 dark:bg-white/5 dark:text-blue-200"
              >
                <span className="grid min-w-0 gap-1">
                  <span>{file.fileName}</span>
                  <span className="text-xs text-muted">{file.fileCategory.replace(/_/g, " ")}</span>
                </span>
                <span className="text-right text-xs text-muted">
                  {formatFileSize(file.fileSize)}
                  <br />
                  {new Date(file.uploadedAt).toLocaleString()}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-soft">
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

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold">
          <Clock3 size={18} /> Audit Trail
        </h3>
        <div className="grid gap-2">
          {registration.auditTrail.length ? (
            registration.auditTrail.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4 dark:bg-white/5"
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
            <p className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-soft">
              No audit trail entries.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
