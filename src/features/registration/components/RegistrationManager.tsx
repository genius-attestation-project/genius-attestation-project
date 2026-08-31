"use client";

import Link from "next/link";
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
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  X,
  Route,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { Country } from "country-state-city";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { FileUpload, MultiFileUpload } from "@/components/common/FileUpload";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { calculatePaymentStatus } from "@/features/registration/server/payment-status.service";
import { RegistrationDetail } from "@/features/registration/components/RegistrationDetail";
import { LiveTimelineModal } from "@/features/registration/components/LiveTimelineModal";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { ImportRegistrationWizard } from "@/features/registration/components/ImportRegistrationWizard";
import { CorporateDetailFormModal } from "@/features/corporate-details/components/CorporateDetailFormModal";
import { AddAdvanceModal } from "@/features/revenue/components/AddAdvanceModal";
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
  hasDeletePermission?: boolean;
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
  documentName: "",
  documentIssuedCountry: "",
  processType: "",
  externalProcess: "",
  priority: "",
  committedDuration: "",
  deliveryLocation: "",
  totalCharges: "",
  advancePaid: "0",
  requestedAdvanceAmount: "0",
  paymentMode: "",
  upiTransactionId: "",
  bankName: "",
  transactionRefNo: "",
  transferDate: "",
  chequeNumber: "",
  chequeDate: "",
  ddNumber: "",
  ddDate: "",
  cardLast4: "",
  approvalCode: "",
  paymentGateway: "",
  onlineTransactionId: "",
  walletName: "",
  walletTransactionId: "",
  paymentReferenceNo: "",
  paymentDescription: "",
  paymentStatus: "Pending",
  collectedPerson: "",
  commissionToUserId: "",
  commissionToName: "",
  commissionToEmail: "",
  registeredPerson: "",
  regionOfRegistration: "",
  approvalStatus: "Pending",
  trackingStatus: "Registered",
  subPackage: "",
  leadId: "",
};

// countryOptions will be loaded dynamically

function formFromRegistration(registration: Registration): RegistrationFormState {
  return {
    trackingNumber: registration.trackingNumber,
    customerName: registration.customerName ?? "",
    mobile: registration.mobile ?? "",
    email: registration.email ?? "",
    address: registration.address ?? "",
    country: registration.country ?? "",
    state: registration.state ?? "",
    city: registration.city ?? "",
    customerType: registration.customerType ?? "",
    documentType: registration.documentType ?? "",
    documentName: registration.documentName ?? "",
    documentIssuedCountry: registration.documentIssuedCountry ?? "",
    processType: registration.processType ?? "",
    externalProcess: registration.externalProcess ?? "",
    priority: registration.priority ?? "",
    committedDuration: registration.committedDuration ?? "",
    deliveryLocation: registration.deliveryLocation ?? "",
    totalCharges: String(registration.totalCharges),
    advancePaid: String(registration.advancePaid ?? 0),
    requestedAdvanceAmount: String((registration as any).requestedAdvanceAmount ?? 0),
    paymentMode: registration.paymentMode ?? "",
    upiTransactionId: registration.upiTransactionId ?? "",
    bankName: registration.bankName ?? "",
    transactionRefNo: registration.transactionRefNo ?? "",
    transferDate: registration.transferDate ? String(registration.transferDate).split("T")[0] : "",
    chequeNumber: registration.chequeNumber ?? "",
    chequeDate: registration.chequeDate ? String(registration.chequeDate).split("T")[0] : "",
    ddNumber: registration.ddNumber ?? "",
    ddDate: registration.ddDate ? String(registration.ddDate).split("T")[0] : "",
    cardLast4: registration.cardLast4 ?? "",
    approvalCode: registration.approvalCode ?? "",
    paymentGateway: registration.paymentGateway ?? "",
    onlineTransactionId: registration.onlineTransactionId ?? "",
    walletName: registration.walletName ?? "",
    walletTransactionId: registration.walletTransactionId ?? "",
    paymentReferenceNo: registration.paymentReferenceNo ?? "",
    paymentDescription: registration.paymentDescription ?? "",
    paymentStatus: registration.paymentStatus,
    collectedPerson: registration.collectedPerson ?? "",
    commissionToUserId: registration.commissionToUserId ?? "",
    commissionToName: registration.commissionToName ?? "",
    commissionToEmail: registration.commissionToEmail ?? "",
    registeredPerson: registration.registeredPerson ?? "",
    regionOfRegistration: registration.regionOfRegistration ?? "",
    approvalStatus: registration.approvalStatus,
    trackingStatus: registration.trackingStatus,
    subPackage: (registration as any).subPackage ?? "",
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
};

function normalizePhoneValue(value: string) {
  const hasPrefix = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");
  return digits ? `${hasPrefix ? "+" : ""}${digits}` : "";
}

function getCountryCodeFromOffice(officeName: string, officeLocationsList: OfficeLocationOption[]): string {
  if (!officeName) return "in";

  const matchedOffice = officeLocationsList.find(
    (o) => o.officeName?.toLowerCase().trim() === officeName.toLowerCase().trim()
  );
  const targetCountry = (matchedOffice?.location || officeName).toLowerCase().trim();

  if (targetCountry.includes("india") || targetCountry.includes("kochi") || targetCountry.includes("delhi") || targetCountry.includes("mumbai")) return "in";
  if (targetCountry.includes("uae") || targetCountry.includes("emirates") || targetCountry.includes("dubai") || targetCountry.includes("abu dhabi")) return "ae";
  if (targetCountry.includes("qatar") || targetCountry.includes("doha")) return "qa";
  if (targetCountry.includes("saudi") || targetCountry.includes("riyadh") || targetCountry.includes("jeddah")) return "sa";
  if (targetCountry.includes("oman") || targetCountry.includes("muscat")) return "om";
  if (targetCountry.includes("bahrain") || targetCountry.includes("manama")) return "bh";
  if (targetCountry.includes("kuwait")) return "kw";
  if (targetCountry.includes("malaysia") || targetCountry.includes("kuala lumpur")) return "my";
  if (targetCountry.includes("singapore")) return "sg";
  if (targetCountry.includes("uk") || targetCountry.includes("united kingdom") || targetCountry.includes("london")) return "gb";
  if (targetCountry.includes("us") || targetCountry.includes("united states") || targetCountry.includes("america")) return "us";

  const found = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === targetCountry || targetCountry.includes(c.name.toLowerCase())
  );
  if (found) {
    return found.isoCode.toLowerCase();
  }

  return "in";
}

