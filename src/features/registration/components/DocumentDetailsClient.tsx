"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Download, Eye, History, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/utils/format";
import { AdvanceHistoryTable } from "@/features/revenue/components/AdvanceHistoryTable";

type Props = { trackingNumber: string };
type DetailField = { label: string; value: React.ReactNode };

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="print-section overflow-hidden bg-white text-slate-900">
      <h2 className="bg-[#195b8e] px-4 py-3 text-center text-base font-extrabold uppercase tracking-wide text-white sm:text-lg">
        {title}
      </h2>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function DetailsGrid({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
      {fields.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-[minmax(9rem,38%)_1fr] gap-3 text-sm sm:text-base">
          <dt className="font-bold text-slate-500">{label}</dt>
          <dd className="font-semibold text-slate-900 wrap-break-word">{value ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

function statusClass(status: string) {
  if (/reject|cancel|fail/i.test(status)) return "text-red-600";
  if (/pending|transfer|hold|inbound/i.test(status)) return "text-amber-600";
  return "text-lime-700";
}

export function DocumentDetailsClient({ trackingNumber }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/document-details/${encodeURIComponent(trackingNumber)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load document details.");
      setData(json);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetails(); }, [trackingNumber]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-white p-8 text-lg font-bold text-slate-700"><RefreshCw className="animate-spin text-[#195b8e]" /> Loading document details...</div>;
  if (error || !data) return <div className="mx-auto my-8 max-w-3xl bg-white p-8 text-center"><p className="mb-5 text-lg font-bold text-red-700">{error || "Unable to locate record."}</p><Link href="/dashboard/revenue-registration"><Button variant="secondary">Back to Registrations</Button></Link></div>;

  const { registration: reg, currentProcess: proc, movementHistory = [], workflowHistory = [], advancePaymentApprovals = [] } = data;
  const currentStatus = proc.currentStatus || reg.trackingStatus || "Registered";
  const paymentFields: DetailField[] = [
    { label: "Total Amount", value: `₹${Number(reg.totalCharges || 0).toFixed(2)}` },
    { label: "Advance", value: `₹${Number(reg.advancePaid || 0).toFixed(2)}` },
    { label: "Balance", value: `₹${Number(reg.balanceAmount || 0).toFixed(2)}` },
    { label: "Balance Received", value: `₹${Number(reg.balanceReceivedAmount || 0).toFixed(2)}` },
    { label: "Payment Mode", value: reg.paymentMode || "-" },
    { label: "Payment Status", value: reg.paymentStatus || "Pending" },
    { label: "Payment Reference Number", value: reg.paymentReferenceNo },
    { label: "UPI Transaction ID", value: reg.upiTransactionId },
    { label: "Bank Name", value: reg.bankName },
    { label: "Transaction Reference", value: reg.transactionRefNo },
    { label: "Transfer Date", value: reg.transferDate ? formatDate(reg.transferDate) : null },
    { label: "Cheque Number", value: reg.chequeNumber },
    { label: "Cheque Date", value: reg.chequeDate ? formatDate(reg.chequeDate) : null },
    { label: "DD Number", value: reg.ddNumber },
    { label: "DD Date", value: reg.ddDate ? formatDate(reg.ddDate) : null },
    { label: "Card (Last 4)", value: reg.cardLast4 },
    { label: "Approval Code", value: reg.approvalCode },
    { label: "Payment Gateway", value: reg.paymentGateway },
    { label: "Online Transaction ID", value: reg.onlineTransactionId },
    { label: "Wallet", value: reg.walletName },
    { label: "Wallet Transaction ID", value: reg.walletTransactionId },
    { label: "Payment Description", value: reg.paymentDescription },
  ].filter((field) => field.value !== null && field.value !== undefined && field.value !== "");

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-white p-3 text-slate-900 sm:p-6 print:max-w-none print:p-0">
      <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-2 pb-4">
        <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#195b8e]"><ArrowLeft size={17} /> Back</button>
        <div className="flex flex-wrap items-center gap-1">
          <button aria-label="View timeline" title="Timeline" onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg p-2 text-[#195b8e] hover:bg-blue-50"><Clock size={21} /></button>
          <button aria-label="View history" title="History" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg p-2 text-[#195b8e] hover:bg-blue-50"><History size={21} /></button>
          <button aria-label="Print details" title="Print Details" onClick={() => window.print()} className="rounded-lg p-2 text-[#195b8e] hover:bg-blue-50"><Printer size={21} /></button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 py-3 print:mb-2">
        <h1 className="text-lg font-extrabold uppercase text-slate-950 sm:text-xl">Track No : {reg.trackingNumber}</h1>
        <p className={`text-base font-extrabold sm:text-lg ${statusClass(currentStatus)}`}>Status :: {currentStatus}</p>
      </div>

      <div className="space-y-5 print:space-y-4">
        <Section title="Document Type">
          <DetailsGrid fields={[
            { label: "Document Type", value: reg.documentType }, { label: "Process Type", value: reg.processType },
            { label: "Committed Duration / SLA", value: reg.committedDuration }, { label: "Priority", value: reg.priority || "Normal" },
            { label: "Customer Type", value: reg.customerType || "Individual" }, { label: "Issued Country", value: reg.documentIssuedCountry },
            { label: "Delivery Location", value: reg.deliveryLocation }, { label: "Address Process", value: reg.externalProcess },
            { label: "Current Office", value: proc.currentOffice }, { label: "Current Stage", value: proc.currentStage },
            { label: "Current Status", value: currentStatus }, { label: "Current Sub Package", value: proc.currentSubPackage },
          ]} />
        </Section>

        <Section title="Document Details">
          <DetailsGrid fields={[
            { label: "Document Name", value: reg.documentName }, { label: "Document Type", value: reg.documentType },
            { label: "Process Type", value: reg.processType }, { label: "Issued Country", value: reg.documentIssuedCountry },
            { label: "Additional Process", value: reg.externalProcess }, { label: "Sub Package", value: reg.subPackage },
            { label: "Registered Date", value: formatDate(reg.createdAt) }, { label: "Region of Registration", value: reg.regionOfRegistration },
            { label: "Registered By", value: reg.registeredPerson || reg.createdBy }, { label: "Collected By", value: reg.collectedPerson },
          ]} />
        </Section>

        <Section title="Customer Information">
          <DetailsGrid fields={[
            { label: "Customer Name", value: reg.customerName }, { label: "Mobile", value: reg.mobile },
            { label: "Email", value: reg.email }, { label: "Country", value: reg.country },
            { label: "Address", value: reg.address }, { label: "Customer Type", value: reg.customerType || "Individual" },
            { label: "State", value: reg.state }, { label: "City", value: reg.city },
          ]} />
        </Section>

        {reg.customerType === "Corporate" && reg.corporateDetail && <Section title="Corporate Details"><DetailsGrid fields={[
          { label: "Corporate Name", value: reg.corporateDetail.companyName }, { label: "Contact Person", value: reg.corporateDetail.contactPersonName },
          { label: "Mobile", value: reg.corporateDetail.contactPersonMobile }, { label: "Email", value: reg.corporateDetail.email },
          { label: "Address", value: reg.corporateDetail.address },
          { label: "Agreement File", value: reg.corporateDetail.agreementFile?.url ? <span className="inline-flex gap-3"><a className="text-[#195b8e] hover:underline" href={reg.corporateDetail.agreementFile.url} target="_blank" rel="noreferrer">View</a><a className="text-[#195b8e] hover:underline" href={reg.corporateDetail.agreementFile.url} download>Download</a></span> : "-" },
        ]} /></Section>}

        <Section title="Payment Details"><DetailsGrid fields={paymentFields} /></Section>

        {reg.files?.length > 0 && <Section title="Supporting Documents"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{reg.files.map((file: any) => {
          const storage = file.fileStorage || {}; const url = storage.url;
          return <div key={file.id} className="flex items-center justify-between gap-3 border border-slate-200 p-3"><p className="font-bold text-slate-800">{file.fileCategory || "Supporting Document"}</p>{url && <div className="no-print flex gap-2"><a title="View file" href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-bold text-[#195b8e] hover:bg-blue-50"><Eye size={16} /> View</a><a title="Download file" href={url} download className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-bold text-[#195b8e] hover:bg-blue-50"><Download size={16} /> Download</a></div>}</div>;
        })}</div></Section>}

        <Section title="Current Process"><DetailsGrid fields={[
          { label: "Current Office", value: proc.currentOffice }, { label: "Current Department", value: proc.currentDepartment },
          { label: "Current Package", value: proc.currentPackage }, { label: "Current Sub Package", value: proc.currentSubPackage },
          { label: "Current Assigned User", value: proc.currentHandler }, { label: "Current Status", value: currentStatus },
          { label: "Current Stage", value: proc.currentStage }, { label: "Number of Days", value: `${proc.daysCount} Days` },
        ]} /></Section>

        <Section title="Advance Payment History & Approvals"><AdvanceHistoryTable history={advancePaymentApprovals} onRefresh={fetchDetails} /></Section>

        {reg.paymentUpdates?.length > 0 && <Section title="Payment Receipts & Documents"><div className="space-y-3">{reg.paymentUpdates.map((update: any) => <div key={update.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 p-3"><div><p className="font-bold">Invoice #{update.invoiceNumber} — ₹{Number(update.amountPaid).toFixed(2)}</p><p className="text-sm text-slate-600">{update.paymentMode} · {formatDate(update.submittedAt)}</p></div>{update.receiptFileUrl && <div className="no-print flex gap-2"><a href={update.receiptFileUrl} target="_blank" rel="noreferrer" className="text-[#195b8e] hover:underline">View</a><a href={update.receiptFileUrl} download className="text-[#195b8e] hover:underline">Download</a></div>}</div>)}</div></Section>}

        <Section title="Document Movement Timeline" id="timeline">{workflowHistory.length ? <div className="space-y-3">{workflowHistory.map((step: any) => <div key={step.id} className="border-l-4 border-[#195b8e] pl-4"><div className="flex flex-wrap justify-between gap-2 font-bold"><span>{step.workflowStep || step.status}</span><span className="text-slate-500">{formatDateTime(step.performedAt)}</span></div><p className="mt-1 text-sm text-slate-700">{step.remarks || "No remarks logged."}</p><p className="text-xs font-semibold text-slate-500">Performed by: {step.performedBy || "System"}</p></div>)}</div> : <p className="text-slate-500">No workflow timeline recorded.</p>}</Section>

        <Section title="Document Movement History" id="history">{movementHistory.length ? <div className="overflow-x-auto"><table className="w-full min-w-175 text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">Date & Time</th><th className="p-3">From Office</th><th className="p-3">To Office</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Remarks</th></tr></thead><tbody>{movementHistory.map((mov: any) => <tr key={mov.id} className="border-b border-slate-200"><td className="p-3">{formatDateTime(mov.performedAt)}</td><td className="p-3">{mov.oldOffice || "-"}</td><td className="p-3">{mov.newOffice || "-"}</td><td className="p-3">{mov.performedBy || "-"}</td><td className="p-3 font-semibold">{mov.action}</td><td className="p-3">{mov.remarks || "-"}</td></tr>)}</tbody></table></div> : <p className="text-slate-500">No movement history entries.</p>}</Section>

        <Section title="Approval Information"><DetailsGrid fields={[
          { label: "Approval Status", value: reg.approvalStatus }, { label: "Approved By", value: reg.approvedBy },
          { label: "Approved Date", value: reg.approvedAt ? formatDateTime(reg.approvedAt) : "-" }, { label: "Rejection Reason", value: reg.rejectionReason },
          { label: "Finance Approval Status", value: reg.financeApprovalStatus }, { label: "Payment Update Status", value: reg.paymentUpdateStatus },
        ]} /></Section>

        <Section title="Audit Information"><DetailsGrid fields={[
          { label: "Created By", value: reg.createdBy || "System" }, { label: "Created Date", value: formatDateTime(reg.createdAt) },
          { label: "Updated By", value: reg.updatedBy || reg.createdBy || "System" }, { label: "Updated Date", value: formatDateTime(reg.updatedAt) },
        ]} /></Section>
      </div>
    </div>
  );
}
