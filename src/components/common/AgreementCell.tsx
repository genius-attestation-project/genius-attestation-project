"use client";

import React, { useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { FilePreviewModal } from "./FilePreviewModal";

export type AgreementFileProps = {
  id?: string;
  fileName?: string;
  originalName?: string;
  name?: string;
  url?: string;
  mimeType?: string;
  extension?: string;
};

type AgreementCellProps = {
  file?: AgreementFileProps | null;
  emptyLabel?: string;
};

export function AgreementCell({ file, emptyLabel = "No Document" }: AgreementCellProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!file) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500 italic font-medium">
        {emptyLabel}
      </span>
    );
  }

  const fileName = file.originalName || file.fileName || file.name || "Agreement Document";
  const ext = (file.extension || fileName.split(".").pop() || "").toLowerCase().replace(".", "");

  const isPreviewable =
    ["pdf", "jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) ||
    file.mimeType?.startsWith("image/") ||
    file.mimeType === "application/pdf";

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

  const handleView = () => {
    if (isPreviewable) {
      setPreviewOpen(true);
    } else {
      handleDownload();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1 min-w-[170px]">
        <button
          type="button"
          onClick={handleView}
          title={isPreviewable ? `View ${fileName}` : `Download ${fileName}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 text-left truncate max-w-[200px]"
        >
          <FileText size={14} className="shrink-0 text-blue-500" />
          <span className="truncate">{fileName}</span>
        </button>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={handleView}
            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 transition-colors"
          >
            <Eye size={12} /> View
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 transition-colors"
          >
            <Download size={12} /> Download
          </button>
        </div>
      </div>

      <FilePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        file={file}
      />
    </>
  );
}