function PhoneField({
  value,
  onChange,
  defaultCountry = "in",
}: {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-bold">Mobile Number</span>
      <PhoneInput
        defaultCountry={defaultCountry}
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
  hasDeletePermission = false,
}: RegistrationManagerProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const currentUserName = currentUser?.name || currentUser?.email || "";
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const fetchReqIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [drawerMode, setDrawerMode] = useState<"form" | "view" | null>(null);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const isAllPageSelected = useMemo(() => {
    if (registrations.length === 0) return false;
    return registrations.every((r) => selectedIds.includes(r.id));
  }, [registrations, selectedIds]);

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const pageIds = registrations.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIdSet = new Set(registrations.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || resData.error || "Failed to delete selected registrations.");
      }

      const deletedCount = resData.deletedCount ?? resData.data?.deletedCount ?? 0;
      const skippedCount = resData.skippedCount ?? resData.data?.skippedCount ?? 0;
      const failedCount = resData.failedCount ?? resData.data?.failedCount ?? 0;
      const skippedDetails = resData.skippedDetails ?? resData.data?.skippedDetails ?? [];

      if (deletedCount === 0 && (skippedCount > 0 || failedCount > 0)) {
        const reasons = skippedDetails
          .map((s: any) => `${s.trackingNumber || s.id}: ${s.reason}`)
          .join("; ");
        setError(`Failed to delete selected registration(s). ${reasons ? `Reason: ${reasons}` : ""}`);
      } else if (skippedCount > 0 || failedCount > 0) {
        const reasons = skippedDetails
          .map((s: any) => `${s.trackingNumber || s.id}: ${s.reason}`)
          .join("; ");
        setSuccess(`${deletedCount} registration(s) deleted. (${skippedCount + failedCount} skipped: ${reasons})`);
      } else {
        setSuccess(`${deletedCount} Revenue Registration document(s) deleted successfully.`);
      }

      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      await fetchRegistrations(query, filters, page, pageSize);
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting registrations.");
    } finally {
      setIsBulkDeleting(false);
    }
  };
  const [form, setForm] = useState<RegistrationFormState>({
    ...blankForm,
    trackingNumber: initialTrackingNumber,
  });
  const [documentFileIds, setDocumentFileIds] = useState<string[]>([]);
  const [invoiceFileIds, setInvoiceFileIds] = useState<string[]>([]);
  const [supportingFileIds, setSupportingFileIds] = useState<string[]>([]);
  const [advancePaymentFileIds, setAdvancePaymentFileIds] = useState<string[]>([]);
  const [personOptions, setPersonOptions] = useState<string[]>([]);
  const [commissionUserOptions, setCommissionUserOptions] = useState<SelectOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [officeLocationOptions, setOfficeLocationOptions] = useState<string[]>([]);
  const [rawOfficeLocations, setRawOfficeLocations] = useState<OfficeLocationOption[]>([]);
  const [officeLocationsLoading, setOfficeLocationsLoading] = useState(true);
  const [officeLocationsError, setOfficeLocationsError] = useState("");
  const [timelineTrackingNumber, setTimelineTrackingNumber] = useState<string | null>(null);
  
  const [documentTypeOptions, setDocumentTypeOptions] = useState<SelectOption[]>([]);
  const [processTypeOptions, setProcessTypeOptions] = useState<SelectOption[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<string[]>(["Normal", "Express", "Super Fast"]); // Fallback

  const prioritySelectOptions: SelectOption[] = useMemo(
    () => [
      { label: "Normal", value: "Normal", customRender: <PriorityBadge priority="Normal" /> },
      { label: "Express", value: "Express", customRender: <PriorityBadge priority="Express" /> },
      { label: "Super Fast", value: "Super Fast", customRender: <PriorityBadge priority="Super Fast" /> },
    ],
    []
  );
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([]);
  const [customerTypeOptions, setCustomerTypeOptions] = useState<string[]>(["Individual", "Corporate"]); // Fallback
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [corporateOptions, setCorporateOptions] = useState<SelectOption[]>([]);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isAddAdvanceOpen, setIsAddAdvanceOpen] = useState(false);

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
    subPackage: "",
    priority: "",
    deliveryLocation: "",
    paymentStatus: "",
    paymentMode: "",
    approvalStatus: "",
    status: "",
    hasBalance: "",
    minTotalCharge: "",
    maxTotalCharge: "",
    minAdvancePaid: "",
    maxAdvancePaid: "",
  });

  const approvedAdvance = useMemo(() => {
    return selected ? Number(selected.advancePaid || 0) : 0;
  }, [selected]);

  const pendingRequestedAdvance = useMemo(() => {
    if (selected?.advancePaymentStatus === "Pending Approval" && Number((selected as any).requestedAdvanceAmount || 0) > 0) {
      return Number((selected as any).requestedAdvanceAmount);
    }
    return Number(form.requestedAdvanceAmount || 0);
  }, [selected, form.requestedAdvanceAmount]);

  const balanceAmount = useMemo(() => {
    const total = Number(form.totalCharges || 0);
    return Number.isNaN(total - approvedAdvance) ? 0 : Math.max(0, total - approvedAdvance);
  }, [approvedAdvance, form.totalCharges]);
  const hasPaymentEntry = form.totalCharges.trim() !== "";

  const isAdvancePaidEnabled = useMemo(() => {
    const rawVal = form.totalCharges ? String(form.totalCharges).trim() : "";
    const num = Number(rawVal);
    return Boolean(rawVal) && !Number.isNaN(num) && num > 0;
  }, [form.totalCharges]);

  const computedPaymentStatus = useMemo(() => {
    const total = Number(form.totalCharges || 0);
    const balance = Number.isNaN(total - approvedAdvance) ? 0 : Math.max(0, total - approvedAdvance);
    return calculatePaymentStatus({
      approvalStatus: form.approvalStatus || selected?.approvalStatus || "Pending",
      advancePaymentStatus: selected?.advancePaymentStatus || "None",
      totalCharges: total,
      advancePaid: approvedAdvance,
      balanceAmount: balance,
    });
  }, [approvedAdvance, form.totalCharges, form.approvalStatus, selected]);

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

  const defaultPhoneCountry = useMemo(() => {
    return getCountryCodeFromOffice(currentOfficeLocationName, rawOfficeLocations);
  }, [currentOfficeLocationName, rawOfficeLocations]);

  const personSelectOptions = useMemo(() => {
    const list = [...personOptions];
    if (currentUserName && !list.includes(currentUserName)) {
      return [currentUserName, ...list];
    }
    return list;
  }, [personOptions, currentUserName]);

  const documentTypeSelectOptions = useMemo(() => {
    if (form.documentType && !documentTypeOptions.some((opt) => opt.value === form.documentType)) {
      return [
        { label: form.documentType, value: form.documentType },
        ...documentTypeOptions,
      ];
    }
    return documentTypeOptions;
  }, [documentTypeOptions, form.documentType]);

  const processTypeSelectOptions = useMemo(() => {
    if (form.processType && !processTypeOptions.some((opt) => opt.value === form.processType)) {
      return [
        { label: form.processType, value: form.processType },
        ...processTypeOptions,
      ];
    }
    return processTypeOptions;
  }, [processTypeOptions, form.processType]);

  const allMasterCountries = useMemo(() => {
    const list = Country.getAllCountries().map((c) => c.name);
    const combined = Array.from(new Set([...list, ...countryOptions]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [countryOptions]);

  const countrySelectOptions = useMemo(() => {
    let opts = allMasterCountries.map((c) => ({ label: c, value: c }));
    if (form.country && !opts.some((opt) => opt.value === form.country)) {
      opts = [{ label: form.country, value: form.country }, ...opts];
    }
    if (form.documentIssuedCountry && !opts.some((opt) => opt.value === form.documentIssuedCountry)) {
      opts = [{ label: form.documentIssuedCountry, value: form.documentIssuedCountry }, ...opts];
    }
    return opts;
  }, [allMasterCountries, form.country, form.documentIssuedCountry]);

  async function fetchRegistrations(search = query, currentFilters = filters, currentPage = page, currentPageSize = pageSize) {
    const requestId = ++fetchReqIdRef.current;
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
      
      if (requestId !== fetchReqIdRef.current) return;

      setRegistrations(data.items ?? []);
      if (data.pagination) {
        setPage(data.pagination.page ?? currentPage);
        setPageSize(data.pagination.pageSize ?? currentPageSize);
        setTotalItems(data.pagination.totalItems ?? 0);
        setTotalPages(data.pagination.totalPages ?? 1);
      }
    } catch (requestError) {
      if (requestId === fetchReqIdRef.current) {
        setError(requestError instanceof Error ? requestError.message : "Unable to fetch registrations.");
      }
    } finally {
      if (requestId === fetchReqIdRef.current) {
        setLoading(false);
      }
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
              documentName: lead.documentName || "",
              documentIssuedCountry: lead.documentIssuedCountry || "",
              processType: lead.service || "",
              customerType: lead.clientType || "",
              corporateDetailId: lead.corporateDetailId || "",
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
        registeredPerson: current.registeredPerson || currentUserName,
      }));
    }
  }, [currentOfficeLocationName, currentUserName, selected]);

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

      async function fetchDocumentTypes() {
        try {
          const res = await fetch(`/api/master-data/document-types?active=true`);
          if (res.ok) {
            const data = await res.json();
            const opts: SelectOption[] = (data.items || []).map((i: any) => ({
              label: i.name,
              value: i.name,
            }));
            setDocumentTypeOptions(opts);
          }
        } catch (e) {
          console.error("Failed to fetch document-types", e);
        }
      }

      async function fetchProcessTypes() {
        try {
          const res = await fetch(`/api/master-data/process-types?active=true`);
          if (res.ok) {
            const data = await res.json();
            const opts: SelectOption[] = (data.items || []).map((i: any) => ({
              label: i.name,
              value: i.name,
            }));
            setProcessTypeOptions(opts);
          }
        } catch (e) {
          console.error("Failed to fetch process-types", e);
        }
      }

      async function fetchPaymentModes() {
        try {
          const res = await fetch(`/api/master-data/payment-mode?status=Active&pageSize=200`);
          if (res.ok) {
            const data = await res.json();
            // Map paymentModeName (primary field) with name as fallback for robustness
            const names = (data.items || []).map((i: any) => i.paymentModeName || i.name).filter(Boolean);
            setPaymentModeOptions(names.length > 0 ? names : ["Cash", "Bank Transfer", "Credit Card", "Cheque", "Online"]);
            return;
          }
        } catch (e) {
          // Default fallback
        }
        setPaymentModeOptions(["Cash", "Bank Transfer", "Credit Card", "Cheque", "Online"]);
      }

      async function fetchCorporateDetails() {
        try {
          const res = await fetch(`/api/master-data/corporate-details?active=true`);
          if (res.ok) {
            const data = await res.json();
            const opts: SelectOption[] = (data.items || []).map((i: any) => ({
              label: i.companyName,
              value: i.id,
            }));
            setCorporateOptions(opts);
          }
        } catch (e) {
          console.error("Failed to fetch corporate-details", e);
        }
      }

      fetchDocumentTypes();
      fetchProcessTypes();
      fetchPaymentModes();
      fetchCorporateDetails();
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
        setRawOfficeLocations(officeLocations);
        const names = officeLocations
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
      registeredPerson: currentUserName,
    });
    setDocumentFileIds([]);
    setInvoiceFileIds([]);
    setSupportingFileIds([]);
    setAdvancePaymentFileIds([]);
    setError("");
    setSuccess("");
    setDrawerMode("form");
  }

  function openEdit(registration: Registration) {
    setSelected(registration);
    setForm(formFromRegistration(registration));
    setDocumentFileIds([]);
    setInvoiceFileIds([]);
    setSupportingFileIds([]);
    setAdvancePaymentFileIds([]);
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
    const files: { fileStorageId: string; category: string }[] = [];

    documentFileIds.forEach((fileStorageId) => files.push({ fileStorageId, category: "DOCUMENT" }));
    invoiceFileIds.forEach((fileStorageId) => files.push({ fileStorageId, category: "INVOICE" }));
    supportingFileIds.forEach((fileStorageId) => files.push({ fileStorageId, category: "SUPPORTING_DOCUMENT" }));
    advancePaymentFileIds.forEach((fileStorageId) => files.push({ fileStorageId, category: "ADVANCE_PAYMENT" }));

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
        const firstIssue = parsed.error.issues[0];
        const fieldPath = firstIssue?.path.join(".");
        console.error("[RegistrationManager] Form validation error:", {
          issues: parsed.error.issues,
          payload,
        });
        const errorMsg = fieldPath
          ? `${fieldPath}: ${firstIssue.message}`
          : firstIssue?.message ?? "Please complete all required fields.";
        setError(errorMsg);
        return;
      }

      const hasDocumentFile = documentFileIds.length > 0 || Boolean(selected?.files.some((f) => f.fileCategory === "DOCUMENT"));
      const hasInvoiceFile = invoiceFileIds.length > 0 || Boolean(selected?.files.some((f) => f.fileCategory === "INVOICE" || f.fileCategory === "BILL"));
      const hasSupportingFile = supportingFileIds.length > 0 || Boolean(selected?.files.some((f) => f.fileCategory === "SUPPORTING_DOCUMENT"));

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
                if (event.key === "Enter") fetchRegistrations(query, filters, 1, pageSize);
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-(--text) outline-none"
              placeholder="Search tracking, customer, mobile, document, status"
            />
          </label>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button variant="secondary" onClick={() => fetchRegistrations(query, filters, 1, pageSize)}>
              <Search size={16} /> Search
            </Button>
            <Button variant="ghost" onClick={() => { setQuery(""); fetchRegistrations("", filters, 1, pageSize); }}>
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
                groupByCategory={false}
                showDescription={false}
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
                options={processTypeSelectOptions}
                placeholder="Select process"
              />
            </label>
            <Input
              label="Sub Package"
              placeholder="Sub Package"
              value={filters.subPackage}
              onChange={(e) => setFilters(f => ({ ...f, subPackage: e.target.value }))}
            />
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Document Type</span>
              <SearchableSelect
                value={filters.documentType}
                onChange={(val) => setFilters(f => ({ ...f, documentType: val }))}
                options={documentTypeSelectOptions}
                placeholder="Select document"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Doc Issued Country</span>
              <SearchableSelect
                value={filters.documentIssuedCountry}
                onChange={(val) => setFilters(f => ({ ...f, documentIssuedCountry: val }))}
                options={toSelectOptions(allMasterCountries)}
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
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Workflow Status</span>
              <SearchableSelect
                value={filters.status}
                onChange={(val) => setFilters(f => ({ ...f, status: val }))}
                options={toSelectOptions(["Registered", "In Transfer", "Document In Hand", "Ready for Delivery", "Delivered"])}
                placeholder="Select workflow status"
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
                    subPackage: "",
                    priority: "", deliveryLocation: "", paymentStatus: "", paymentMode: "", approvalStatus: "", status: "",
                    hasBalance: "", minTotalCharge: "", maxTotalCharge: "", minAdvancePaid: "", maxAdvancePaid: ""
                  };
                  setFilters(blankFilters);
                  fetchRegistrations(query, blankFilters, 1, pageSize);
                }}
              >
                Clear Filters
              </Button>
              <Button onClick={() => fetchRegistrations(query, filters, 1, pageSize)}>
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
          <div className="grid gap-3">
            {/* Bulk Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 sm:px-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAllOnPage(!isAllPageSelected)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400 cursor-pointer"
                >
                  {isAllPageSelected ? (
                    <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                  ) : selectedIds.length > 0 ? (
                    <CheckSquare size={16} className="text-blue-600/70 dark:text-blue-400/70" />
                  ) : (
                    <Square size={16} className="text-slate-400" />
                  )}
                  {isAllPageSelected ? "Deselect Page" : "Select All (Page)"}
                </button>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Selected: <strong className="text-blue-600 dark:text-blue-400">{selectedIds.length}</strong> {selectedIds.length === 1 ? "document" : "documents"}
                </span>
                {selectedIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Deselect All
                  </Button>
                )}
              </div>
              {selectedIds.length > 0 && hasDeletePermission && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedIds.length})
                </Button>
              )}
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-(--border) sm:rounded-[28px]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-300 text-left text-xs">
                  <thead className="bg-blue-50/90 text-xs font-bold tracking-wider text-slate-700 border-b border-slate-200/80 dark:bg-blue-500/10 dark:border-white/10 dark:text-slate-300">
                    <tr>
                      <th className="px-3.5 py-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectAllOnPage(!isAllPageSelected)}
                          className="inline-flex items-center justify-center p-0.5 rounded text-slate-600 hover:text-blue-600 dark:text-slate-300 cursor-pointer"
                          title={isAllPageSelected ? "Deselect all on this page" : "Select all on this page"}
                        >
                          {isAllPageSelected ? (
                            <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                          ) : selectedIds.some((id) => registrations.some((r) => r.id === id)) ? (
                            <CheckSquare size={16} className="text-blue-600/60 dark:text-blue-400/60" />
                          ) : (
                            <Square size={16} className="text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-3.5 py-3 text-center w-12">SL No.</th>
                      <th className="px-3.5 py-3">Tracking Number</th>
                      <th className="px-3.5 py-3">Customer Name</th>
                      <th className="px-3.5 py-3">Mobile</th>
                      <th className="px-3.5 py-3">Registered By</th>
                      <th className="px-3.5 py-3 min-w-40">Process Type</th>
                      <th className="px-3.5 py-3 min-w-32.5">Document Type</th>
                      <th className="px-3.5 py-3 text-center">Status</th>
                      <th className="px-3.5 py-3 text-center">Payment Status</th>
                      <th className="px-3.5 py-3 text-center">Approval Status</th>
                      <th className="px-3.5 py-3 text-center">Created Date</th>
                      <th className="px-3.5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border) bg-white/70 dark:bg-white/5">
                    {registrations.map((registration, index) => (
                      <tr key={registration.id} className="transition hover:bg-blue-50/70 dark:hover:bg-blue-500/5">
                        <td className="px-3.5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRow(registration.id)}
                            className="inline-flex items-center justify-center p-0.5 rounded text-slate-600 hover:text-blue-600 dark:text-slate-300 cursor-pointer"
                          >
                            {selectedIds.includes(registration.id) ? (
                              <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square size={16} className="text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-3.5 py-3 text-center text-slate-500 font-medium">
                          {((page - 1) * pageSize) + index + 1}
                        </td>
                        <td className="px-3.5 py-3 font-bold text-blue-700 dark:text-blue-200 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <PriorityDot priority={registration.priority} size={10} />
                            <Link
                              href={`/dashboard/document-details/${encodeURIComponent(registration.trackingNumber)}`}
                              className="font-mono hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {registration.trackingNumber}
                            </Link>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 font-bold text-slate-900 dark:text-white min-w-32.5">
                          {registration.customerName}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                          {registration.mobile}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                          {registration.createdBy?.name || "Unknown"}
                        </td>
                        <td className="px-3.5 py-3 leading-snug font-medium text-slate-800 dark:text-slate-200 min-w-40">
                          {registration.processType || "-"}
                        </td>
                        <td className="px-3.5 py-3 leading-snug font-medium text-slate-800 dark:text-slate-200 min-w-32.5">
                          {registration.documentType || "-"}
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap font-semibold">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                            registration.trackingStatus === "Delivered"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : registration.trackingStatus === "Ready for Delivery" || registration.trackingStatus === "Ready For Delivery"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                              : registration.trackingStatus === "Document In Hand"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              : registration.trackingStatus === "In Transfer"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}>
                            {registration.trackingStatus || "Registered"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap font-semibold">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                            registration.paymentStatus === "Paid"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : registration.paymentStatus === "Partially Paid"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                          }`}>
                            {registration.paymentStatus || "Unpaid"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap font-semibold">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                            registration.approvalStatus === "Approved"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : registration.approvalStatus === "Pending"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                          }`}>
                            {registration.approvalStatus || "Pending"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                          {registration.createdDate}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {hasTimelinePermission && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="View Branch Movement"
                                onClick={() => setTimelineTrackingNumber(registration.trackingNumber)}
                                className="h-8 w-8"
                              >
                                <Route size={15} className="text-blue-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openView(registration)} className="h-8 w-8">
                              <Eye size={15} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(registration)} className="h-8 w-8">
                              <Pencil size={15} />
                            </Button>
                            <Button variant="danger" size="icon" onClick={() => handleDelete(registration)} className="h-8 w-8">
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-(--border) bg-white/50 p-4 dark:bg-white/5">
              <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Showing {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-soft">Rows per page:</span>
                  <select
                    className="h-9 rounded-md border border-(--border) bg-transparent px-2.5 text-xs sm:text-sm outline-none dark:bg-white/5"
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchRegistrations(query, filters, page - 1, pageSize)}
                    className="h-9 px-3 text-xs font-semibold"
                  >
                    <ChevronLeft size={16} className="mr-1" /> Previous
                  </Button>

                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 px-1">
                    Page {totalPages === 0 ? 0 : page} of {totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchRegistrations(query, filters, page + 1, pageSize)}
                    className="h-9 px-3 text-xs font-semibold"
                  >
                    Next <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
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
            />
            <PhoneField value={form.mobile} onChange={(value) => updateField("mobile", value)} defaultCountry={defaultPhoneCountry} />
            <Input
              label="Email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
            <label className="grid gap-2">
              <span className="text-sm font-bold">Country</span>
              <SearchableSelect
                value={form.country}
                options={countrySelectOptions}
                onChange={(nextValue: string) => updateField("country", nextValue)}
                placeholder="Select country"
                name="country"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Customer Type</span>
              <SearchableSelect
                value={form.customerType}
                options={toSelectOptions(customerTypeOptions)}
                onChange={(val) => {
                  updateField("customerType", val);
                  if (val !== "Corporate") updateField("corporateDetailId", "");
                }}
                placeholder="Select customer type"
                name="customerType"
              />
            </label>

            {form.customerType === "Corporate" && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Company</span>
                  <button
                    type="button"
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Add New Company"
                  >
                    <Plus size={14} className="h-3.5 w-3.5 rounded-full bg-blue-100 p-0.5 dark:bg-blue-900/60" /> Add Company
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      value={form.corporateDetailId || ""}
                      options={corporateOptions}
                      onChange={(val) => updateField("corporateDetailId", val)}
                      placeholder="Select corporate company"
                      name="corporateDetailId"
                      groupByCategory={false}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="h-10 w-10 shrink-0 p-0 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                    title="Add New Company"
                  >
                    <Plus size={18} />
                  </Button>
                </div>
              </div>
            )}
          </Section>

          <Section title="Section 2: Document Details">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Document Type</span>
              <SearchableSelect
                value={form.documentType}
                options={documentTypeSelectOptions}
                onChange={(nextValue: string) => updateField("documentType", nextValue)}
                placeholder="Select document type"
                name="documentType"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">Document Issued Country</span>
              <SearchableSelect
                value={form.documentIssuedCountry}
                options={countrySelectOptions}
                onChange={(nextValue: string) => updateField("documentIssuedCountry", nextValue)}
                placeholder="Select document issued country"
                name="documentIssuedCountry"
              />
            </label>
            <Input
              label="Document Name"
              value={form.documentName}
              placeholder="Enter document name"
              onChange={(event) => updateField("documentName", event.target.value)}
              maxLength={255}
            />
            <label className="grid gap-2">
              <span className="text-sm font-bold">Process Type</span>
              <SearchableSelect
                value={form.processType}
                options={processTypeSelectOptions}
                onChange={(nextValue: string) => updateField("processType", nextValue)}
                placeholder="Select process type"
                name="processType"
              />
            </label>
            <Input
              label="Additional Process"
              value={form.externalProcess}
              onChange={(event) => updateField("externalProcess", event.target.value)}
            />
            <label className="grid gap-2">
              <span className="text-sm font-bold">Special Processing Priority</span>
              <SearchableSelect
                value={form.priority}
                options={prioritySelectOptions}
                onChange={(nextValue: string) => updateField("priority", nextValue)}
                placeholder="Select priority"
                name="priority"
              />
            </label>
            <Input
              label="Committed Duration / SLA"
              value={form.committedDuration}
              onChange={(event) => updateField("committedDuration", event.target.value)}
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
            <MultiFileUpload
              label="Customer Document Upload"
              moduleName="Revenue Registration"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
              onFilesChange={(ids) => setDocumentFileIds(ids)}
              onRemoveExistingFile={handleRemoveExistingFile}
              existingFiles={selected?.files.filter((f) => f.fileCategory === "DOCUMENT")}
              required={false}
            />
          </Section>

          <Section title="Section 3: Payment Details">
            {selected?.advancePaymentStatus === "Rejected" && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <span className="font-bold">Advance Payment Was Rejected:</span>{" "}
                {selected.advancePaymentRejectionReason || "No reason specified."}
                <br />
                <span className="text-[11px] text-rose-600 dark:text-rose-400">
                  Update the Advance Paid amount or upload a new receipt file to re-submit for approval.
                </span>
              </div>
            )}
            <Input
              label="Total Charges"
              type="number"
              min="0"
              step="0.01"
              value={form.totalCharges}
              placeholder="Enter amount"
              onChange={(event) => updateField("totalCharges", event.target.value)}
            />
            {pendingRequestedAdvance > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Requested Advance
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    Pending Approval
                  </span>
                </div>
                <p className="mt-1 text-base font-extrabold text-amber-900 dark:text-amber-100">
                  ₹ {pendingRequestedAdvance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                  Does not reduce balance amount until approved by admin.
                </p>
              </div>
            )}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Approved Advance
                </span>
                <span className={`text-[11px] font-semibold ${isAdvancePaidEnabled ? "text-blue-500 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
                  {isAdvancePaidEnabled ? "Click to request advance" : "Enter Total Charges first"}
                </span>
              </div>
              <button
                type="button"
                disabled={!isAdvancePaidEnabled}
                onClick={() => {
                  if (!isAdvancePaidEnabled) return;
                  setIsAddAdvanceOpen(true);
                }}
                title={isAdvancePaidEnabled ? "Click to add an advance payment request" : "Enter Total Charges first to enable advance payment"}
                className={[
                  "group flex h-12 w-full items-center justify-between rounded-xl border px-4 py-2",
                  "text-sm font-extrabold text-emerald-700 dark:text-emerald-300",
                  "transition-all duration-150",
                  isAdvancePaidEnabled
                    ? "border-blue-200 bg-emerald-50 hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm hover:shadow-blue-100 active:scale-[0.99] dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-blue-950/40 dark:hover:border-blue-600 cursor-pointer"
                    : "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed dark:border-white/10 dark:bg-white/5",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  <span>
                    ₹ {approvedAdvance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {isAdvancePaidEnabled && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity dark:text-blue-400">
                      <Plus size={12} /> Request Advance
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-400 transition-colors">
                  {!isAdvancePaidEnabled
                    ? "Enter Total Charges First"
                    : "Approved Only"}
                </span>
              </button>
            </div>
            <MultiFileUpload
              label="Advance Payment Upload"
              moduleName="Revenue Registration"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onFilesChange={(ids) => setAdvancePaymentFileIds(ids)}
              onRemoveExistingFile={handleRemoveExistingFile}
              existingFiles={selected?.files.filter((f) => f.fileCategory === "ADVANCE_PAYMENT")}
              required={false}
            />
            <Input label="Balance Amount" value={hasPaymentEntry ? balanceAmount.toFixed(2) : ""} readOnly />
            <SelectField label="Payment Mode" name="paymentMode" value={form.paymentMode} options={paymentModeOptions} onChange={updateField} />
            {(() => {
              const mode = (form.paymentMode || "").trim().toLowerCase();
              if (!mode || mode === "cash") return null;

              if (mode === "upi") {
                return (
                  <Input
                    label="UPI Transaction ID"
                    value={form.upiTransactionId || ""}
                    placeholder="Enter UPI Transaction ID"
                    onChange={(e) => updateField("upiTransactionId", e.target.value)}
                  />
                );
              }

              if (mode.includes("bank") || mode === "bank transfer") {
                return (
                  <>
                    <Input
                      label="Bank Name"
                      value={form.bankName || ""}
                      placeholder="Enter Bank Name"
                      onChange={(e) => updateField("bankName", e.target.value)}
                    />
                    <Input
                      label="Transaction Reference Number"
                      value={form.transactionRefNo || ""}
                      placeholder="Enter Reference Number"
                      onChange={(e) => updateField("transactionRefNo", e.target.value)}
                    />
                    <Input
                      label="Transfer Date"
                      type="date"
                      value={form.transferDate || ""}
                      onChange={(e) => updateField("transferDate", e.target.value)}
                    />
                  </>
                );
              }

              if (mode === "cheque" || mode === "check") {
                return (
                  <>
                    <Input
                      label="Cheque Number"
                      value={form.chequeNumber || ""}
                      placeholder="Enter Cheque Number"
                      onChange={(e) => updateField("chequeNumber", e.target.value)}
                    />
                    <Input
                      label="Bank Name"
                      value={form.bankName || ""}
                      placeholder="Enter Bank Name"
                      onChange={(e) => updateField("bankName", e.target.value)}
                    />
                    <Input
                      label="Cheque Date"
                      type="date"
                      value={form.chequeDate || ""}
                      onChange={(e) => updateField("chequeDate", e.target.value)}
                    />
                  </>
                );
              }

              if (mode.includes("demand draft") || mode === "dd" || mode === "demand draft") {
                return (
                  <>
                    <Input
                      label="DD Number"
                      value={form.ddNumber || ""}
                      placeholder="Enter Demand Draft Number"
                      onChange={(e) => updateField("ddNumber", e.target.value)}
                    />
                    <Input
                      label="Bank Name"
                      value={form.bankName || ""}
                      placeholder="Enter Bank Name"
                      onChange={(e) => updateField("bankName", e.target.value)}
                    />
                    <Input
                      label="DD Date"
                      type="date"
                      value={form.ddDate || ""}
                      onChange={(e) => updateField("ddDate", e.target.value)}
                    />
                  </>
                );
              }

              if (mode === "credit card" || mode === "debit card" || mode.includes("credit") || mode.includes("debit")) {
                return (
                  <>
                    <Input
                      label="Card Last 4 Digits"
                      value={form.cardLast4 || ""}
                      placeholder="e.g. 4321"
                      maxLength={4}
                      onChange={(e) => updateField("cardLast4", e.target.value)}
                    />
                    <Input
                      label="Approval Code"
                      value={form.approvalCode || ""}
                      placeholder="Enter Approval Code"
                      onChange={(e) => updateField("approvalCode", e.target.value)}
                    />
                  </>
                );
              }

              if (mode.includes("online") || mode === "online payment") {
                return (
                  <>
                    <Input
                      label="Payment Gateway"
                      value={form.paymentGateway || ""}
                      placeholder="e.g. Razorpay / Stripe"
                      onChange={(e) => updateField("paymentGateway", e.target.value)}
                    />
                    <Input
                      label="Transaction ID"
                      value={form.onlineTransactionId || ""}
                      placeholder="Enter Transaction ID"
                      onChange={(e) => updateField("onlineTransactionId", e.target.value)}
                    />
                  </>
                );
              }

              if (mode === "wallet") {
                return (
                  <>
                    <Input
                      label="Wallet Name"
                      value={form.walletName || ""}
                      placeholder="e.g. Paytm / PhonePe"
                      onChange={(e) => updateField("walletName", e.target.value)}
                    />
                    <Input
                      label="Wallet Transaction ID"
                      value={form.walletTransactionId || ""}
                      placeholder="Enter Wallet Transaction ID"
                      onChange={(e) => updateField("walletTransactionId", e.target.value)}
                    />
                  </>
                );
              }

              if (mode === "other") {
                return (
                  <>
                    <Input
                      label="Reference Number"
                      value={form.paymentReferenceNo || ""}
                      placeholder="Enter Reference Number"
                      onChange={(e) => updateField("paymentReferenceNo", e.target.value)}
                    />
                    <Input
                      label="Description"
                      value={form.paymentDescription || ""}
                      placeholder="Enter Payment Description"
                      onChange={(e) => updateField("paymentDescription", e.target.value)}
                    />
                  </>
                );
              }

              return null;
            })()}
            <Input label="Payment Status" value={computedPaymentStatus} readOnly placeholder="System Generated" />
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
                groupByCategory={false}
                showDescription={false}
              />
            </label>
            <Input
              label="Registered Person"
              name="registeredPerson"
              value={form.registeredPerson}
              readOnly
              className="bg-slate-100 dark:bg-white/5 cursor-not-allowed text-slate-700 dark:text-slate-300 font-medium"
            />
            <Input
              label="Region of Registration"
              value={form.regionOfRegistration}
              readOnly
              description="Auto-filled from the logged-in user's office location"
            />
            <MultiFileUpload
              label="Bill Upload"
              moduleName="Revenue Registration"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
              onFilesChange={(ids) => setInvoiceFileIds(ids)}
              onRemoveExistingFile={handleRemoveExistingFile}
              existingFiles={selected?.files.filter((f) => f.fileCategory === "INVOICE" || f.fileCategory === "BILL")}
              required={false}
            />
            <MultiFileUpload
              label="Supporting Documents Upload"
              moduleName="Revenue Registration"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
              onFilesChange={(ids) => setSupportingFileIds(ids)}
              onRemoveExistingFile={handleRemoveExistingFile}
              existingFiles={selected?.files.filter((f) => f.fileCategory === "SUPPORTING_DOCUMENT")}
              required={false}
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

      <CorporateDetailFormModal
        open={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSuccess={(newCompany) => {
          const newOpt: SelectOption = {
            label: newCompany.companyName,
            value: newCompany.id,
          };
          setCorporateOptions((prev) => [newOpt, ...prev.filter((o) => o.value !== newCompany.id)]);
          setForm((prev) => ({
            ...prev,
            corporateDetailId: newCompany.id,
          }));
        }}
        title="Add New Corporate Company"
        description="Fill company details to save and select immediately in registration."
      />

      {(selected || drawerMode === "form") && (
        <AddAdvanceModal
          isOpen={isAddAdvanceOpen && isAdvancePaidEnabled}
          onClose={() => setIsAddAdvanceOpen(false)}
          registrationId={selected?.id || ""}
          trackingNumber={selected?.trackingNumber || form.trackingNumber || initialTrackingNumber || "New Registration"}
          customerName={selected?.customerName || form.customerName || "Customer"}
          totalCharges={Number(form.totalCharges || selected?.totalCharges || 0)}
          currentApprovedAdvance={approvedAdvance}
          currentBalance={balanceAmount}
          personOptions={toSelectOptions(personOptions)}
          onPendingSubmit={(pendingData) => {
            setForm((prev) => ({
              ...prev,
              requestedAdvanceAmount: String(pendingData.advanceAmount),
              advancePaid: String(approvedAdvance),
              paymentMode: pendingData.paymentMode || prev.paymentMode,
              collectedPerson: pendingData.collectedBy || prev.collectedPerson,
              ...(pendingData.upiTransactionId ? { upiTransactionId: pendingData.upiTransactionId } : {}),
              ...(pendingData.bankName ? { bankName: pendingData.bankName } : {}),
              ...(pendingData.transactionRefNo ? { transactionRefNo: pendingData.transactionRefNo } : {}),
              ...(pendingData.transferDate ? { transferDate: pendingData.transferDate } : {}),
              ...(pendingData.chequeNumber ? { chequeNumber: pendingData.chequeNumber } : {}),
              ...(pendingData.chequeDate ? { chequeDate: pendingData.chequeDate } : {}),
              ...(pendingData.ddNumber ? { ddNumber: pendingData.ddNumber } : {}),
              ...(pendingData.ddDate ? { ddDate: pendingData.ddDate } : {}),
              ...(pendingData.cardLast4 ? { cardLast4: pendingData.cardLast4 } : {}),
              ...(pendingData.approvalCode ? { approvalCode: pendingData.approvalCode } : {}),
              ...(pendingData.paymentGateway ? { paymentGateway: pendingData.paymentGateway } : {}),
              ...(pendingData.onlineTransactionId ? { onlineTransactionId: pendingData.onlineTransactionId } : {}),
              ...(pendingData.walletName ? { walletName: pendingData.walletName } : {}),
              ...(pendingData.walletTransactionId ? { walletTransactionId: pendingData.walletTransactionId } : {}),
            }));
            if (pendingData.proofFileIds && pendingData.proofFileIds.length > 0) {
              setAdvancePaymentFileIds(pendingData.proofFileIds);
            }
          }}
          onSuccess={() => {
            fetchRegistrations(query, filters);
          }}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="rounded-full bg-rose-100 p-2.5 dark:bg-rose-950/60">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete {selectedIds.length} Selected {selectedIds.length === 1 ? "Document" : "Documents"}?
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Are you sure you want to delete the <strong>{selectedIds.length}</strong> selected Revenue Registration {selectedIds.length === 1 ? "document" : "documents"}? This action may affect related document records, movement history, and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={isBulkDeleting}
                onClick={handleBulkDeleteConfirm}
                className="flex items-center gap-2"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete {selectedIds.length} {selectedIds.length === 1 ? "Document" : "Documents"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
