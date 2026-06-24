"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";

type SendToProcessModalProps = {
  open: boolean;
  onClose: () => void;
  registrationId: string;
  trackingNumber: string;
  onSuccess: () => void;
};

const processTypes = [
  "UAE Embassy",
  "Qatar Embassy",
  "Apostille",
  "HRD Attestation",
  "MEA",
  "WES",
  "Others",
];

export function SendToProcessModal({
  open,
  onClose,
  registrationId,
  trackingNumber,
  onSuccess,
}: SendToProcessModalProps) {
  const [selectedProcess, setSelectedProcess] = useState(processTypes[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/process/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          trackingNumber,
          processType: selectedProcess,
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
      title="Send to Process Module"
      description={`Assign document ${trackingNumber} to a specific process.`}
      placement="center"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="processType" className="block text-sm font-semibold mb-1">
            Process Type
          </label>
          <select
            id="processType"
            value={selectedProcess}
            onChange={(e) => setSelectedProcess(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {processTypes.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
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
          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send to Process"}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
}
