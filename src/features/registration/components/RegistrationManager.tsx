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
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { RegistrationDetail } from "@/features/registration/components/RegistrationDetail";
import type { Registration, RegistrationFormState } from "@/features/registration/types/registration.types";
import {
  documentTypeOptions,
  externalProcessOptions,
  paymentModeOptions,
  paymentStatusOptions,
  priorityOptions,
  processTypeOptions,
  registrationInputSchema,
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
  totalCharges: "",
  advancePaid: "",
  paymentMode: "",
  paymentStatus: "Pending",
  collectedPerson: "",
  registeredPerson: "",
  regionOfRegistration: "",
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
    collectedPerson: registration.collectedPerson ?? "",
    registeredPerson: registration.registeredPerson ?? "",
    regionOfRegistration: registration.regionOfRegistration ?? "",
    approvalStatus: registration.approvalStatus,
    trackingStatus: registration.trackingStatus,
  };
}

function toSelectOptions(options: readonly string[]) {
  return options.map((option) => ({ label: option, value: option }));
}

function SelectField({
  label,
  name,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  name: keyof RegistrationFormState;
  value: string;
  options: readonly string[];
  onChange: (name: keyof RegistrationFormState, value: string) => void;
  required?: boolean;
}) {
  const normalizedOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <SearchableSelect
        value={value}
        options={toSelectOptions(normalizedOptions)}
        onChange={(nextValue) => onChange(name, nextValue)}
        placeholder={required ? "Select" : "Select"}
        name={name}
      />
    </label>
  );
}

type UserOption = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type OfficeLocationOption = {
  id: string;
  officeName: string;
  location?: string;
};

function normalizePhoneValue(value: string) {
  const hasPrefix = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");
  return digits ? `${hasPrefix ? "+" : ""}${digits}` : "";
}

function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-bold">Mobile Number</span>
      <PhoneInput
        defaultCountry="in"
        value={value}
        onChange={(phone) => onChange(normalizePhoneValue(phone))}
        forceDialCode
        preferredCountries={["in", "ae", "sa", "qa", "om", "kw", "bh", "us", "gb"]}
        className="registration-phone-input flex h-14 w-full items-center rounded-xl border border-gray-200 bg-white px-3 text-slate-700 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
        inputClassName="registration-phone-input__field flex-1 border-0 bg-transparent px-3 outline-none focus:ring-0"
        countrySelectorStyleProps={{
          className: "registration-phone-input__country",
          buttonClassName: "registration-phone-input__country-button flex items-center gap-2 border-r border-gray-200 pr-3",
          buttonContentWrapperClassName: "registration-phone-input__country-content flex items-center gap-2",
          dropdownStyleProps: {
            className: "registration-phone-input__dropdown",
            listItemClassName: "registration-phone-input__dropdown-item",
            listItemSelectedClassName: "registration-phone-input__dropdown-item--selected",
            listItemFocusedClassName: "registration-phone-input__dropdown-item--focused",
          },
        }}
        inputProps={{
          required: true,
          inputMode: "tel",
          "aria-label": "Mobile Number",
        }}
      />
      <style jsx global>{`
        .registration-phone-input.react-international-phone-input-container {
          display: flex;
          height: 3.5rem;
          width: 100%;
          align-items: center;
          border-radius: 0.75rem;
          border: 1px solid rgb(229 231 235);
          background: #fff;
          padding: 0 0.75rem;
          color: rgb(51 65 85);
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .registration-phone-input.react-international-phone-input-container:focus-within {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px rgb(219 234 254);
        }

        .registration-phone-input__country {
          height: 100%;
        }

        .registration-phone-input__country-button.react-international-phone-country-selector-button {
          display: flex;
          height: 100%;
          align-items: center;
          gap: 0.5rem;
          border: 0;
          border-right: 1px solid rgb(229 231 235);
          background: transparent;
          padding: 0 0.75rem 0 0;
        }

        .registration-phone-input__country-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .registration-phone-input__field.react-international-phone-input {
          height: 100%;
          min-width: 0;
          flex: 1;
          border: 0;
          background: transparent;
          padding: 0 0.75rem;
          color: rgb(51 65 85);
          outline: none;
          box-shadow: none;
        }

        .registration-phone-input__field.react-international-phone-input:focus {
          outline: none;
          box-shadow: none;
        }

        .registration-phone-input__dropdown {
          z-index: 80;
          margin-top: 0.5rem;
          max-height: 16rem;
          min-width: 18rem;
          overflow-y: auto;
          border-radius: 0.75rem;
          border: 1px solid rgb(229 231 235);
          background: #fff;
          box-shadow: 0 18px 45px rgb(15 23 42 / 0.16);
        }

        .registration-phone-input__dropdown-item {
          padding: 0.625rem 0.75rem;
          color: rgb(51 65 85);
        }

        .registration-phone-input__dropdown-item--selected,
        .registration-phone-input__dropdown-item--focused {
          background: rgb(239 246 255);
          color: rgb(37 99 235);
        }
      `}</style>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-4 rounded-2xl border border-(--border) bg-white/60 p-4 sm:rounded-3xl dark:bg-white/5">
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

