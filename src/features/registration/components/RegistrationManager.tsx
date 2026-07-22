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
  Download,
  ChevronDown,
  FileSpreadsheet,
  Filter,
  X,
  Route,
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
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { FileUpload } from "@/components/common/FileUpload";
import { RegistrationDetail } from "@/features/registration/components/RegistrationDetail";
import { LiveTimelineModal } from "@/features/registration/components/LiveTimelineModal";
import { ImportRegistrationWizard } from "@/features/registration/components/ImportRegistrationWizard";
import type { Registration, RegistrationFormState } from "@/features/registration/types/registration.types";
import {
  paymentStatusOptions,
  registrationInputSchema,
} from "@/features/registration/validations/registration.schema";

type RegistrationManagerProps = {
  currentOfficeLocationName?: string;
  initialTrackingNumber?: string;
  initialOpen?: boolean;
  initialLeadId?: string;
  hasExportPermission?: boolean;
  hasTimelinePermission?: boolean;
  hasImportPermission?: boolean;
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
  commissionToUserId: "",
  commissionToName: "",
  commissionToEmail: "",
  registeredPerson: "",
  regionOfRegistration: "",
  approvalStatus: "Pending",
  trackingStatus: "Registered",
  leadId: "",
};

// countryOptions will be loaded dynamically

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
    commissionToUserId: registration.commissionToUserId ?? "",
    commissionToName: registration.commissionToName ?? "",
    commissionToEmail: registration.commissionToEmail ?? "",
    registeredPerson: registration.registeredPerson ?? "",
    regionOfRegistration: registration.regionOfRegistration ?? "",
    approvalStatus: registration.approvalStatus,
    trackingStatus: registration.trackingStatus,
    leadId: registration.leadId ?? "",
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
        onChange={(nextValue: string) => onChange(name, nextValue)}
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
  isProcessOffice?: boolean;
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
  currentOfficeLocationName = "",
  initialTrackingNumber = "",
  initialOpen = false,
  initialLeadId = "",
  hasExportPermission = false,
  hasTimelinePermission = false,
  hasImportPermission = false,
}: RegistrationManagerProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  const [documentFileId, setDocumentFileId] = useState<string | null>(null);
  const [invoiceFileId, setInvoiceFileId] = useState<string | null>(null);
  const [supportingFileId, setSupportingFileId] = useState<string | null>(null);
  const [personOptions, setPersonOptions] = useState<string[]>([]);
  const [commissionUserOptions, setCommissionUserOptions] = useState<SelectOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [officeLocationOptions, setOfficeLocationOptions] = useState<string[]>([]);
  const [officeLocationsLoading, setOfficeLocationsLoading] = useState(true);
  const [officeLocationsError, setOfficeLocationsError] = useState("");
  const [timelineTrackingNumber, setTimelineTrackingNumber] = useState<string | null>(null);
  
  const [documentTypeOptions, setDocumentTypeOptions] = useState<string[]>([]);
  const [processTypeOptions, setProcessTypeOptions] = useState<string[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<string[]>(["Normal", "Express", "Super Fast"]); // Fallback
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([]);
  const [customerTypeOptions, setCustomerTypeOptions] = useState<string[]>(["Individual", "Corporate"]); // Fallback
  const [countryOptions, setCountryOptions] = useState<string[]>([]);

  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    trackingNumber: "",
    customerName: "",
    mobile: "",
    createdBy: "",
    collectedPerson: "",
    registeredPerson: "",
    officeLocation: "",
    processOffice: "",
    service: "",
    documentType: "",
    documentIssuedCountry: "",
    customerType: "",
    processType: "",
    priority: "",
    deliveryLocation: "",
    paymentStatus: "",
    paymentMode: "",
    approvalStatus: "",
    hasBalance: "",
    minTotalCharge: "",
    maxTotalCharge: "",
    minAdvancePaid: "",
    maxAdvancePaid: "",
  });

  const balanceAmount = useMemo(() => {
    const total = Number(form.totalCharges || 0);
    const advance = Number(form.advancePaid || 0);
    return Number.isNaN(total - advance) ? 0 : total - advance;
  }, [form.advancePaid, form.totalCharges]);
  const hasPaymentEntry = form.totalCharges.trim() !== "" || form.advancePaid.trim() !== "";

  const needsDocumentFile = !hasUploadedFile(selected, "DOCUMENT");
  const needsInvoiceFile = !hasUploadedFile(selected, "INVOICE");
  const needsSupportingFile = !hasUploadedFile(selected, "SUPPORTING_DOCUMENT");
  const deliveryLocationOptions = useMemo(() => {
    if (form.deliveryLocation && !officeLocationOptions.includes(form.deliveryLocation)) {
      return [form.deliveryLocation, ...officeLocationOptions];
    }

    return officeLocationOptions;
  }, [form.deliveryLocation, officeLocationOptions]);
  const commissionToOptions = useMemo(() => {
    if (form.commissionToUserId && !commissionUserOptions.some((option) => option.value === form.commissionToUserId)) {
      return [
        {
          label: form.commissionToName || form.commissionToUserId,
          value: form.commissionToUserId,
          description: form.commissionToEmail,
        },
        ...commissionUserOptions,
      ];
    }

    return commissionUserOptions;
  }, [commissionUserOptions, form.commissionToEmail, form.commissionToName, form.commissionToUserId]);

  async function fetchRegistrations(search = query, currentFilters = filters, currentPage = page, currentPageSize = pageSize) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ 
        page: String(currentPage),
        pageSize: String(currentPageSize) 
      });
      if (search.trim()) params.set("query", search.trim());
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && String(value).trim()) {
          params.set(key, String(value).trim());
        }
      });
      
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
    
    if (initialLeadId) {
      setDrawerMode("form");
      fetch(`/api/leads/${initialLeadId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.lead) {
            const lead = data.lead;
            setForm((prev) => ({
              ...prev,
              leadId: lead.id,
              customerName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
              mobile: `${lead.countryCode}${lead.mobileNumber}`,
              email: lead.email || "",
              country: lead.country || "",
              state: lead.state || "",
              documentType: lead.docType || "",
              documentIssuedCountry: lead.documentIssuedCountry || "",
              processType: lead.service || "",
            }));
          }
        })
        .catch(console.error);
    } else if (initialOpen) {
      setDrawerMode("form");
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setForm((current) => ({
        ...current,
        regionOfRegistration: current.regionOfRegistration || currentOfficeLocationName,
      }));
    }
  }, [currentOfficeLocationName, selected]);

  useEffect(() => {
    async function fetchDropdownOptions() {
      setUsersLoading(true);
      setUsersError("");
      setOfficeLocationsLoading(true);
      setOfficeLocationsError("");

      async function fetchMaster(slug: string, setter: (val: string[]) => void) {
        try {
          const res = await fetch(`/api/master-data/${slug}?active=true`);
          if (res.ok) {
            const data = await res.json();
            setter(data.items.map((i: any) => i.name));
          }
        } catch (e) {
          console.error(`Failed to fetch ${slug}`, e);
        }
      }

      fetchMaster("document-types", setDocumentTypeOptions);
      fetchMaster("process-types", setProcessTypeOptions);
      fetchMaster("payment-modes", setPaymentModeOptions);
      fetchMaster("customer-types", setCustomerTypeOptions);
      fetchMaster("countries", setCountryOptions);

      const [usersResponse, officeLocationsResponse] = await Promise.allSettled([
        fetch("/api/users?active=true", { cache: "no-store" }),
        fetch("/api/office-locations", { cache: "no-store" }),
      ]);

      if (usersResponse.status === "fulfilled" && usersResponse.value.ok) {
        const payload = await usersResponse.value.json().catch(() => ({}));
        const users = (payload.users ?? []) as UserOption[];
        const names = users
          .map((user) => user.name || user.email || "")
          .filter(Boolean);
        setPersonOptions(Array.from(new Set(names)));
        setCommissionUserOptions(
          users.map((user) => ({
            label: user.name || user.email || "Workspace User",
            value: user.id,
            description: user.email || undefined,
          })),
        );
      } else {
        const message =
          usersResponse.status === "fulfilled"
            ? ((await usersResponse.value.json().catch(() => ({}))) as { message?: string }).message
            : undefined;
        setPersonOptions([]);
        setCommissionUserOptions([]);
        setUsersError(message ?? "Unable to load users.");
      }

      if (officeLocationsResponse.status === "fulfilled" && officeLocationsResponse.value.ok) {
        const payload = await officeLocationsResponse.value.json().catch(() => ({}));
        const officeLocations = (payload.officeLocations ?? []) as OfficeLocationOption[];
        const names = officeLocations
          .filter((officeLocation) => !officeLocation.isProcessOffice)
          .map((officeLocation) => officeLocation.officeName)
          .filter(Boolean);
        setOfficeLocationOptions(Array.from(new Set(names)));
      } else {
        const message =
          officeLocationsResponse.status === "fulfilled"
            ? ((await officeLocationsResponse.value.json().catch(() => ({}))) as { message?: string }).message
            : undefined;
        setOfficeLocationOptions([]);
        setOfficeLocationsError(message ?? "Unable to load office locations.");
      }

      setOfficeLocationsLoading(false);
      setUsersLoading(false);
    }

    void fetchDropdownOptions();
  }, []);

  function updateField(name: keyof RegistrationFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateCommissionTo(userId: string) {
    const selectedUser = commissionToOptions.find((option) => option.value === userId);

    setForm((current) => ({
      ...current,
      commissionToUserId: userId,
      commissionToName: selectedUser?.label ?? "",
      commissionToEmail: selectedUser?.description ?? "",
    }));
  }

  function openCreate() {
    setSelected(null);
    setForm({
      ...blankForm,
      trackingNumber: initialTrackingNumber,
      regionOfRegistration: currentOfficeLocationName,
    });
    setDocumentFileId(null);
    setInvoiceFileId(null);
    setSupportingFileId(null);
    setError("");
    setSuccess("");
    setDrawerMode("form");
  }

  function openEdit(registration: Registration) {
    setSelected(registration);
    setForm(formFromRegistration(registration));
    setDocumentFileId(null);
    setInvoiceFileId(null);
    setSupportingFileId(null);
    setError("");
    setSuccess("");
    setDrawerMode("form");
  }

  function openView(registration: Registration) {
    setSelected(registration);
    setDrawerMode("view");
  }

  async function handleRemoveExistingFile(fileId: string) {
    if (!selected) return;
    try {
      await fetch(`/api/registrations/files/${fileId}`, { method: "DELETE" });
      setSelected((prev) => (prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : null));
      await fetchRegistrations();
    } catch (e) {
      console.error(e);
      setError("Failed to remove file.");
    }
  }

  async function uploadSelectedFiles(registrationId: string) {
    const files = [
      { fileStorageId: documentFileId, category: "DOCUMENT" },
      { fileStorageId: invoiceFileId, category: "INVOICE" },
      { fileStorageId: supportingFileId, category: "SUPPORTING_DOCUMENT" },
    ].filter((item): item is { fileStorageId: string; category: string } => Boolean(item.fileStorageId));

    for (const { fileStorageId, category } of files) {
      await parseResponse(await fetch(`/api/registrations/${registrationId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileStorageId, fileCategory: category }),
      }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!currentOfficeLocationName) {
        setError("Assign an office location to this user before saving a registration.");
        return;
      }

      const payload = { ...form };
      const parsed = registrationInputSchema.safeParse(payload);

      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please complete all required fields.");
        return;
      }

      if (
        (needsDocumentFile && !documentFileId) ||
        (needsInvoiceFile && !invoiceFileId) ||
        (needsSupportingFile && !supportingFileId)
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

  async function handleExport() {
    if (registrations.length === 0) {
      setError("No records available to export.");
      return;
    }
    
    setIsExporting(true);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());

      Object.entries(filters).forEach(([key, value]) => {
        if (value && String(value).trim()) {
          params.set(key, String(value).trim());
        }
      });

      const response = await fetch(`/api/revenue-registration/export/excel?${params.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Export failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `Revenue_Registrations_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(`Exported to EXCEL successfully.`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An error occurred while exporting.");
    } finally {
      setIsExporting(false);
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
            {currentOfficeLocationName ? (
              <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Region auto-routes from your office: {currentOfficeLocationName}
              </p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                No office location is assigned to this user yet, so new registrations cannot be saved.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasImportPermission && (
              <Button variant="secondary" onClick={() => setIsImportWizardOpen(true)}>
                <FileSpreadsheet size={18} className="mr-2" /> Import
              </Button>
            )}
            <Button onClick={openCreate} disabled={!currentOfficeLocationName}>
              <Plus size={18} /> Add Registration
            </Button>
          </div>
        </div>
      </section>

      {!currentOfficeLocationName ? (
        <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700">
          Assign an office location to this user before creating revenue registrations. Region of registration is sourced from that office automatically.
        </p>
      ) : null}

      <section className="grid min-w-0 gap-4 rounded-2xl border border-(--border) bg-white/75 p-4 shadow-(--shadow-card) sm:rounded-[28px] sm:p-5 dark:bg-white/5">
        
        <ImportRegistrationWizard 
          open={isImportWizardOpen}
          onOpenChange={setIsImportWizardOpen}
          onSuccess={() => fetchRegistrations()}
        />

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
            <Button
              variant={showFilters ? "primary" : "secondary"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} /> Filters
            </Button>
            {hasExportPermission && (
              <Button 
                variant="secondary" 
                disabled={isExporting}
                onClick={handleExport}
              >
                {isExporting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={16} className="text-green-600" />
                )}
                Export as Excel
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-(--border) bg-slate-50 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 dark:bg-slate-900/50">
            <Input
              label="From Date"
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters(f => ({ ...f, fromDate: e.target.value }))}
            />
            <Input
              label="To Date"
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters(f => ({ ...f, toDate: e.target.value }))}
            />
            <Input
              label="Tracking Number"
              placeholder="TRK-..."
              value={filters.trackingNumber}
              onChange={(e) => setFilters(f => ({ ...f, trackingNumber: e.target.value }))}
            />
            <Input
              label="Customer Name"
              placeholder="Name"
              value={filters.customerName}
              onChange={(e) => setFilters(f => ({ ...f, customerName: e.target.value }))}
            />
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Created By</span>
              <SearchableSelect
                value={filters.createdBy}
                onChange={(val) => setFilters(f => ({ ...f, createdBy: val }))}
                options={commissionUserOptions}
                placeholder="Select user"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Collected By</span>
              <SearchableSelect
                value={filters.collectedPerson}
                onChange={(val) => setFilters(f => ({ ...f, collectedPerson: val }))}
                options={toSelectOptions(personOptions)}
                placeholder="Select person"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Registered Person</span>
              <SearchableSelect
                value={filters.registeredPerson}
                onChange={(val) => setFilters(f => ({ ...f, registeredPerson: val }))}
                options={toSelectOptions(personOptions)}
                placeholder="Select person"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Office Location</span>
              <SearchableSelect
                value={filters.officeLocation}
                onChange={(val) => setFilters(f => ({ ...f, officeLocation: val }))}
                options={toSelectOptions(officeLocationOptions)}
                placeholder="Select office"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Process Office</span>
              <SearchableSelect
                value={filters.processOffice}
                onChange={(val) => setFilters(f => ({ ...f, processOffice: val }))}
                options={toSelectOptions(officeLocationOptions)}
                placeholder="Select office"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Process Type / Service</span>
              <SearchableSelect
                value={filters.processType}
                onChange={(val) => setFilters(f => ({ ...f, processType: val }))}
                options={toSelectOptions(processTypeOptions)}
                placeholder="Select process"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Document Type</span>
              <SearchableSelect
                value={filters.documentType}
                onChange={(val) => setFilters(f => ({ ...f, documentType: val }))}
                options={toSelectOptions(documentTypeOptions)}
                placeholder="Select document"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Doc Issued Country</span>
              <SearchableSelect
                value={filters.documentIssuedCountry}
                onChange={(val) => setFilters(f => ({ ...f, documentIssuedCountry: val }))}
                options={toSelectOptions(countryOptions)}
                placeholder="Select country"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Customer Type</span>
              <SearchableSelect
                value={filters.customerType}
                onChange={(val) => setFilters(f => ({ ...f, customerType: val }))}
                options={toSelectOptions(customerTypeOptions)}
                placeholder="Select type"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority</span>
              <SearchableSelect
                value={filters.priority}
                onChange={(val) => setFilters(f => ({ ...f, priority: val }))}
                options={toSelectOptions(priorityOptions)}
                placeholder="Select priority"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Status</span>
              <SearchableSelect
                value={filters.paymentStatus}
                onChange={(val) => setFilters(f => ({ ...f, paymentStatus: val }))}
                options={toSelectOptions(paymentStatusOptions)}
                placeholder="Select status"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Mode</span>
              <SearchableSelect
                value={filters.paymentMode}
                onChange={(val) => setFilters(f => ({ ...f, paymentMode: val }))}
                options={toSelectOptions(paymentModeOptions)}
                placeholder="Select mode"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Approval Status</span>
              <SearchableSelect
                value={filters.approvalStatus}
                onChange={(val) => setFilters(f => ({ ...f, approvalStatus: val }))}
                options={toSelectOptions(["Approved", "Pending", "Rejected"])}
                placeholder="Select status"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Balance Amount</span>
              <SearchableSelect
                value={filters.hasBalance}
                onChange={(val) => setFilters(f => ({ ...f, hasBalance: val }))}
                options={[{ label: "Has Balance", value: "true" }, { label: "Fully Paid", value: "false" }]}
                placeholder="Select balance"
              />
            </label>
            
            <div className="col-span-full flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  const blankFilters = {
                    fromDate: "", toDate: "", trackingNumber: "", customerName: "", mobile: "",
                    createdBy: "", collectedPerson: "", registeredPerson: "", officeLocation: "", processOffice: "",
                    service: "", documentType: "", documentIssuedCountry: "", customerType: "", processType: "",
                    priority: "", deliveryLocation: "", paymentStatus: "", paymentMode: "", approvalStatus: "",
                    hasBalance: "", minTotalCharge: "", maxTotalCharge: "", minAdvancePaid: "", maxAdvancePaid: ""
                  };
                  setFilters(blankFilters);
                  fetchRegistrations(query, blankFilters);
                }}
              >
                Clear Filters
              </Button>
              <Button onClick={() => fetchRegistrations(query)}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}

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
              <table className="w-full min-w-230 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-blue-500/10">
                  <tr>
                    <th className="px-5 py-4">SL No.</th>
                    <th className="px-5 py-4">Tracking Number</th>
                    <th className="px-5 py-4">Customer Name</th>
                    <th className="px-5 py-4">Mobile</th>
                    <th className="px-5 py-4">Created By</th>
                    <th className="px-5 py-4">Document Type</th>
                    <th className="px-5 py-4">Payment Status</th>
                    <th className="px-5 py-4">Approval Status</th>
                    <th className="px-5 py-4">Created Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white/70 dark:bg-white/5">
                  {registrations.map((registration, index) => (
                    <tr key={registration.id} className="transition hover:bg-blue-50 dark:hover:bg-blue-500/5">
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {((page - 1) * pageSize) + index + 1}
                      </td>
                      <td className="px-5 py-4 font-bold text-blue-700 dark:text-blue-200">
                        {registration.trackingNumber}
                      </td>
                      <td className="px-5 py-4">{registration.customerName}</td>
                      <td className="px-5 py-4">{registration.mobile}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 dark:text-slate-300">
                        {registration.createdBy?.name || "Unknown"}
                      </td>
                      <td className="px-5 py-4">{registration.documentType || "-"}</td>
                      <td className="px-5 py-4">{registration.paymentStatus}</td>
                      <td className="px-5 py-4">{registration.approvalStatus}</td>
                      <td className="px-5 py-4">{registration.createdDate}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          {hasTimelinePermission && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="View Branch Movement"
                              onClick={() => setTimelineTrackingNumber(registration.trackingNumber)}
                            >
                              <Route size={16} className="text-blue-600" />
                            </Button>
                          )}
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
            
            <div className="flex items-center justify-end border-t border-(--border) bg-white/50 p-4 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-soft">Rows per page:</span>
                <select
                  className="h-9 rounded-md border border-(--border) bg-transparent px-3 text-sm outline-none dark:bg-white/5"
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setPage(1);
                    fetchRegistrations(query, filters, 1, newSize);
                  }}
                >
                  {[10, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FilePlus2}
            title="No registrations found"
            description="Create a registration with a manual tracking number to start tracking documents and payments."
            action={
              <Button onClick={openCreate} disabled={!currentOfficeLocationName}>
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
            <Input
              label="Address Process"
              value={form.externalProcess}
              onChange={(event) => updateField("externalProcess", event.target.value)}
              required
            />
            <SelectField label="Special Processing Priority" name="priority" value={form.priority} options={priorityOptions} onChange={updateField} required />
            <Input
              label="Committed Duration / SLA"
              value={form.committedDuration}
              onChange={(event) => updateField("committedDuration", event.target.value)}
              required
            />
            <label className="grid gap-2">
              <span className="text-sm font-bold">Delivery Location</span>
              <SearchableSelect
                value={form.deliveryLocation}
                options={toSelectOptions(deliveryLocationOptions)}
                onChange={(nextValue: string) => updateField("deliveryLocation", nextValue)}
                placeholder={officeLocationsLoading ? "Loading office locations..." : "Select delivery location"}
                name="deliveryLocation"
                loading={officeLocationsLoading}
                loadingMessage="Loading office locations..."
                emptyMessage="No office locations found"
                errorMessage={officeLocationsError}
              />
            </label>
            <FileUpload
              label="Customer Document Upload"
              moduleName="Revenue Registration"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
              onUploadComplete={(id) => setDocumentFileId(id)}
              onRemove={() => {
                const existing = selected?.files.find((f) => f.fileCategory === "DOCUMENT");
                if (existing) handleRemoveExistingFile(existing.id);
                setDocumentFileId(null);
              }}
              existingFile={selected?.files.find((f) => f.fileCategory === "DOCUMENT")}
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
            <label className="grid gap-2">
              <span className="text-sm font-bold">Commission To</span>
              <SearchableSelect
                value={form.commissionToUserId}
                options={commissionToOptions}
                onChange={updateCommissionTo}
                placeholder={usersLoading ? "Loading users..." : "Select user"}
                name="commissionToUserId"
                loading={usersLoading}
                loadingMessage="Loading users..."
                emptyMessage="No users found"
                errorMessage={usersError}
              />
            </label>
            <SelectField label="Registered Person" name="registeredPerson" value={form.registeredPerson} options={personOptions} onChange={updateField} />
            <Input
              label="Region of Registration"
              value={form.regionOfRegistration}
              readOnly
              description="Auto-filled from the logged-in user's office location"
            />
            <FileUpload
              label="Bill Upload"
              moduleName="Revenue Registration"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
              onUploadComplete={(id) => setInvoiceFileId(id)}
              onRemove={() => {
                const existing = selected?.files.find((f) => f.fileCategory === "INVOICE");
                if (existing) handleRemoveExistingFile(existing.id);
                setInvoiceFileId(null);
              }}
              existingFile={selected?.files.find((f) => f.fileCategory === "INVOICE")}
              required={needsInvoiceFile}
            />
            <FileUpload
              label="Supporting Documents Upload"
              moduleName="Revenue Registration"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
              onUploadComplete={(id) => setSupportingFileId(id)}
              onRemove={() => {
                const existing = selected?.files.find((f) => f.fileCategory === "SUPPORTING_DOCUMENT");
                if (existing) handleRemoveExistingFile(existing.id);
                setSupportingFileId(null);
              }}
              existingFile={selected?.files.find((f) => f.fileCategory === "SUPPORTING_DOCUMENT")}
              required={needsSupportingFile}
            />
          </Section>

          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDrawerMode(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !currentOfficeLocationName}>
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
            actionButton={
              hasTimelinePermission && (
                <Button variant="secondary" size="sm" onClick={() => setTimelineTrackingNumber(selected.trackingNumber)}>
                  <Route size={16} /> Timeline
                </Button>
              )
            }
          />
        ) : null}
      </FormDrawer>

      {timelineTrackingNumber && (
        <LiveTimelineModal
          isOpen={!!timelineTrackingNumber}
          onClose={() => setTimelineTrackingNumber(null)}
          trackingNumber={timelineTrackingNumber}
        />
      )}
    </div>
  );
}
