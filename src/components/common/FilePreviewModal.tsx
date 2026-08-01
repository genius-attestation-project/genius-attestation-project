"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type PreviewFileItem = {
  id?: string;
  fileName?: string;
  originalName?: string;
  name?: string;
  url?: string;
  mimeType?: string;
  extension?: string;
};

type FilePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  file: PreviewFileItem | null;
};

export function FilePreviewModal({ open, onClose, file }: FilePreviewModalProps) {
  if (!open || !file) return null;

  const fileName = file.originalName || file.fileName || file.name || "Document";
  const ext = (file.extension || fileName.split(".").pop() || "").toLowerCase().replace(".", "");

  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) || file.mimeType?.startsWith("image/");
  const isPdf = ext === "pdf" || file.mimeType === "application/pdf";

  const fileUrl = file.id ? `/api/files/${file.id}/view` : file.url || "#";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-white/10 dark:bg-[#0f1115]"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 250, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md" title={fileName}>
                  {fileName}
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {ext.toUpperCase()} File Preview
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="text-xs font-semibold"
              >
                <Download size={14} className="mr-1.5" /> Download
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(fileUrl, "_blank")}
                title="Open in new tab"
                className="hidden sm:flex"
              >
                <ExternalLink size={16} />
              </Button>

              <Button variant="ghost" size="icon" onClick={onClose} title="Close">
                <X size={18} />
              </Button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/50 dark:bg-black/30 min-h-[400px]">
            {isImage ? (
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-md"
              />
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                title={fileName}
                className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-white/10 bg-white"
              />
            ) : (
              <div className="text-center p-8 space-y-3 max-w-sm">
                <FileText className="mx-auto h-16 w-16 text-blue-500/70" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Preview not directly supported for {ext.toUpperCase()} files.
                </p>
                <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Download size={16} className="mr-2" /> Download Original File
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
