"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Textarea } from "@/components/ui/Textarea";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type MovementModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  action: "COMPLETED" | "REJECTED" | "SEND_TO_OFFICE";
  assignmentId: string;
  onSuccess: () => void;
};

export function MovementModal({
  open,
  onClose,
  title,
  description,
  action,
  assignmentId,
  onSuccess,
}: MovementModalProps) {
  const [remarks, setRemarks] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [offices, setOffices] = useState<{ label: string; value: string }[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && action === "SEND_TO_OFFICE") {
      setLoadingOffices(true);
      fetch("/api/office-locations")
        .then((res) => res.json())
        .then((data) => {
          if (data.officeLocations) {
            const processOffices = data.officeLocations
              .filter((o: any) => o.isProcessOffice)
              .map((o: any) => ({ label: o.officeName, value: o.id }));
            setOffices(processOffices);
            if (processOffices.length > 0) {
              setSelectedOfficeId(processOffices[0].value);
            }
          }
        })
        .finally(() => setLoadingOffices(false));
    }
  }, [open, action]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (action === "SEND_TO_OFFICE" && !selectedOfficeId) {
      setError("Please select a target process office.");
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
          action,
          targetOfficeId: action === "SEND_TO_OFFICE" ? selectedOfficeId : undefined,
          remarks,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to complete action");
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

  return (
    <FormDrawer open={open} onClose={onClose} title={title} description={description} placement="center">
      <form onSubmit={handleSubmit} className="space-y-4">
        {action === "SEND_TO_OFFICE" && (
          <div>
            <label className="block text-sm font-semibold mb-1">
              Select Process Office
            </label>
            {loadingOffices ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : offices.length === 0 ? (
              <p className="text-sm text-amber-600">No process offices found.</p>
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
          <Button type="submit" disabled={loading || (action === "SEND_TO_OFFICE" && offices.length === 0)}>
            {loading ? "Processing..." : "Confirm Action"}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
}
