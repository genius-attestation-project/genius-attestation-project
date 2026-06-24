"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Textarea } from "@/components/ui/Textarea";
import { ProcessLocation } from "../types/process.types";

type MovementModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  targetLocation: ProcessLocation;
  assignmentId: string;
  onSuccess: () => void;
};

export function MovementModal({
  open,
  onClose,
  title,
  description,
  targetLocation,
  assignmentId,
  onSuccess,
}: MovementModalProps) {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/process/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          targetLocation,
          remarks,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to move process");
      }

      onSuccess();
      onClose();
      setRemarks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={title} description={description} placement="center">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Textarea
            id="remarks"
            label="Remarks"
            description="Optional"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add any relevant notes..."
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
          <Button type="submit" disabled={loading}>
            {loading ? "Moving..." : "Confirm Movement"}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
}
