"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Clock,
  History,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/utils/format";
import { AdvanceHistoryTable } from "@/features/revenue/components/AdvanceHistoryTable";

type Props = {
  trackingNumber: string;
};

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
      if (!res.ok) {
        throw new Error(json.message || "Failed to load document details.");
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [trackingNumber]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white text-black p-8">
        <RefreshCw className="h-10 w-10 animate-spin text-black" />
        <p className="text-lg font-bold text-black uppercase tracking-wider">
          Loading Document Details for #{trackingNumber}...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-6 bg-white border-2 border-black text-black my-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black text-white font-bold">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-black uppercase">Document Not Found</h2>
        <p className="text-lg font-bold text-black">{error || "Unable to locate record."}</p>
        <div className="pt-2 no-print">
          <Link href="/dashboard/revenue-registration">
            <Button variant="secondary" className="gap-2 font-bold text-black border-2 border-black bg-white hover:bg-black hover:text-white">
              <ArrowLeft className="h-5 w-5" /> Back to Registrations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { registration: reg, currentProcess: proc, movementHistory, workflowHistory } = data;

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-white text-black min-h-screen p-4 sm:p-8 space-y-8 max-w-5xl mx-auto font-sans print:p-0 print:max-w-none print:m-0 print:space-y-6">
      {/* Top Screen-Only Navigation & Control Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-black">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-base font-extrabold text-black hover:underline uppercase tracking-wider"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => scrollToSection("section-timeline")}
            className="gap-2 text-sm font-bold text-black border-2 border-black bg-white hover:bg-black hover:text-white"
          >
            <Clock className="h-4 w-4" /> Timeline
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => scrollToSection("section-history")}
            className="gap-2 text-sm font-bold text-black border-2 border-black bg-white hover:bg-black hover:text-white"
          >
            <History className="h-4 w-4" /> History
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="gap-2 text-sm font-bold text-white bg-black hover:bg-slate-800 border-2 border-black"
          >
            <Printer className="h-4 w-4" /> Print Details
          </Button>
        </div>
      </div>

      {/* HEADER SECTION / DOCUMENT SUMMARY */}
      <header className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-black pb-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-black">
              DOCUMENT DETAILS
            </h1>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black font-mono">
              {reg.trackingNumber}
            </div>
            <p className="text-lg font-bold text-black">
              CUSTOMER: {reg.customerName} ({reg.mobile})
            </p>
          </div>

          <div className="text-right space-y-2">
            <div className="text-sm font-bold uppercase tracking-wider text-black">Current Status</div>
            <div className="text-2xl sm:text-3xl font-extrabold uppercase text-black">
              {proc.currentStatus || reg.trackingStatus || "Registered"}
            </div>
            <div className="text-base font-bold text-black uppercase">
              Priority: {reg.priority || "Normal"}
            </div>
          </div>
        </div>

        {/* Quick Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-black pt-2">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Current Office</span>
            <span className="text-lg font-bold text-black block">{proc.currentOffice || "-"}</span>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Department</span>
            <span className="text-lg font-bold text-black block">{proc.currentDepartment || "-"}</span>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Current Stage</span>
            <span className="text-lg font-bold text-black block">{proc.currentStage || "-"}</span>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Handler</span>
            <span className="text-lg font-bold text-black block">{proc.currentHandler || "-"}</span>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Registered Date</span>
            <span className="text-lg font-bold text-black block">{formatDate(reg.createdAt)}</span>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Registered By</span>
            <span className="text-lg font-bold text-black block">{reg.registeredPerson || reg.createdBy || "System"}</span>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Number of Days</span>
            <span className="text-lg font-bold text-black block">{proc.daysCount} Days</span>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-black block">Last Updated</span>
            <span className="text-lg font-bold text-black block">{formatDate(reg.updatedAt)}</span>
          </div>
        </div>
      </header>

      {/* SECTION 1: CUSTOMER INFORMATION */}
      <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          1. CUSTOMER INFORMATION
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-black">
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Tracking Number</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-black block">{reg.trackingNumber}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Customer Name</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.customerName}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Mobile Number</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-black block">{reg.mobile}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Email</span>
            <span className="text-lg sm:text-xl font-bold text-black block wrap-break-word">{reg.email || "-"}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Address</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.address || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Country</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.country || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Customer Type</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.customerType || "Individual"}</span>
          </div>
          {reg.customerType === "Corporate" && (
            <div className="sm:col-span-2">
              <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Company Name</span>
              <span className="text-lg sm:text-xl font-bold text-black block">
                {reg.corporateDetail?.companyName || "-"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: DOCUMENT INFORMATION */}
      <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          2. DOCUMENT INFORMATION
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-black">
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Document Name</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.documentName || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Document Type</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.documentType || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Issued Country</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.documentIssuedCountry || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Process Type</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.processType || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Address Process</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.externalProcess || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Special Processing Priority</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.priority || "Normal"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Committed SLA / Duration</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.committedDuration || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Delivery Location</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.deliveryLocation || "-"}</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: CUSTOMER DOCUMENTS */}
      {reg.files && reg.files.length > 0 && (
        <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
            3. CUSTOMER DOCUMENTS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-black">
            {reg.files.map((file: any) => {
              const storage = file.fileStorage || {};
              const fileName = storage.originalName || file.fileCategory || "Document";
              const fileUrl = storage.url || "#";
              return (
                <div key={file.id} className="border-2 border-black p-4 space-y-2 bg-white">
                  <span className="text-xs font-bold uppercase text-black block tracking-wider">{file.fileCategory}</span>
                  <p className="font-bold text-base text-black truncate">{fileName}</p>
                  {fileUrl !== "#" && (
                    <div className="flex items-center gap-3 no-print pt-1">
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-black hover:underline inline-flex items-center gap-1">
                        <Eye className="h-4 w-4" /> View
                      </a>
                      <a href={fileUrl} download className="text-sm font-bold text-black hover:underline inline-flex items-center gap-1">
                        <Download className="h-4 w-4" /> Download
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 4: COMMERCIAL & PAYMENT INFORMATION */}
      <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          4. COMMERCIAL & PAYMENT INFORMATION
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 text-black">
          <div className="border-2 border-black p-4">
            <span className="text-base font-bold text-black uppercase tracking-wider block mb-1">Total Charges</span>
            <span className="text-xl sm:text-2xl font-extrabold text-black block">₹{reg.totalCharges?.toFixed(2)}</span>
          </div>
          <div className="border-2 border-black p-4">
            <span className="text-base font-bold text-black uppercase tracking-wider block mb-1">Advance Paid</span>
            <span className="text-xl sm:text-2xl font-extrabold text-black block">₹{reg.advancePaid?.toFixed(2)}</span>
          </div>
          <div className="border-2 border-black p-4">
            <span className="text-base font-bold text-black uppercase tracking-wider block mb-1">Balance Amount</span>
            <span className="text-xl sm:text-2xl font-extrabold text-black block">₹{reg.balanceAmount?.toFixed(2)}</span>
          </div>
          <div className="border-2 border-black p-4">
            <span className="text-base font-bold text-black uppercase tracking-wider block mb-1">Payment Mode</span>
            <span className="text-lg font-bold text-black block">{reg.paymentMode || "-"}</span>
          </div>
          <div className="border-2 border-black p-4">
            <span className="text-base font-bold text-black uppercase tracking-wider block mb-1">Payment Status</span>
            <span className="text-lg font-extrabold text-black uppercase block">{reg.paymentStatus || "Pending"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-black pt-4 border-t-2 border-black">
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Collected Person</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.collectedPerson || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Registered Person</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.registeredPerson || reg.createdBy || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Commission To</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.commissionToName || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Region of Registration</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.regionOfRegistration || "-"}</span>
          </div>
        </div>
      </section>

      {/* ADVANCE PAYMENT HISTORY & APPROVALS */}
      <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          ADVANCE PAYMENT HISTORY & APPROVALS
        </h2>
        <div className="text-black">
          <AdvanceHistoryTable
            history={data.advancePaymentApprovals || []}
            onRefresh={fetchDetails}
          />
        </div>
      </section>

      {/* SECTION 5: PAYMENT DOCUMENTS */}
      {reg.paymentUpdates && reg.paymentUpdates.length > 0 && (
        <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
            5. PAYMENT RECEIPTS & DOCUMENTS
          </h2>
          <div className="space-y-4 text-black">
            {reg.paymentUpdates.map((update: any) => (
              <div key={update.id} className="flex flex-wrap items-center justify-between gap-4 border-2 border-black p-4">
                <div>
                  <p className="font-extrabold text-lg text-black">
                    INVOICE #{update.invoiceNumber} — ₹{Number(update.amountPaid).toFixed(2)} ({update.paymentMode})
                  </p>
                  <p className="text-base font-bold text-black">
                    Submitted by {update.submittedBy || "System"} on {formatDate(update.submittedAt)}
                  </p>
                </div>
                {update.receiptFileUrl && (
                  <div className="flex items-center gap-3 no-print">
                    <a href={update.receiptFileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-black hover:underline inline-flex items-center gap-1">
                      <Eye className="h-4 w-4" /> Preview
                    </a>
                    <a href={update.receiptFileUrl} download className="text-sm font-bold text-black hover:underline inline-flex items-center gap-1">
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 6: CURRENT PROCESS INFORMATION */}
      <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          6. CURRENT PROCESS INFORMATION
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-black">
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Current Office</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{proc.currentOffice}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Current Department</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{proc.currentDepartment}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Current Package</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{proc.currentPackage}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Current Sub Package</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{proc.currentSubPackage}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Current Assigned User</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{proc.currentHandler}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Current Status</span>
            <span className="text-lg sm:text-xl font-extrabold text-black uppercase block">{proc.currentStatus}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Current Stage</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{proc.currentStage}</span>
          </div>
        </div>
      </section>

      {/* SECTION 7: DOCUMENT MOVEMENT TIMELINE */}
      <section id="section-timeline" className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          7. DOCUMENT MOVEMENT TIMELINE
        </h2>

        {workflowHistory && workflowHistory.length > 0 ? (
          <div className="relative pl-8 space-y-6 border-l-4 border-black">
            {workflowHistory.map((step: any, index: number) => (
              <div key={step.id || index} className="relative">
                <div className="absolute -left-[41px] top-1.5 h-5 w-5 rounded-full bg-black border-2 border-white" />
                <div className="border-2 border-black p-5 space-y-2 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2">
                    <span className="font-extrabold text-lg uppercase text-black">{step.workflowStep || step.status}</span>
                    <span className="text-base font-bold text-black">
                      {formatDateTime(step.performedAt)}
                    </span>
                  </div>
                  <p className="text-base font-bold text-black">{step.remarks || "No remarks logged."}</p>
                  <p className="text-sm font-bold text-black uppercase">Performed by: {step.performedBy || "System"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base font-bold italic text-black">No workflow timeline recorded.</p>
        )}
      </section>

      {/* SECTION 8: DOCUMENT MOVEMENT HISTORY */}
      <section id="section-history" className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          8. DOCUMENT MOVEMENT HISTORY
        </h2>

        {movementHistory && movementHistory.length > 0 ? (
          <div className="overflow-x-auto border-2 border-black">
            <table className="w-full text-left text-base">
              <thead className="bg-white text-black border-b-2 border-black font-extrabold uppercase">
                <tr>
                  <th className="p-3 border-r-2 border-black">Date & Time</th>
                  <th className="p-3 border-r-2 border-black">From Office</th>
                  <th className="p-3 border-r-2 border-black">To Office</th>
                  <th className="p-3 border-r-2 border-black">User</th>
                  <th className="p-3 border-r-2 border-black">Action</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {movementHistory.map((mov: any) => (
                  <tr key={mov.id}>
                    <td className="p-3 font-bold border-r-2 border-black whitespace-nowrap">{formatDateTime(mov.performedAt)}</td>
                    <td className="p-3 font-bold border-r-2 border-black">{mov.oldOffice || "-"}</td>
                    <td className="p-3 font-bold border-r-2 border-black">{mov.newOffice || "-"}</td>
                    <td className="p-3 font-bold border-r-2 border-black">{mov.performedBy || "-"}</td>
                    <td className="p-3 font-extrabold border-r-2 border-black">{mov.action}</td>
                    <td className="p-3 font-bold text-black">{mov.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-base font-bold italic text-black">No movement history entries.</p>
        )}
      </section>

      {/* SECTION 9: APPROVAL INFORMATION */}
      <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          9. APPROVAL INFORMATION
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-black">
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Approval Status</span>
            <span className="text-lg sm:text-xl font-extrabold text-black uppercase block">{reg.approvalStatus || "Pending"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Approved By</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.approvedBy || "-"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Approved Date</span>
            <span className="text-lg sm:text-xl font-bold text-black block">
              {reg.approvedAt ? formatDateTime(reg.approvedAt) : "-"}
            </span>
          </div>
          {reg.rejectionReason && (
            <div className="col-span-full border-2 border-black p-4">
              <span className="text-base font-bold text-black uppercase tracking-wider block mb-1">Rejection Reason</span>
              <span className="text-lg font-bold text-black block">{reg.rejectionReason}</span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 10: AUDIT INFORMATION */}
      <section className="print-section bg-white border-2 border-black p-6 sm:p-8 space-y-6 text-black shadow-none rounded-none">
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-black border-b-2 border-black pb-3 tracking-wide">
          10. AUDIT INFORMATION
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-black">
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Created By</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.createdBy || "System"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Created Date</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{formatDateTime(reg.createdAt)}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Updated By</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{reg.updatedBy || reg.createdBy || "System"}</span>
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-black uppercase tracking-wider block mb-1">Updated Date</span>
            <span className="text-lg sm:text-xl font-bold text-black block">{formatDateTime(reg.updatedAt)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
