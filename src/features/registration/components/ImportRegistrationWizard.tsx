"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  X,
  Layers,
  Copy,
} from "lucide-react";

type ImportStep = "upload" | "preview" | "result";
type FilterTab = "all" | "valid" | "mismatches" | "duplicates";

interface ImportRegistrationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportRegistrationWizard({ open, onOpenChange, onSuccess }: ImportRegistrationWizardProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreviewData(null);
    setResult(null);
    setToastMessage(null);
    setActiveTab("all");
    setExpandedRows({});
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/registrations/import/template");
      if (!res.ok) throw new Error("Failed to download template");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Revenue_Registration_Import_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("success", "Template downloaded successfully.");
    } catch (error) {
      showToast("error", "Failed to download template");
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/registrations/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewData(data);
        setStep("preview");
      } else {
        showToast("error", data.error || "Failed to parse file");
      }
    } catch (error) {
      showToast("error", "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleRowSelect = (rowIndex: number) => {
    if (!previewData?.rows) return;
    const updatedRows = [...previewData.rows];
    updatedRows[rowIndex].isSelected = !updatedRows[rowIndex].isSelected;
    setPreviewData({ ...previewData, rows: updatedRows });
  };

  const toggleSelectAll = (select: boolean) => {
    if (!previewData?.rows) return;
    const updatedRows = previewData.rows.map((row: any) => ({
      ...row,
      isSelected: row.status !== "Mismatch" && row.status !== "Error" ? select : false,
    }));
    setPreviewData({ ...previewData, rows: updatedRows });
  };

  const handleActionChange = (rowIndex: number, action: string) => {
    const updatedRows = [...previewData.rows];
    updatedRows[rowIndex].resolutionAction = action;
    if (action === "Skip") {
      updatedRows[rowIndex].isSelected = false;
    } else {
      updatedRows[rowIndex].isSelected = true;
    }
    setPreviewData({ ...previewData, rows: updatedRows });
  };

  const toggleRowExpand = (rowIndex: number) => {
    setExpandedRows((prev) => ({ ...prev, [rowIndex]: !prev[rowIndex] }));
  };

  const selectedCount = useMemo(() => {
    return (previewData?.rows || []).filter((r: any) => r.isSelected && r.status !== "Mismatch").length;
  }, [previewData]);

  const filteredRows = useMemo(() => {
    if (!previewData?.rows) return [];
    return previewData.rows.map((row: any, originalIndex: number) => ({ row, originalIndex })).filter(({ row }: any) => {
      if (activeTab === "valid") return row.status === "Valid" || row.status === "Warning";
      if (activeTab === "mismatches") return row.status === "Mismatch" || row.status === "Error";
      if (activeTab === "duplicates") return row.status === "Duplicate";
      return true;
    });
  }, [previewData, activeTab]);

  const handleConfirm = async () => {
    if (selectedCount === 0) {
      showToast("error", "Please select at least one valid row to import.");
      return;
    }

    setIsConfirming(true);
    try {
      const res = await fetch("/api/registrations/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file?.name,
          rows: previewData.rows,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);
        setStep("result");
        onSuccess();
      } else {
        showToast("error", data.error || "Failed to confirm import");
      }
    } catch (error) {
      showToast("error", "An error occurred during import.");
    } finally {
      setIsConfirming(false);
    }
  };

  const titleMap = {
    upload: "Import Revenue Registrations",
    preview: "Import Preview & Verification",
    result: "Import Summary",
  };

  const descMap = {
    upload: "Upload your filled Excel template to preview, validate against master data, and selectively import.",
    preview: "Inspect verified system references, resolve any mismatches or duplicates, and select records to import.",
    result: "Import operation finished successfully.",
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => handleOpenChange(false)}
      title={titleMap[step]}
      description={descMap[step]}
      placement="side"
    >
      <div className="flex h-full flex-col min-w-0">
        {toastMessage && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              toastMessage.type === "success"
                ? "bg-emerald-600 text-white"
                : toastMessage.type === "info"
                ? "bg-blue-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {toastMessage.message}
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <div className="flex flex-col gap-6 py-4">
            {/* Download Template Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50 dark:border-blue-900/60 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Download Current Template</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Formatted with current Revenue Registration fields and active Master Data reference guide.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleDownloadTemplate}
                className="shrink-0 gap-2 rounded-xl border-blue-200 bg-white hover:bg-blue-50 text-blue-700 shadow-xs dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
              >
                <Download className="w-4 h-4" /> Download Template
              </Button>
            </div>

            {/* Instruction Callout */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Info size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Import Guidelines:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                <li>Only <strong>Customer Name</strong> and <strong>Mobile Number</strong> are mandatory.</li>
                <li>Optional columns can be left blank — they will safely import as empty/default values.</li>
                <li>Office Locations, Document Types, and Process Types will be matched against your active Master Configuration.</li>
                <li>Tracking numbers will be automatically generated if left blank.</li>
              </ul>
            </div>

            {/* Drag and drop upload zone */}
            <div
              className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                file
                  ? "border-blue-500 bg-blue-50/40 dark:border-blue-400 dark:bg-blue-950/20"
                  : "border-slate-300 hover:border-blue-400 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById("file-upload-input")?.click()}
            >
              <UploadCloud className={`w-12 h-12 mx-auto mb-3 ${file ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {file ? file.name : "Drag & drop your Excel or CSV file here"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .xlsx, .xls, and .csv up to 10MB"}
              </p>

              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant={file ? "secondary" : "primary"}
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById("file-upload-input")?.click();
                }}
                className="rounded-xl"
              >
                {file ? "Change Selected File" : "Browse Files"}
              </Button>
            </div>

            <div className="flex w-full justify-end gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-white/10">
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!file || isUploading} className="gap-2">
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {isUploading ? "Validating..." : "Preview & Validate"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & SELECTION */}
        {step === "preview" && previewData && (
          <div className="flex flex-col gap-4 py-2 min-w-0">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setActiveTab("all")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "border-blue-500 bg-blue-50/50 shadow-xs dark:bg-blue-950/30"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Rows</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {previewData.summary.totalRows}
                </p>
              </div>

              <div
                onClick={() => setActiveTab("valid")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === "valid"
                    ? "border-emerald-500 bg-emerald-50 shadow-xs dark:bg-emerald-950/30"
                    : "border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Valid</p>
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                  {previewData.summary.validCount}
                </p>
              </div>

              <div
                onClick={() => setActiveTab("mismatches")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === "mismatches"
                    ? "border-rose-500 bg-rose-50 shadow-xs dark:bg-rose-950/30"
                    : "border-rose-200/80 bg-rose-50/40 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Mismatches</p>
                  <XCircle size={15} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-1">
                  {previewData.summary.mismatchCount}
                </p>
              </div>

              <div
                onClick={() => setActiveTab("duplicates")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeTab === "duplicates"
                    ? "border-amber-500 bg-amber-50 shadow-xs dark:bg-amber-950/30"
                    : "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Duplicates</p>
                  <Copy size={15} className="text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">
                  {previewData.summary.duplicateCount}
                </p>
              </div>
            </div>

            {/* Filter Tabs & Selection Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === "all" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  All ({previewData.summary.totalRows})
                </button>
                <button
                  onClick={() => setActiveTab("valid")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === "valid" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Valid ({previewData.summary.validCount})
                </button>
                <button
                  onClick={() => setActiveTab("mismatches")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === "mismatches" ? "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Mismatches ({previewData.summary.mismatchCount})
                </button>
                <button
                  onClick={() => setActiveTab("duplicates")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === "duplicates" ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Duplicates ({previewData.summary.duplicateCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {selectedCount} rows selected
                </span>
                <Button variant="ghost" size="sm" onClick={() => toggleSelectAll(true)} className="text-xs h-8">
                  Select Valid
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleSelectAll(false)} className="text-xs h-8">
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-[#0f1115]">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount > 0 && selectedCount === previewData.summary.validCount}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2.5 w-12">Row</th>
                      <th className="px-3 py-2.5 w-28">Status</th>
                      <th className="px-3 py-2.5">Customer</th>
                      <th className="px-3 py-2.5">Tracking No.</th>
                      <th className="px-3 py-2.5">Created Date</th>
                      <th className="px-3 py-2.5">Process & Document</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map(({ row, originalIndex }: any) => {
                        const isExpanded = Boolean(expandedRows[originalIndex]);
                        const isMismatch = row.status === "Mismatch" || row.status === "Error";
                        const isDuplicate = row.status === "Duplicate";

                        // Format created date display (e.g. 15/07/2025)
                        let createdDateDisplay = "Use Import Date";
                        if (row.data.createdDate) {
                          try {
                            const d = new Date(row.data.createdDate);
                            if (!isNaN(d.getTime())) {
                              const day = String(d.getUTCDate()).padStart(2, "0");
                              const month = String(d.getUTCMonth() + 1).padStart(2, "0");
                              const year = d.getUTCFullYear();
                              createdDateDisplay = `${day}/${month}/${year}`;
                            }
                          } catch {
                            createdDateDisplay = row.data.createdDate;
                          }
                        }

                        return (
                          <React.Fragment key={originalIndex}>
                            <tr
                              className={`transition-colors ${
                                isMismatch
                                  ? "bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/60"
                                  : isDuplicate
                                  ? "bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60"
                                  : "hover:bg-slate-50 dark:hover:bg-white/5"
                              }`}
                            >
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={Boolean(row.isSelected)}
                                  disabled={isMismatch}
                                  onChange={() => toggleRowSelect(originalIndex)}
                                  className={`rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
                                    isMismatch ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                  }`}
                                />
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-500 font-mono">
                                #{row.rowNumber}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {row.status === "Valid" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <CheckCircle2 size={11} /> Valid
                                  </span>
                                )}
                                {row.status === "Warning" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold dark:bg-blue-950/60 dark:text-blue-300">
                                    <AlertTriangle size={11} /> Warning
                                  </span>
                                )}
                                {row.status === "Mismatch" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold dark:bg-rose-950/60 dark:text-rose-300">
                                    <XCircle size={11} /> Mismatch
                                  </span>
                                )}
                                {row.status === "Duplicate" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold dark:bg-amber-950/60 dark:text-amber-300">
                                    <AlertTriangle size={11} /> Duplicate
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {row.data.customerName || "-"}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {row.data.mobile || "-"}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                                {row.data.trackingNumber || "(Auto Generated)"}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                                {row.data.createdDate ? (
                                  <span className="font-semibold text-slate-900 dark:text-white">{createdDateDisplay}</span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Import Date</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {row.data.processType || "General"}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {row.data.documentType || "General Document"}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                {isDuplicate ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <select
                                      className="text-[11px] font-semibold border rounded-lg p-1 bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                                      value={row.resolutionAction}
                                      onChange={(e) => handleActionChange(originalIndex, e.target.value)}
                                    >
                                      <option value="Skip">Skip</option>
                                      <option value="Update">Update Existing</option>
                                      <option value="Duplicate">Create Duplicate</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => toggleRowExpand(originalIndex)}
                                      className="inline-flex items-center text-amber-600 hover:text-amber-700 p-1"
                                      title="View duplicate details"
                                    >
                                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                    </button>
                                  </div>
                                ) : isMismatch ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpand(originalIndex)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                                  >
                                    {isExpanded ? "Hide Issues" : "View Issues"}
                                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-emerald-600 font-semibold">Ready to Import</span>
                                )}
                              </td>
                            </tr>

                            {/* Mismatch & Validation Details Expandable Row */}
                            {(isExpanded || (isMismatch && activeTab === "mismatches") || (isDuplicate && activeTab === "duplicates")) && row.mismatches?.length > 0 && (
                              <tr className={isDuplicate ? "bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30" : "bg-rose-50/60 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30"}>
                                <td colSpan={8} className="px-4 py-3">
                                  <div className="space-y-2">
                                    <p className={`text-[11px] font-bold ${isDuplicate ? "text-amber-800 dark:text-amber-300" : "text-rose-800 dark:text-rose-300"}`}>
                                      {isDuplicate ? `Duplicate details for Row #${row.rowNumber}:` : `Issues identified in Row #${row.rowNumber}:`}
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {row.mismatches.map((m: any, mIdx: number) => (
                                        <div
                                          key={mIdx}
                                          className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 border shadow-xs space-y-1 ${
                                            m.status === "Warning" && isDuplicate
                                              ? "border-amber-200 dark:border-amber-800/60"
                                              : "border-rose-200 dark:border-rose-800/60"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                              {m.field}
                                            </span>
                                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                              m.status === "Warning"
                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                            }`}>
                                              {m.status}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                            Supplied: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">"{m.value || "(empty)"}"</span>
                                          </p>
                                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                            Reason: {m.reason}
                                          </p>
                                          {m.suggestion && (
                                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                              Suggested System Match: "{m.suggestion}"
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10 mt-auto">
              <Button variant="ghost" onClick={() => setStep("upload")} className="rounded-xl">
                Back to Upload
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirming || selectedCount === 0}
                className="gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
              >
                {isConfirming ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {isConfirming ? "Importing Records..." : `Import Selected (${selectedCount} Rows)`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT SUMMARY */}
        {step === "result" && result && (
          <div className="flex flex-col items-center justify-center py-8 min-w-0">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5 text-center">
              Import Completed!
            </h2>
            <p className="text-xs text-slate-500 text-center max-w-sm mb-6">
              Your registrations have been processed and seamlessly integrated into the document workflow.
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  {result.summary.successfulRows}
                </p>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-1">Imported</p>
              </div>

              <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                  {result.summary.skippedRows}
                </p>
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mt-1">Skipped</p>
              </div>

              <div className="text-center p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">
                  {result.summary.failedRows}
                </p>
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mt-1">Failed</p>
              </div>
            </div>

            {result.summary.failedRowDetails?.length > 0 && (
              <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 text-xs">
                <p className="font-bold text-rose-800 dark:text-rose-300 mb-1">Failed Row Details:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 dark:text-rose-400">
                  {result.summary.failedRowDetails.map((f: any, i: number) => (
                    <li key={i}>
                      Row #{f.rowNumber}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={() => handleOpenChange(false)} className="rounded-xl px-8">
              Done
            </Button>
          </div>
        )}
      </div>
    </FormDrawer>
  );
}
