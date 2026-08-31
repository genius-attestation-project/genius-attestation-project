"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Textarea } from "@/components/ui/Textarea";
import { DocumentInfoCard } from "@/components/ui/DocumentInfoCard";
import { formatBundleNumber } from "@/utils/format";
import { calculateNumberOfDays } from "@/utils/days-calculator";

type RetrieveConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm?: (reason: string) => Promise<void>;
  onConfirmSelection?: (trackingNumbers: string[]) => Promise<void>;
  itemTitle?: string;
  documentCount?: number;
  documentDetails?: any[];
  loading?: boolean;
};

export function RetrieveConfirmationModal({
  open,
  onClose,
  onConfirm,
  onConfirmSelection,
  itemTitle,
  documentCount,
  documentDetails,
  loading = false,
}: RetrieveConfirmationModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedTrackingNumbers, setSelectedTrackingNumbers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const isSelectionMode = Boolean(onConfirmSelection);

  useEffect(() => {
    if (open && isSelectionMode) {
      setSelectedTrackingNumbers((documentDetails || []).map((document) => document.trackingNumber));
      setError("");
    }
  }, [open, isSelectionMode, documentDetails]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (isSelectionMode) {
        await onConfirmSelection?.(selectedTrackingNumbers);
      } else {
        await onConfirm?.(reason.trim());
      }
      setReason("");
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to retrieve documents.");
    } finally {
      setSubmitting(false);
    }
  };

  const isBtnDisabled = loading || submitting;
  const documents = documentDetails || [];
  const toggleSelected = (trackingNumber: string) => {
    setSelectedTrackingNumbers((current) => current.includes(trackingNumber)
      ? current.filter((tracking) => tracking !== trackingNumber)
      : [...current, trackingNumber]);
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => {
        if (!isBtnDisabled) {
          setReason("");
          onClose();
        }
      }}
      title="Retrieve Documents"
      description="Recover outbound transferred documents back to your office."
      placement="center"
    >
      <div className="space-y-5 pt-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-bold text-sm mb-1 text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            Undo Transfer Warning
          </p>
          <p className="leading-relaxed">
            These documents have not yet been received by the destination office. Do you want to retrieve them back to your office?
          </p>
          {itemTitle && (
            <div className="mt-2.5 pt-2 border-t border-amber-200/60 font-semibold text-amber-800 dark:border-amber-800/40 dark:text-amber-300">
              Target: <span className="font-mono">{formatBundleNumber(itemTitle)}</span>
              {documentCount !== undefined && ` (${documentCount} document${documentCount === 1 ? "" : "s"})`}
            </div>
          )}
        </div>

        {isSelectionMode && documents.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold uppercase text-slate-600 dark:bg-white/5 dark:text-slate-300"><tr><th className="p-3">Select</th><th className="p-3">SL No</th><th className="p-3">Tracking Number</th><th className="p-3">Registration Date</th><th className="p-3">Document Name</th><th className="p-3">Document Type</th><th className="p-3">Process Type</th><th className="p-3">Number Of Days</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">{documents.map((document: any, index) => {
                const registration = document.registration || document;
                const selected = selectedTrackingNumbers.includes(document.trackingNumber);
                return <tr key={document.trackingNumber} className={selected ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}>
                  <td className="p-3"><input type="checkbox" checked={selected} onChange={() => toggleSelected(document.trackingNumber)} /></td><td className="p-3">{index + 1}</td><td className="p-3 font-mono font-bold text-blue-600">{document.trackingNumber}</td><td className="p-3">{registration.createdAt ? new Date(registration.createdAt).toLocaleDateString() : document.registeredDate || "-"}</td><td className="p-3">{registration.documentName || registration.customerName || document.customerName || "-"}</td><td className="p-3">{registration.documentType || document.documentType || "-"}</td><td className="p-3">{registration.processType || document.processType || "-"}</td><td className="p-3">{calculateNumberOfDays(document.currentStageEnteredAt)}</td>
                </tr>;
              })}</tbody>
            </table>
            <p className="border-t border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">Selected: {selectedTrackingNumbers.length} Document{selectedTrackingNumbers.length === 1 ? "" : "s"}</p>
          </div>
        ) : documentDetails && documentDetails.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-slate-200 p-2.5 dark:border-white/10 bg-slate-50/50">
            {documentDetails.map((doc: any, i: number) => (
              <DocumentInfoCard key={doc.trackingNumber || i} document={doc} compact />
            ))}
          </div>
        )}

        {!isSelectionMode && <Textarea
          label="Reason for Retrieval (Optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for retrieval (e.g. Transferred by mistake)..."
          rows={3}
          className="rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:bg-white dark:border-white/10 dark:bg-white/5"
        />}
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setReason("");
              onClose();
            }}
            disabled={isBtnDisabled}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={isBtnDisabled || (isSelectionMode && selectedTrackingNumbers.length === 0)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RotateCcw className="h-4 w-4" />
            {isBtnDisabled ? "Retrieving..." : isSelectionMode ? "Retrieve Selected" : "Retrieve"}
          </Button>
        </div>
      </div>
    </FormDrawer>
  );
}
