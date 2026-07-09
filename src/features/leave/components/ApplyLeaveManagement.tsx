"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LEAVE_TYPES } from "@/features/leave/types/leave.types";
import { readJsonResponse } from "@/utils/fetch";

type ApplyLeaveFormState = {
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentUrl: string;
};

const initialState: ApplyLeaveFormState = {
  leaveType: LEAVE_TYPES[0],
  fromDate: "",
  toDate: "",
  reason: "",
  attachmentUrl: "",
};

export function ApplyLeaveManagement() {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await readJsonResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Unable to submit leave request.");

      setMessage("Leave request submitted successfully.");
      setForm(initialState);
    } catch (submitError) {
      console.error("Failed to submit leave request", submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardCard title="Apply Leave" description="Submit a leave request for approval.">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-bold">
          <span>Leave Type</span>
          <select className="h-12 rounded-2xl border border-(--border) bg-white/80 px-4 text-sm dark:bg-white/5" value={form.leaveType} onChange={(event) => setForm((current) => ({ ...current, leaveType: event.target.value }))}>
            {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <Input label="Attachment URL" name="attachmentUrl" placeholder="https://example.com/file.pdf" value={form.attachmentUrl} onChange={(event) => setForm((current) => ({ ...current, attachmentUrl: event.target.value }))} />
        <Input label="From Date" name="fromDate" type="date" value={form.fromDate} onChange={(event) => setForm((current) => ({ ...current, fromDate: event.target.value }))} required />
        <Input label="To Date" name="toDate" type="date" value={form.toDate} onChange={(event) => setForm((current) => ({ ...current, toDate: event.target.value }))} required />
        <div className="md:col-span-2">
          <Textarea label="Reason" name="reason" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Add the reason for this leave request" required />
        </div>
        {message ? <p className="md:col-span-2 text-sm font-semibold text-emerald-600">{message}</p> : null}
        {error ? <p className="md:col-span-2 text-sm font-semibold text-rose-600">{error}</p> : null}
        <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setForm(initialState)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Leave"}</Button>
        </div>
      </form>
    </DashboardCard>
  );
}