function hasUploadedFile(registration: Registration | null, category: string) {
  return Boolean(registration?.files.some((file) => file.fileCategory === category));
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
  const [personOptions, setPersonOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);

  const balanceAmount = useMemo(() => {
    const total = Number(form.totalCharges || 0);
    const advance = Number(form.advancePaid || 0);
    return Number.isNaN(total - advance) ? 0 : total - advance;
  }, [form.advancePaid, form.totalCharges]);
  const hasPaymentEntry = form.totalCharges.trim() !== "" || form.advancePaid.trim() !== "";

  const needsDocumentFile = !hasUploadedFile(selected, "DOCUMENT");
  const needsInvoiceFile = !hasUploadedFile(selected, "INVOICE");
  const needsSupportingFile = !hasUploadedFile(selected, "SUPPORTING_DOCUMENT");

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

  useEffect(() => {
    async function fetchDropdownOptions() {
      const [usersResponse, officeLocationsResponse] = await Promise.allSettled([
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/office-locations", { cache: "no-store" }),
      ]);

      if (usersResponse.status === "fulfilled" && usersResponse.value.ok) {
        const payload = await usersResponse.value.json().catch(() => ({}));
        const names = ((payload.users ?? []) as UserOption[])
          .map((user) => user.name || user.email || "")
          .filter(Boolean);
        setPersonOptions(Array.from(new Set(names)));
      }

      if (officeLocationsResponse.status === "fulfilled" && officeLocationsResponse.value.ok) {
        const payload = await officeLocationsResponse.value.json().catch(() => ({}));
        const regions = ((payload.officeLocations ?? []) as OfficeLocationOption[])
          .map((officeLocation) => officeLocation.location || officeLocation.officeName)
          .filter(Boolean);
        setRegionOptions(Array.from(new Set(regions)));
      }
    }

    void fetchDropdownOptions();
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
    const files = [
      { file: documentFile, category: "DOCUMENT" },
      { file: invoiceFile, category: "INVOICE" },
      { file: supportingFile, category: "SUPPORTING_DOCUMENT" },
    ].filter((item): item is { file: File; category: string } => Boolean(item.file));

    for (const { file, category } of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileCategory", category);
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
      const payload = { ...form };
      const parsed = registrationInputSchema.safeParse(payload);

      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please complete all required fields.");
        return;
      }

      if (
        (needsDocumentFile && !documentFile) ||
        (needsInvoiceFile && !invoiceFile) ||
        (needsSupportingFile && !supportingFile)
      ) {
        setError("Document, invoice, and supporting document uploads are required.");
        return;
      }

      const response = await fetch(selected ? `/api/registrations/${selected.id}` : "/api/registrations", {
        method: selected ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
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
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="rounded-2xl border border-(--border) bg-white/75 p-4 shadow-(--shadow-card) sm:rounded-[28px] sm:p-6 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Revenue Registration
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Registration console</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-soft">
              Create, search, approve, and track registrations with manual tracking numbers.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={18} /> Add Registration
          </Button>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 rounded-2xl border border-(--border) bg-white/75 p-4 shadow-(--shadow-card) sm:rounded-[28px] sm:p-5 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-(--border) bg-white/70 px-4 text-sm sm:min-w-[16rem] dark:bg-white/5">
            <Search size={17} className="text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") fetchRegistrations(query);
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-(--text) outline-none"
              placeholder="Search tracking, customer, mobile, document, status"
            />
          </label>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
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
          <div className="rounded-2xl border border-(--border) p-6 text-center text-sm text-soft sm:rounded-[28px] sm:p-8">
            Loading registrations...
          </div>
        ) : registrations.length ? (
          <div className="min-w-0 overflow-hidden rounded-2xl border border-(--border) sm:rounded-[28px]">
            <div className="overflow-x-auto">
              <table className="min-w-[920px] text-left text-sm">
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
                <tbody className="divide-y divide-(--border) bg-white/70 dark:bg-white/5">
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
            <PhoneField value={form.mobile} onChange={(value) => updateField("mobile", value)} />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              required
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              required
            />
            <Input label="State" value={form.state} onChange={(event) => updateField("state", event.target.value)} required />
            <Input label="City" value={form.city} onChange={(event) => updateField("city", event.target.value)} required />
            <Input
              label="Customer Type"
              value={form.customerType}
              onChange={(event) => updateField("customerType", event.target.value)}
              required
            />
          </Section>

          <Section title="Section 2: Document Upload">
            <SelectField label="Document Type" name="documentType" value={form.documentType} options={documentTypeOptions} onChange={updateField} required />
            <SelectField
              label="Document Issued Country"
              name="documentIssuedCountry"
              value={form.documentIssuedCountry}
              options={countryOptions}
              onChange={updateField}
              required
            />
            <SelectField label="Process Type" name="processType" value={form.processType} options={processTypeOptions} onChange={updateField} required />
            <SelectField label="Address Process" name="externalProcess" value={form.externalProcess} options={externalProcessOptions} onChange={updateField} required />
            <SelectField label="Special Processing Priority" name="priority" value={form.priority} options={priorityOptions} onChange={updateField} required />
            <Input
              label="Committed Duration / SLA"
              value={form.committedDuration}
              onChange={(event) => updateField("committedDuration", event.target.value)}
              required
            />
            <Input
              label="Delivery Location"
              value={form.deliveryLocation}
              onChange={(event) => updateField("deliveryLocation", event.target.value)}
              required
            />
            <Input
              label="Customer Document Upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
              required={needsDocumentFile}
            />
          </Section>

          <Section title="Section 3: Commercial / Payment Details">
            <Input
              label="Total Charges"
              type="number"
              min="0"
              step="0.01"
              value={form.totalCharges}
              placeholder="Enter amount"
              onChange={(event) => updateField("totalCharges", event.target.value)}
            />
            <Input
              label="Advance Paid"
              type="number"
              min="0"
              step="0.01"
              value={form.advancePaid}
              placeholder="Enter amount"
              onChange={(event) => updateField("advancePaid", event.target.value)}
            />
            <Input label="Balance Amount" value={hasPaymentEntry ? balanceAmount.toFixed(2) : ""} readOnly />
            <SelectField label="Payment Mode" name="paymentMode" value={form.paymentMode} options={paymentModeOptions} onChange={updateField} required />
            <SelectField label="Payment Status" name="paymentStatus" value={form.paymentStatus} options={paymentStatusOptions} onChange={updateField} required />
            <SelectField label="Collected Person" name="collectedPerson" value={form.collectedPerson} options={personOptions} onChange={updateField} />
            <SelectField label="Registered Person" name="registeredPerson" value={form.registeredPerson} options={personOptions} onChange={updateField} />
            <SelectField label="Region of Registration" name="regionOfRegistration" value={form.regionOfRegistration} options={regionOptions} onChange={updateField} />
            <Input
              label="Bill Upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
              required={needsInvoiceFile}
            />
            <Input
              label="Supporting Documents Upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(event) => setSupportingFile(event.target.files?.[0] ?? null)}
              required={needsSupportingFile}
            />
          </Section>

          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3">
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
