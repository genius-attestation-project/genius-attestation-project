"use client";

import {
  Eye,
  FilePlus2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { RegistrationDetail } from "@/features/registration/components/RegistrationDetail";
import type { Registration, RegistrationFormState } from "@/features/registration/types/registration.types";
import {
  documentTypeOptions,
  externalProcessOptions,
  paymentModeOptions,
  paymentStatusOptions,
  priorityOptions,
  processTypeOptions,
} from "@/features/registration/validations/registration.schema";

type RegistrationManagerProps = {
  initialTrackingNumber?: string;
  initialOpen?: boolean;
};

const blankForm: RegistrationFormState = {
  trackingNumber: "",
  customerName: "",
  mobile: "",
  email: "",
  address: "",
  country: "",
  state: "",
  city: "",
  customerType: "",
  documentType: "",
  documentIssuedCountry: "",
  processType: "",
  externalProcess: "",
  priority: "",
  committedDuration: "",
  deliveryLocation: "",
  totalCharges: "0",
  advancePaid: "0",
  paymentMode: "",
  paymentStatus: "Pending",
  approvalStatus: "Pending",
  trackingStatus: "Registered",
};

const countryOptions = [
  "India",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Kuwait",
  "Bahrain",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Other",
];

function formFromRegistration(registration: Registration): RegistrationFormState {
  return {
    trackingNumber: registration.trackingNumber,
    customerName: registration.customerName,
    mobile: registration.mobile,
    email: registration.email ?? "",
    address: registration.address ?? "",
    country: registration.country ?? "",
    state: registration.state ?? "",
    city: registration.city ?? "",
    customerType: registration.customerType ?? "",
    documentType: registration.documentType ?? "",
    documentIssuedCountry: registration.documentIssuedCountry ?? "",
    processType: registration.processType ?? "",
    externalProcess: registration.externalProcess ?? "",
    priority: registration.priority ?? "",
    committedDuration: registration.committedDuration ?? "",
    deliveryLocation: registration.deliveryLocation ?? "",
    totalCharges: String(registration.totalCharges),
    advancePaid: String(registration.advancePaid),
    paymentMode: registration.paymentMode ?? "",
    paymentStatus: registration.paymentStatus,
    approvalStatus: registration.approvalStatus,
    trackingStatus: registration.trackingStatus,
  };
}

function SelectField({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: keyof RegistrationFormState;
  value: string;
  options: readonly string[];
  onChange: (name: keyof RegistrationFormState, value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="h-12 w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-[color:var(--text)] outline-none transition focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[24px] border border-[color:var(--border)] bg-white/60 p-4 dark:bg-white/5">
      <h3 className="text-base font-extrabold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed.");
  }

  return data;
}

export function RegistrationManager({
  initialTrackingNumber = "",
  initialOpen = false,
}: RegistrationManagerProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [drawerMode, setDrawerMode] = useState<"form" | "view" | null>(null);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [form, setForm] = useState<RegistrationFormState>({
    ...blankForm,
    trackingNumber: initialTrackingNumber,
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [supportingFile, setSupportingFile] = useState<File | null>(null);

  const balanceAmount = useMemo(() => {
    const total = Number(form.totalCharges || 0);
    const advance = Number(form.advancePaid || 0);
    return Number.isNaN(total - advance) ? 0 : total - advance;
  }, [form.advancePaid, form.totalCharges]);

  async function fetchRegistrations(search = query) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (search.trim()) params.set("query", search.trim());
      const data = await parseResponse(await fetch(`/api/registrations?${params.toString()}`));
      setRegistrations(data.items ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to fetch registrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRegistrations("");
    if (initialOpen) {
      setDrawerMode("form");
    }
  }, []);

  function updateField(name: keyof RegistrationFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openCreate() {
    setSelected(null);
    setForm({ ...blankForm, trackingNumber: initialTrackingNumber });
    setDocumentFile(null);
    setInvoiceFile(null);
    setSupportingFile(null);
    setError("");
    setSuccess("");
    setDrawerMode("form");
  }

  function openEdit(registration: Registration) {
    setSelected(registration);
    setForm(formFromRegistration(registration));
    setDocumentFile(null);
    setInvoiceFile(null);
    setSupportingFile(null);
    setError("");
    setSuccess("");
    setDrawerMode("form");
  }

  function openView(registration: Registration) {
    setSelected(registration);
    setDrawerMode("view");
  }

  async function uploadSelectedFiles(registrationId: string) {
    const files = [documentFile, invoiceFile, supportingFile].filter(Boolean) as File[];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      await parseResponse(await fetch(`/api/registrations/${registrationId}/files`, {
        method: "POST",
        body: formData,
      }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        totalCharges: Number(form.totalCharges || 0),
        advancePaid: Number(form.advancePaid || 0),
      };
      const response = await fetch(selected ? `/api/registrations/${selected.id}` : "/api/registrations", {
        method: selected ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseResponse(response);
      await uploadSelectedFiles(data.registration.id);
      setSuccess(selected ? "Registration updated." : "Registration created.");
      setDrawerMode(null);
      await fetchRegistrations();
      router.push("/dashboard/revenue-registration");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save registration.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(registration: Registration) {
    const confirmed = window.confirm(`Delete registration ${registration.trackingNumber}?`);
    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await parseResponse(await fetch(`/api/registrations/${registration.id}`, { method: "DELETE" }));
      setSuccess("Registration deleted.");
      await fetchRegistrations();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete registration.");
    }
  }

  async function changeApproval(status: "approve" | "reject") {
    if (!selected) return;
    setApproving(true);
    setError("");

    try {
      const data = await parseResponse(
        await fetch(`/api/registrations/${selected.id}/${status}`, { method: "POST" }),
      );
      setSelected(data.registration);
      setSuccess(status === "approve" ? "Registration approved." : "Registration rejected.");
      await fetchRegistrations();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update approval.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-[color:var(--border)] bg-white/75 p-6 shadow-[var(--shadow-card)] dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Revenue Registration
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Registration console</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-soft">
              Create, search, approve, and track registrations with manual tracking numbers.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={18} /> Add Registration
          </Button>
        </div>
      </section>

      <section className="grid gap-4 rounded-[28px] border border-[color:var(--border)] bg-white/75 p-5 shadow-[var(--shadow-card)] dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex h-12 min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 text-sm dark:bg-white/5">
            <Search size={17} className="text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") fetchRegistrations(query);
              }}
              className="h-full flex-1 bg-transparent text-[color:var(--text)] outline-none"
              placeholder="Search tracking, customer, mobile, document, status"
            />
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => fetchRegistrations(query)}>
              <Search size={16} /> Search
            </Button>
            <Button variant="ghost" onClick={() => fetchRegistrations("")}>
              <RefreshCw size={16} /> Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
            {success}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-[color:var(--border)] p-8 text-center text-sm text-soft">
            Loading registrations...
          </div>
        ) : registrations.length ? (
          <div className="overflow-hidden rounded-[28px] border border-[color:var(--border)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-blue-500/10">
                  <tr>
                    <th className="px-5 py-4">Tracking Number</th>
                    <th className="px-5 py-4">Customer Name</th>
                    <th className="px-5 py-4">Mobile</th>
                    <th className="px-5 py-4">Document Type</th>
                    <th className="px-5 py-4">Payment Status</th>
                    <th className="px-5 py-4">Approval Status</th>
                    <th className="px-5 py-4">Created Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)] bg-white/70 dark:bg-white/5">
                  {registrations.map((registration) => (
                    <tr key={registration.id} className="transition hover:bg-blue-50 dark:hover:bg-blue-500/5">
                      <td className="px-5 py-4 font-bold text-blue-700 dark:text-blue-200">
                        {registration.trackingNumber}
                      </td>
                      <td className="px-5 py-4">{registration.customerName}</td>
                      <td className="px-5 py-4">{registration.mobile}</td>
                      <td className="px-5 py-4">{registration.documentType || "-"}</td>
                      <td className="px-5 py-4">{registration.paymentStatus}</td>
                      <td className="px-5 py-4">{registration.approvalStatus}</td>
                      <td className="px-5 py-4">{registration.createdDate}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openView(registration)}>
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(registration)}>
                            <Pencil size={16} />
                          </Button>
                          <Button variant="danger" size="icon" onClick={() => handleDelete(registration)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FilePlus2}
            title="No registrations found"
            description="Create a registration with a manual tracking number to start tracking documents and payments."
            action={
              <Button onClick={openCreate}>
                <Plus size={18} /> Add Registration
              </Button>
            }
          />
        )}
      </section>

      <FormDrawer
        open={drawerMode === "form"}
        title={selected ? "Edit registration" : "New registration"}
        description="Complete the customer, document, and commercial sections."
        onClose={() => setDrawerMode(null)}
      >
        <form onSubmit={handleSubmit} className="grid gap-5">
          <Section title="Section 1: Customer Info">
            <Input
              label="Tracking Number"
              value={form.trackingNumber}
              onChange={(event) => updateField("trackingNumber", event.target.value)}
              required
            />
            <Input
              label="Customer Name"
              value={form.customerName}
              onChange={(event) => updateField("customerName", event.target.value)}
              required
            />
            <Input
              label="Mobile Number"
              value={form.mobile}
              onChange={(event) => updateField("mobile", event.target.value)}
              required
            />
            <Input label="Email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            <Input
              label="Address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
            />
            <Input label="State" value={form.state} onChange={(event) => updateField("state", event.target.value)} />
            <Input label="City" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
            <Input
              label="Customer Type"
              value={form.customerType}
              onChange={(event) => updateField("customerType", event.target.value)}
            />
          </Section>

          <Section title="Section 2: Document Upload">
            <SelectField label="Document Type" name="documentType" value={form.documentType} options={documentTypeOptions} onChange={updateField} />
            <SelectField
              label="Document Issued Country"
              name="documentIssuedCountry"
              value={form.documentIssuedCountry}
              options={countryOptions}
              onChange={updateField}
            />
            <SelectField label="Process Type" name="processType" value={form.processType} options={processTypeOptions} onChange={updateField} />
            <SelectField label="External / Address Process" name="externalProcess" value={form.externalProcess} options={externalProcessOptions} onChange={updateField} />
            <SelectField label="Special Processing Priority" name="priority" value={form.priority} options={priorityOptions} onChange={updateField} />
            <Input
              label="Committed Duration / SLA"
              value={form.committedDuration}
              onChange={(event) => updateField("committedDuration", event.target.value)}
            />
            <Input
              label="Delivery Location"
              value={form.deliveryLocation}
              onChange={(event) => updateField("deliveryLocation", event.target.value)}
            />
            <Input
              label="Document Upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
            />
          </Section>

          <Section title="Section 3: Commercial / Payment Details">
            <Input
              label="Total Charges"
              type="number"
              min="0"
              step="0.01"
              value={form.totalCharges}
              onChange={(event) => updateField("totalCharges", event.target.value)}
              required
            />
            <Input
              label="Advance Paid"
              type="number"
              min="0"
              step="0.01"
              value={form.advancePaid}
              onChange={(event) => updateField("advancePaid", event.target.value)}
              required
            />
            <Input label="Balance Amount" value={balanceAmount.toFixed(2)} readOnly />
            <SelectField label="Payment Mode" name="paymentMode" value={form.paymentMode} options={paymentModeOptions} onChange={updateField} />
            <SelectField label="Payment Status" name="paymentStatus" value={form.paymentStatus} options={paymentStatusOptions} onChange={updateField} />
            <Input
              label="Invoice Upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
            />
            <Input
              label="Supporting Documents Upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(event) => setSupportingFile(event.target.files?.[0] ?? null)}
            />
          </Section>

          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDrawerMode(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save size={16} /> {saving ? "Saving..." : "Save Registration"}
            </Button>
          </div>
        </form>
      </FormDrawer>

      <FormDrawer
        open={drawerMode === "view" && Boolean(selected)}
        title="Registration view"
        description="Customer, document, payment, approval, files, and audit history."
        onClose={() => setDrawerMode(null)}
      >
        {selected ? (
          <RegistrationDetail
            registration={selected}
            approving={approving}
            onApprove={() => changeApproval("approve")}
            onReject={() => changeApproval("reject")}
          />
        ) : null}
      </FormDrawer>
    </div>
  );
}
