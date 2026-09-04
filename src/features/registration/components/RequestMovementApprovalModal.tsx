"use client";

import { useState, useEffect } from "react";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Send, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { Registration } from "@/features/registration/types/registration.types";

type RequestMovementApprovalModalProps = {
  open: boolean;
  onClose: () => void;
  registration: Registration | null;
  onSuccess: () => void;
};

export function RequestMovementApprovalModal({
  open,
  onClose,
  registration,
  onSuccess,
}: RequestMovementApprovalModalProps) {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && registration) {
      setRemarks(registration.movementApprovalRemarks || "");
      setError(null);
    } else {
      setRemarks("");
      setError(null);
    }
  }, [open, registration]);

  if (!registration) return null;

  const isPending = registration.movementApprovalStatus === "Pending";
  const isRejected = registration.movementApprovalStatus === "Rejected";

  const handleSubmit = async () => {
    const trimmedRemarks = remarks.trim();
    if (!trimmedRemarks) {
      setError("Remarks are mandatory when requesting movement approval.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/movement-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: registration.id,
          remarks: trimmedRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit movement approval request.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to request movement approval:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title="Request Movement Approval"
      description="Submit a movement approval request for documents registered with zero advance payment."
      placement="center"
    >
      <div className="grid gap-4 text-xs sm:text-sm">
        {/* Document Summary Card */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Tracking Number:</span>
              <p className="font-mono font-bold text-blue-700 dark:text-blue-300">{registration.trackingNumber}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Customer Name:</span>
              <p className="font-bold text-slate-900 dark:text-white">{registration.customerName || "-"}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Process Type:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{registration.processType || "-"}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Document Type:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{registration.documentType || "-"}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Registration Office:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{registration.regionOfRegistration || "-"}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Advance Amount:</span>
              <p className="font-bold text-rose-600 dark:text-rose-400">
                ₹{Number(registration.advancePaid || 0).toFixed(2)} (Zero Advance)
              </p>
            </div>
          </div>

          {/* Current Approval Status Banner */}
          <div className="mt-3 flex items-center gap-2 border-t border-blue-200/60 pt-2.5 dark:border-blue-900/40">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Approval Status:</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                isPending
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : isRejected
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {registration.movementApprovalStatus || "Not Requested"}
            </span>
          </div>
        </div>

        {/* Informational Alert */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            This document will remain hidden from <strong>Home → Document In Hand</strong> until an authorized approver reviews and approves this movement request.
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mandatory Remarks Textarea */}
        <div>
          <Textarea
            label="Remarks / Reason for Zero-Advance Movement *"
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g., Customer requested urgent processing without advance payment. Approved by branch manager."
            rows={4}
            required
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Please specify why this document should be processed and moved without an advance payment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !remarks.trim()}
            className="flex items-center gap-2 font-bold"
          >
            <Send size={14} />
            {loading ? "Updating..." : "Update Request"}
          </Button>
        </div>
      </div>
    </FormDrawer>
  );
}
