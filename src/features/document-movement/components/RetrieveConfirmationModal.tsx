"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Textarea } from "@/components/ui/Textarea";

type RetrieveConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  itemTitle?: string;
  documentCount?: number;
  loading?: boolean;
};

export function RetrieveConfirmationModal({
  open,
  onClose,
  onConfirm,
  itemTitle,
  documentCount,
  loading = false,
}: RetrieveConfirmationModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const isBtnDisabled = loading || submitting;

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
              Target: <span className="font-mono">{itemTitle}</span>
              {documentCount !== undefined && ` (${documentCount} document${documentCount === 1 ? "" : "s"})`}
            </div>
          )}
        </div>

        <Textarea
          label="Reason for Retrieval (Optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for retrieval (e.g. Transferred by mistake)..."
          rows={3}
          className="rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:bg-white dark:border-white/10 dark:bg-white/5"
        />

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
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={isBtnDisabled}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RotateCcw className="h-4 w-4" />
            {isBtnDisabled ? "Retrieving..." : "Retrieve"}
          </Button>
        </div>
      </div>
    </FormDrawer>
  );
}
