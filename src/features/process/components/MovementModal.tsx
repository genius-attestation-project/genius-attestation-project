"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Textarea } from "@/components/ui/Textarea";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type MovementModalAction =
  | "COMPLETED"
  | "REJECTED"
  | "SEND_TO_OFFICE"
  | "RECEIVE"
  | "RETURN"
  | "TRANSFER_TO_BM_REPORT"
  | "TRANSFER_TO_ASSIGNED_OFFICE";

type MovementModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  action: MovementModalAction;
  assignmentId?: string;
  trackingNumbers?: string[];
  onSuccess: () => void;
};

export function MovementModal({
  open,
  onClose,
  title,
  description,
  action,
  assignmentId,
  trackingNumbers,
  onSuccess,
}: MovementModalProps) {
  const [remarks, setRemarks] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [offices, setOffices] = useState<{ label: string; value: string }[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsOfficeSelector =
    action === "SEND_TO_OFFICE" ||
    action === "TRANSFER_TO_BM_REPORT" ||
    action === "TRANSFER_TO_ASSIGNED_OFFICE";

  useEffect(() => {
    if (open && needsOfficeSelector) {
      setLoadingOffices(true);
      fetch("/api/offices/all")
        .then((res) => res.json())
        .then((data) => {
          const list = data.offices || data.data || [];
          const formatted = list.map((o: any) => ({
            label: `${o.officeName} (${o.type || "Office"})`,
            value: o.id,
          }));
          setOffices(formatted);
          if (formatted.length > 0) {
            setSelectedOfficeId(formatted[0].value);
          }
        })
        .catch((err) => {
          console.error("Failed to load office locations", err);
        })
        .finally(() => setLoadingOffices(false));
    }
  }, [open, action, needsOfficeSelector]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsOfficeSelector && !selectedOfficeId) {
      setError("Please select a target office.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/process/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          trackingNumbers: trackingNumbers && trackingNumbers.length > 0 ? trackingNumbers : undefined,
          action,
          targetOfficeId: needsOfficeSelector ? selectedOfficeId : undefined,
          remarks,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Failed to complete action");
      }

      onSuccess();
      onClose();
      setRemarks("");
      setSelectedOfficeId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const officeLabel =
    action === "TRANSFER_TO_BM_REPORT"
      ? "Select Destination Office (BM Report)"
      : action === "TRANSFER_TO_ASSIGNED_OFFICE"
      ? "Select Target Assigned Office"
      : "Select Process Office";

  const targetCount = trackingNumbers?.length || (assignmentId ? 1 : 0);

  return (
    <FormDrawer open={open} onClose={onClose} title={title} description={description} placement="center">
      <form onSubmit={handleSubmit} className="space-y-4">
        {targetCount > 0 && (
          <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-3 text-xs font-semibold text-blue-900">
            Executing action for {targetCount} selected document{targetCount > 1 ? "s" : ""}.
          </div>
        )}

        {needsOfficeSelector && (
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {officeLabel}
            </label>
            {loadingOffices ? (
              <p className="text-sm text-slate-500">Loading offices...</p>
            ) : offices.length === 0 ? (
              <p className="text-sm text-amber-600">No available offices found.</p>
            ) : (
              <SearchableSelect
                value={selectedOfficeId}
                options={offices}
                onChange={(val) => setSelectedOfficeId(val)}
                placeholder="Choose office..."
                name="targetOffice"
              />
            )}
          </div>
        )}

        <div>
          <Textarea
            id="remarks"
            label="Remarks"
            description="Optional notes regarding this action."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add relevant notes..."
            rows={4}
          />
        </div>

        {error && (
          <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || (needsOfficeSelector && offices.length === 0)}>
            {loading ? "Processing..." : "Confirm Action"}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
}
