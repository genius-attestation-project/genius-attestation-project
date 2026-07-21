"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";

type ImportStep = "upload" | "preview" | "result";

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
  const [toastMessage, setToastMessage] = useState<{ type: "success"|"error", message: string } | null>(null);

  const showToast = (type: "success"|"error", message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreviewData(null);
    setResult(null);
    setToastMessage(null);
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
      a.download = "Registration_Import_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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

  const handleActionChange = (rowIndex: number, action: string) => {
    const updatedRows = [...previewData.rows];
    updatedRows[rowIndex].resolutionAction = action;
    setPreviewData({ ...previewData, rows: updatedRows });
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch("/api/registrations/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file?.name,
          summary: previewData.summary,
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
    "upload": "Import Registrations",
    "preview": "Preview Data",
    "result": "Import Summary"
  };

  const descMap = {
    "upload": "Upload your Excel or CSV file to bulk import registrations.",
    "preview": "Review the imported data and resolve any duplicates or warnings.",
    "result": "Import process completed."
  };

  return (
    <FormDrawer 
      open={open} 
      onClose={() => handleOpenChange(false)}
      title={titleMap[step]} 
      description={descMap[step]} 
      placement="side"
    >
      <div className="flex h-full flex-col">
        {toastMessage && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm text-white ${toastMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
             {toastMessage.message}
          </div>
        )}

        {step === "upload" && (
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="w-full flex justify-between bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Need the template?</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Download our formatted Excel template to ensure perfect compatibility.</p>
                </div>
              </div>
              <Button variant="secondary" className="gap-2 shrink-0" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4" /> Template
              </Button>
            </div>

            <div 
              className={`w-full border-2 border-dashed rounded-xl p-10 text-center transition-colors
                ${file ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-900/50'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <UploadCloud className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-1">
                {file ? file.name : "Drag & drop your file here"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .xlsx and .csv up to 10MB"}
              </p>
              
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".xlsx, .csv" 
                onChange={handleFileChange} 
              />
              <Button type="button" variant={file ? "secondary" : "primary"} onClick={() => document.getElementById("file-upload")?.click()}>
                {file ? "Change File" : "Browse Files"}
              </Button>
            </div>
            
            <div className="flex w-full sm:justify-end gap-3 mt-auto">
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handlePreview} disabled={!file || isUploading}>
                {isUploading ? "Processing..." : "Preview Data"} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && previewData && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-4 mb-2">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border">
                <p className="text-sm text-gray-500">Total Rows</p>
                <p className="text-2xl font-bold">{previewData.summary.totalRows}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-900">
                <p className="text-sm text-green-600 dark:text-green-400">Valid</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{previewData.summary.validCount}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                <p className="text-sm text-amber-600 dark:text-amber-400">Duplicates</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{previewData.summary.duplicateCount}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{previewData.summary.errorCount}</p>
              </div>
            </div>
            
            {previewData.summary.newOffices.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900 flex gap-2">
                 <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0" />
                 <div>
                   <p className="font-medium text-sm text-blue-800 dark:text-blue-300">New Master Data will be created</p>
                   <p className="text-xs text-blue-600 dark:text-blue-400">
                     Offices: {previewData.summary.newOffices.join(", ")}
                   </p>
                 </div>
              </div>
            )}

            <div className="border rounded-md overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Tracking No.</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row: any, i: number) => (
                    <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{row.rowNumber}</td>
                      <td className="px-4 py-3">
                        {row.status === "Valid" && <span className="inline-flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded text-xs"><CheckCircle2 className="w-3 h-3"/> Valid</span>}
                        {row.status === "Duplicate" && <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-1 rounded text-xs"><AlertTriangle className="w-3 h-3"/> Duplicate</span>}
                        {row.status === "Error" && <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded text-xs" title={row.errors.join(", ")}><XCircle className="w-3 h-3"/> Error</span>}
                      </td>
                      <td className="px-4 py-3">{row.data["Customer Name*"]}</td>
                      <td className="px-4 py-3">{row.data["Tracking Number"] || "-"}</td>
                      <td className="px-4 py-3">
                        {row.status === "Duplicate" ? (
                           <select 
                             className="text-xs border rounded p-1"
                             value={row.resolutionAction}
                             onChange={(e) => handleActionChange(i, e.target.value)}
                           >
                             <option value="Skip">Skip</option>
                             <option value="Update">Update Existing</option>
                             <option value="Duplicate">Create Duplicate</option>
                           </select>
                        ) : row.status === "Error" ? (
                           <span className="text-xs text-gray-400">Skip</span>
                        ) : (
                           <span className="text-xs text-gray-500">Create</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex w-full sm:justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleConfirm} disabled={isConfirming}>
                {isConfirming ? "Importing..." : "Confirm Import"}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="flex flex-col items-center justify-center py-10">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold mb-2">Import Successful!</h2>
             <p className="text-gray-500 mb-6 text-center max-w-md">
               Your file has been processed. The results are summarized below.
             </p>
             
             <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
               <div className="text-center p-4 bg-gray-50 rounded-lg border">
                 <p className="text-xl font-bold text-green-600">{result.summary.successfulRows}</p>
                 <p className="text-xs text-gray-500 uppercase">Imported</p>
               </div>
               <div className="text-center p-4 bg-gray-50 rounded-lg border">
                 <p className="text-xl font-bold text-amber-600">{result.summary.skippedRows}</p>
                 <p className="text-xs text-gray-500 uppercase">Skipped</p>
               </div>
               <div className="text-center p-4 bg-gray-50 rounded-lg border">
                 <p className="text-xl font-bold text-red-600">{result.summary.failedRows}</p>
                 <p className="text-xs text-gray-500 uppercase">Failed</p>
               </div>
             </div>

             <div className="mt-8 flex justify-center w-full">
               <Button onClick={() => handleOpenChange(false)}>
                 Done
               </Button>
             </div>
          </div>
        )}

      </div>
    </FormDrawer>
  );
}
