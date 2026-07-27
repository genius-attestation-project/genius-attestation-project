"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type SendToProcessModalProps = {
  open: boolean;
  onClose: () => void;
  registrationId: string;
  trackingNumber: string;
  onSuccess: () => void;
};

export function SendToProcessModal({
  open,
  onClose,
  registrationId,
  trackingNumber,
  onSuccess,
}: SendToProcessModalProps) {
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offices, setOffices] = useState<{ label: string; value: string }[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(true);

  useEffect(() => {
    if (open) {
      setLoadingOffices(true);
      fetch("/api/office-locations")
        .then((res) => res.json())
        .then((data) => {
          if (data.officeLocations) {
            const processOffices = data.officeLocations
              .map((o: any) => ({ label: o.officeName, value: o.id }));
            setOffices(processOffices);
            if (processOffices.length > 0) {
              setSelectedOfficeId(processOffices[0].value);
            }
          }
        })
        .finally(() => setLoadingOffices(false));
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOfficeId) {
      setError("Please select a process office.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/document-movement/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber,
          toOfficeId: selectedOfficeId,
          fromModule: "REGISTRATION",
          toModule: "PROCESS",
          remarks: "Sent to process module",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to send to process");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Send to Process Office"
      description={`Assign document ${trackingNumber} to a Process Office.`}
      placement="center"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">
            Process Office
          </label>
          {loadingOffices ? (
            <p className="text-sm text-gray-500">Loading process offices...</p>
          ) : offices.length === 0 ? (
            <p className="text-sm text-amber-600">No process offices available.</p>
          ) : (
            <SearchableSelect
              value={selectedOfficeId}
              options={offices}
              onChange={(val) => setSelectedOfficeId(val)}
              placeholder="Select process office"
              name="processOffice"
            />
          )}
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
          <Button type="submit" disabled={loading || offices.length === 0}>
            {loading ? "Sending..." : "Send to Process"}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
}
