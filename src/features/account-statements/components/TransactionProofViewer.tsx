"use client";

import React from "react";
import { X, Download, FileText, ExternalLink } from "lucide-react";

interface TransactionProofViewerProps {
  isOpen: boolean;
  proofUrl: string | null;
  proofTitle?: string;
  onClose: () => void;
}

export const TransactionProofViewer: React.FC<TransactionProofViewerProps> = ({
  isOpen,
  proofUrl,
  proofTitle = "Payment Proof Document",
  onClose,
}) => {
  if (!isOpen || !proofUrl) return null;

  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(proofUrl) || proofUrl.includes("/view");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {proofTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uploaded document proof
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={proofUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/80 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="mt-4 flex min-h-[350px] max-h-[550px] items-center justify-center overflow-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5">
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={proofUrl}
              alt={proofTitle}
              className="max-h-[500px] w-auto rounded-xl object-contain shadow-md"
            />
          ) : (
            <iframe
              src={proofUrl}
              title={proofTitle}
              className="h-[500px] w-full rounded-xl border-none"
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-slate-100 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
