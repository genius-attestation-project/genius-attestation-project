"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  History,
  GitCommit,
  FileCheck,
  Calendar,
  Layers,
  ArrowRightLeft,
  ExternalLink,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { cn } from "@/utils/cn";

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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading 360° Document Details for #{trackingNumber}...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Document Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{error || "Unable to locate record."}</p>
        <div className="pt-2">
          <Link href="/dashboard/revenue-registration">
            <Button variant="secondary" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Registrations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { registration: reg, currentProcess: proc, subPackageMovements, movementHistory, workflowHistory } = data;

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status: string) => {
    const s = (status || "Registered").trim();
    let bg = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800";

    if (s.includes("Delivered") || s.includes("Completed") || s === "Approved") {
      bg = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
    } else if (s.includes("Ready")) {
      bg = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800";
    } else if (s.includes("Hand") || s.includes("In Progress") || s.includes("Inbound")) {
      bg = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
    } else if (s.includes("Rejected") || s.includes("Cancelled")) {
      bg = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";
    }

    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider", bg)}>
        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => scrollToSection("section-timeline")} className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> Timeline
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => scrollToSection("section-history")} className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" /> History
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handlePrint} className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="h-3.5 w-3.5" /> Print Details
          </Button>
        </div>
      </div>

      {/* HERO HEADER CARD */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-linear-to-br from-white via-blue-50/40 to-slate-50 p-6 shadow-sm dark:border-blue-900/40 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Document Details
              </span>
              {getStatusBadge(proc.currentStatus)}
            </div>

            <div className="flex items-center gap-3">
              <PriorityDot priority={reg.priority} size={14} />
              <h1 className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {reg.trackingNumber}
              </h1>
            </div>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Registered for <span className="font-bold text-slate-900 dark:text-white">{reg.customerName}</span> ({reg.mobile})
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Office</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">{proc.currentOffice}</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Department</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">{proc.currentDepartment}</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Stage</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 block truncate">{proc.currentStage}</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Handler</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">{proc.currentHandler}</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Registered Date</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{new Date(reg.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Registered By</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">{reg.registeredPerson || reg.createdBy || "System"}</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Number of Days</span>
              <span className="font-extrabold text-amber-700 dark:text-amber-400 mt-0.5 block">{proc.daysCount}</span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Updated</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{new Date(reg.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: CUSTOMER INFORMATION */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Customer Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Tracking Number</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{reg.trackingNumber}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Customer Name</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{reg.customerName}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Mobile Number</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{reg.mobile}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Email</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{reg.email || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Address</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{reg.address || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Country</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{reg.country || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Customer Type</span>
            <span className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300">
              {reg.customerType || "Individual"}
            </span>
          </div>
          {reg.customerType === "Corporate" && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Company Name</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                {reg.corporateDetail?.companyName || "-"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: DOCUMENT INFORMATION */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Document Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Document Name</span>
            <span className="font-bold text-slate-900 dark:text-white">{reg.documentName || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Document Type</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{reg.documentType || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Issued Country</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{reg.documentIssuedCountry || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Process Type</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{reg.processType || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Address Process</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{reg.externalProcess || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Special Processing Priority</span>
            <div className="flex items-center gap-2 mt-0.5">
              <PriorityDot priority={reg.priority} size={10} />
              <span className="font-bold text-slate-900 dark:text-white">{reg.priority || "Normal"}</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Committed Duration / SLA</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">{reg.committedDuration || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Delivery Location</span>
            <span className="font-semibold text-slate-900 dark:text-white">{reg.deliveryLocation || "-"}</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: CUSTOMER DOCUMENTS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Customer Documents</h2>
        </div>
        {reg.files && reg.files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {reg.files.map((file: any) => {
              const storage = file.fileStorage || {};
              const fileName = storage.originalName || file.fileCategory || "Document";
              const fileUrl = storage.url || "#";
              return (
                <div key={file.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-8 w-8 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{fileName}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{file.fileCategory}</p>
                    </div>
                  </div>
                  {fileUrl !== "#" && (
                    <div className="flex items-center gap-1">
                      <a href={fileUrl} target="_blank" rel="noreferrer" title="Preview File">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-blue-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </a>
                      <a href={fileUrl} download title="Download File">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-blue-600">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs italic text-slate-400">No customer documents uploaded.</p>
        )}
      </section>

      {/* SECTION 4: COMMERCIAL INFORMATION */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Commercial Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 text-xs">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Charges</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-base">₹{reg.totalCharges?.toFixed(2)}</span>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase">Advance Paid</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-base">₹{reg.advancePaid?.toFixed(2)}</span>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-950 dark:bg-blue-950/20">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block uppercase">Balance Amount</span>
            <span className="font-extrabold text-blue-700 dark:text-blue-300 text-base">₹{reg.balanceAmount?.toFixed(2)}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Payment Mode</span>
            <span className="font-bold text-slate-900 dark:text-white">{reg.paymentMode || "-"}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Payment Status</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{reg.paymentStatus || "Pending"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Collected Person</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{reg.collectedPerson || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Registered Person</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{reg.registeredPerson || reg.createdBy || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Commission To</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{reg.commissionToName || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Region of Registration</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{reg.regionOfRegistration || "-"}</span>
          </div>
        </div>
      </section>

      {/* SECTION 5: PAYMENT DOCUMENTS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Payment Documents</h2>
        </div>
        {reg.paymentUpdates && reg.paymentUpdates.length > 0 ? (
          <div className="space-y-3">
            {reg.paymentUpdates.map((update: any) => (
              <div key={update.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                <div className="space-y-1">
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    Invoice #{update.invoiceNumber} — ₹{Number(update.amountPaid).toFixed(2)} ({update.paymentMode})
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Submitted by {update.submittedBy || "System"} on {new Date(update.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                {update.receiptFileUrl && (
                  <div className="flex items-center gap-2">
                    <a href={update.receiptFileUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm" className="gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Preview Receipt
                      </Button>
                    </a>
                    <a href={update.receiptFileUrl} download>
                      <Button variant="secondary" size="sm" className="gap-1 text-xs">
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-slate-400">No payment receipts uploaded.</p>
        )}
      </section>

      {/* SECTION 6: CURRENT PROCESS INFORMATION */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Current Process Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Current Office</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{proc.currentOffice}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Current Department</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{proc.currentDepartment}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Current Package</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{proc.currentPackage}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Current Sub Package</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{proc.currentSubPackage}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Current Assigned User</span>
            <span className="font-bold text-slate-900 dark:text-white">{proc.currentHandler}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Current Status</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{proc.currentStatus}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Current Stage</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{proc.currentStage}</span>
          </div>
        </div>
      </section>

      {/* SECTION 7: DOCUMENT MOVEMENT TIMELINE */}
      <section id="section-timeline" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3 dark:border-white/10">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Document Movement Timeline</h2>
        </div>

        {workflowHistory && workflowHistory.length > 0 ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900">
            {workflowHistory.map((step: any, index: number) => (
              <div key={step.id || index} className="relative group">
                <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 dark:border-slate-900 dark:bg-blue-400 group-hover:scale-125 transition-transform" />
                <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/10 bg-slate-50/40 dark:bg-white/5 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-xs text-blue-700 dark:text-blue-300">{step.workflowStep || step.status}</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {new Date(step.performedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{step.remarks || "No remarks logged."}</p>
                  <p className="text-[10px] text-slate-400">Performed by: <span className="font-medium text-slate-700 dark:text-slate-300">{step.performedBy || "System"}</span></p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-slate-400">No workflow timeline recorded.</p>
        )}
      </section>

      {/* SECTION 8: DOCUMENT MOVEMENT HISTORY */}
      <section id="section-history" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">8. Document Movement History</h2>
        </div>

        {movementHistory && movementHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-bold uppercase">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">From Office</th>
                  <th className="p-3">To Office</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {movementHistory.map((mov: any) => (
                  <tr key={mov.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="p-3 whitespace-nowrap font-medium">{new Date(mov.performedAt).toLocaleString()}</td>
                    <td className="p-3 whitespace-nowrap font-semibold">{mov.oldOffice || "-"}</td>
                    <td className="p-3 whitespace-nowrap font-semibold text-blue-600 dark:text-blue-400">{mov.newOffice || "-"}</td>
                    <td className="p-3 whitespace-nowrap">{mov.performedBy || "-"}</td>
                    <td className="p-3 whitespace-nowrap font-bold">{mov.action}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{mov.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs italic text-slate-400">No movement history entries.</p>
        )}
      </section>

      {/* SECTION 9: APPROVAL INFORMATION */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">9. Approval Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Approval Status</span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{reg.approvalStatus || "Pending"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Approved By</span>
            <span className="font-bold text-slate-900 dark:text-white">{reg.approvedBy || "-"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Approved Date</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {reg.approvedAt ? new Date(reg.approvedAt).toLocaleString() : "-"}
            </span>
          </div>
          {reg.rejectionReason && (
            <div className="col-span-full rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
              <span className="text-[11px] font-bold text-red-600 block uppercase">Rejection Reason</span>
              <span className="font-semibold text-red-900 dark:text-red-200 text-xs mt-1 block">{reg.rejectionReason}</span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 10: AUDIT INFORMATION */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 dark:border-white/10">
          <GitCommit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">10. Audit Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Created By</span>
            <span className="font-bold text-slate-900 dark:text-white">{reg.createdBy || "System"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Created Date</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(reg.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Updated By</span>
            <span className="font-bold text-slate-900 dark:text-white">{reg.updatedBy || reg.createdBy || "System"}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Updated Date</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(reg.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
