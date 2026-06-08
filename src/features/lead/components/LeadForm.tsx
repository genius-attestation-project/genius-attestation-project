"use client";

import type { FormEvent, ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Country, State } from "country-state-city";
import Select from "react-select";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Loader";
import { Textarea } from "@/components/ui/Textarea";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  clientTypes,
  countryCodes,
  defaultLeadValues,
  docTypes,
  leadFormStatuses,
  type LeadFormValues,
  services,
  sources,
} from "@/features/lead/data/lead.data";
import type { LeadAssignableUser } from "@/features/lead/types/lead.types";

type LeadFormProps = {
  initialValues?: LeadFormValues;
  submitLabel?: string;
  onCancel?: () => void;
  leadId?: string;
  onSuccess?: () => void;
};

type FormErrors = Partial<Record<keyof LeadFormValues, string>>;

const mapToOptions = (arr: readonly string[]) =>
  arr.map((item) => ({ label: item, value: item }));

function toIsoFromLocalDateTime(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function splitLocalDateTime(value: string) {
  if (!value) {
    return {
      date: "",
      hour: "08",
      minute: "00",
      period: "AM",
    };
  }

  const [date = "", time = "08:00"] = value.split("T");
  const [hourValue = "08", minute = "00"] = time.split(":");
  const hour24 = Number(hourValue);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return {
    date,
    hour: String(hour12).padStart(2, "0"),
    minute,
    period,
  };
}

function buildLocalDateTime(date: string, hour: string, minute: string, period: string) {
  if (!date) {
    return "";
  }

  let hour24 = Number(hour);

  if (period === "PM" && hour24 < 12) {
    hour24 += 12;
  }

  if (period === "AM" && hour24 === 12) {
    hour24 = 0;
  }

  return `${date}T${String(hour24).padStart(2, "0")}:${minute || "00"}`;
}

function formatFollowupDisplay(value: string) {
  if (!value) {
    return "No follow-up scheduled";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

export function LeadForm({
  initialValues = defaultLeadValues,
  submitLabel = "Save Lead",
  onCancel,
  leadId,
  onSuccess,
}: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [assignableUsers, setAssignableUsers] = useState<LeadAssignableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  const allCountries = useMemo(() => 
    Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)),
  []);
  
  const countryOptions = useMemo(
    () => allCountries.map((c) => ({ label: c.name, value: c.name })),
    [allCountries]
  );
  
  const issuedCountryOptions = countryOptions;

  const [stateOptions, setStateOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; isoCode: string } | null>(null);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setMessage("");
  }, [initialValues]);

  useEffect(() => {
    let ignore = false;

    async function loadAssignableUsers() {
      setUsersLoading(true);
      setUsersError("");

      try {
        const response = await fetch("/api/leads/assignable-users", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          users?: LeadAssignableUser[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load assignable users.");
        }

        if (!ignore) {
          setAssignableUsers(payload.users ?? []);
        }
      } catch (fetchError) {
        if (!ignore) {
          setAssignableUsers([]);
          setUsersError(
            fetchError instanceof Error ? fetchError.message : "Unable to load assignable users.",
          );
        }
      } finally {
        if (!ignore) {
          setUsersLoading(false);
        }
      }
    }

    void loadAssignableUsers();

    return () => {
      ignore = true;
    };
  }, []);

  // Handle edit mode: Sync selectedCountry when values.country changes externally
  useEffect(() => {
    if (values.country && (!selectedCountry || selectedCountry.name !== values.country)) {
      const c = allCountries.find((x) => x.name === values.country);
      if (c) {
        setSelectedCountry({ name: c.name, isoCode: c.isoCode });
      }
    } else if (!values.country) {
      setSelectedCountry(null);
    }
  }, [values.country, allCountries]);

  // Fetch dynamic states based on selectedCountry ISO code
  useEffect(() => {
    if (selectedCountry?.isoCode) {
      const fetchedStates = State.getStatesOfCountry(selectedCountry.isoCode);
      setStateOptions(fetchedStates.map((s) => ({ label: s.name, value: s.name })));
    } else {
      setStateOptions([]);
    }
  }, [selectedCountry]);

  function updateField<Key extends keyof LeadFormValues>(key: Key, value: LeadFormValues[Key]) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "country" && current.country !== value) {
        next.state = ""; // clear state when country changes
      }
      return next;
    });
    
    if (key === "country") {
      const c = allCountries.find((x) => x.name === value);
      setSelectedCountry(c ? { name: c.name, isoCode: c.isoCode } : null);
    }
    
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage("");
  }

  function updateAssignedUser(userId: string) {
    const selectedUser = assignableUsers.find((user) => user.id === userId);

    setValues((current) => ({
      ...current,
      assignedUserId: userId,
      assignedUser: selectedUser?.name ?? "",
    }));
    setErrors((current) => ({ ...current, assignedUserId: undefined, assignedUser: undefined }));
    setMessage("");
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!values.firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }

    if (!values.mobileNumber.trim()) {
      nextErrors.mobileNumber = "Mobile number is required.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    }

    if (!values.service.trim()) {
      nextErrors.service = "Service is required.";
    }

    if (!values.leadStatus.trim()) {
      nextErrors.leadStatus = "Lead status is required.";
    }

    if (!values.country.trim()) {
      nextErrors.country = "Country is required.";
    }

    return nextErrors;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(leadId ? `/api/leads/${leadId}` : "/api/leads", {
        method: leadId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          nextFollowupAt: toIsoFromLocalDateTime(values.nextFollowupAt),
        }),
      });

      console.log("Saved nextFollowupAt:", toIsoFromLocalDateTime(values.nextFollowupAt));

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; approvalRequested?: boolean }
        | null;

      if (!response.ok) {
        setMessage(payload?.message ?? "Unable to save lead.");
        return;
      }

      setMessage(
        payload?.message ?? (leadId ? "Lead updated successfully." : "Lead created successfully."),
      );
      setValues(leadId ? values : defaultLeadValues);
      await onSuccess?.();
    } catch (error) {
      console.error("Failed to save lead", error);
      setMessage("Unable to save lead right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setValues(initialValues);
    setErrors({});
    setMessage("");
  }

  const assignableUserOptions = useMemo(
    () =>
      assignableUsers.map((user) => ({
        label: user.name,
        value: user.id,
        description: user.email,
      })),
    [assignableUsers],
  );

  return (
    <form className="grid min-w-0 gap-4 sm:gap-6" onSubmit={onSubmit}>
      <LeadSection title="Personal Information">
        <FieldWrapper error={errors.firstName}>
          <Input
            label="First Name"
            name="firstName"
            value={values.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            placeholder="Enter first name"
          />
        </FieldWrapper>
        <FieldWrapper>
          <Input
            label="Last Name"
            name="lastName"
            value={values.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            placeholder="Enter last name"
          />
        </FieldWrapper>
        <FieldWrapper error={errors.mobileNumber}>
          <SearchableSelect
            label="Country Code"
            name="countryCode"
            value={values.countryCode}
            onChange={(value) => updateField("countryCode", value)}
            options={mapToOptions(countryCodes)}
          />
        </FieldWrapper>
        <FieldWrapper error={errors.mobileNumber}>
          <Input
            label="Mobile Number"
            name="mobileNumber"
            value={values.mobileNumber}
            onChange={(event) => updateField("mobileNumber", event.target.value)}
            placeholder="Enter mobile number"
          />
        </FieldWrapper>
        <FieldWrapper error={errors.email} className="md:col-span-2">
          <Input
            label="Email"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="Enter email address"
          />
        </FieldWrapper>
      </LeadSection>

      <LeadSection title="Document Information">
        <FieldWrapper>
          <SearchableSelect
            label="Doc Type"
            name="docType"
            value={values.docType}
            onChange={(value) => updateField("docType", value)}
            options={mapToOptions(docTypes)}
            placeholder="Select document type"
          />
        </FieldWrapper>
        <FieldWrapper>
          <Input
            label="No Of Documents"
            name="noOfDocuments"
            value={values.noOfDocuments}
            onChange={(event) => updateField("noOfDocuments", event.target.value)}
            placeholder="Enter document count"
          />
        </FieldWrapper>
      </LeadSection>

      <LeadSection title="Location Information">
        <FieldWrapper error={errors.country}>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Country
          </label>
          <CountryStateSelect
            value={values.country}
            onChange={(value) => updateField("country", value)}
            options={countryOptions}
            placeholder="Select country"
          />
          <input type="hidden" name="country" value={values.country} />
        </FieldWrapper>
        <FieldWrapper>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            State
          </label>
          <CountryStateSelect
            value={values.state}
            onChange={(value) => updateField("state", value)}
            options={stateOptions}
            placeholder={values.country ? "Select state" : "Select country first"}
            disabled={!values.country}
          />
          <input type="hidden" name="state" value={values.state} />
        </FieldWrapper>
        <FieldWrapper className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Document Issued Country
          </label>
          <CountryStateSelect
            value={values.documentIssuedCountry}
            onChange={(value) => updateField("documentIssuedCountry", value)}
            options={issuedCountryOptions}
            placeholder="Select issued country"
          />
          <input type="hidden" name="documentIssuedCountry" value={values.documentIssuedCountry} />
        </FieldWrapper>
      </LeadSection>

      <LeadSection title="Service Information">
        <FieldWrapper error={errors.service}>
          <SearchableSelect
            label="Service"
            name="service"
            value={values.service}
            onChange={(value) => updateField("service", value)}
            options={mapToOptions(services)}
            placeholder="Select service"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SearchableSelect
            label="Source"
            name="source"
            value={values.source}
            onChange={(value) => updateField("source", value)}
            options={mapToOptions(sources)}
            placeholder="Select source"
          />
        </FieldWrapper>
        <FieldWrapper error={errors.leadStatus}>
          <SearchableSelect
            label="Lead Status"
            name="leadStatus"
            value={values.leadStatus}
            onChange={(value) => updateField("leadStatus", value)}
            options={mapToOptions(leadFormStatuses)}
            placeholder="Select lead status"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SearchableSelect
            label="Assigned User"
            name="assignedUserId"
            value={values.assignedUserId}
            onChange={updateAssignedUser}
            options={assignableUserOptions}
            placeholder={usersLoading ? "Loading users..." : "Select assigned user"}
            loading={usersLoading}
            errorMessage={usersError}
            emptyMessage="No active users found"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SearchableSelect
            label="Client Type"
            name="clientType"
            value={values.clientType}
            onChange={(value) => updateField("clientType", value)}
            options={mapToOptions(clientTypes)}
            placeholder="Select client type"
          />
        </FieldWrapper>
      </LeadSection>

      <LeadSection title="Business Information">
        <FieldWrapper>
          <Input
            label="Amount"
            name="amount"
            value={values.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            placeholder="Enter amount"
          />
        </FieldWrapper>
        <FieldWrapper>
          <Input
            label="Working Days"
            name="workingDays"
            value={values.workingDays}
            onChange={(event) => updateField("workingDays", event.target.value)}
            placeholder="Enter working days"
          />
        </FieldWrapper>
        <FieldWrapper>
          <FollowupDateTimePicker
            value={values.nextFollowupAt}
            onChange={(value) => updateField("nextFollowupAt", value)}
          />
        </FieldWrapper>
      </LeadSection>

      <LeadSection title="Additional Remarks">
        <FieldWrapper className="md:col-span-2">
          <Textarea
            label="Remark"
            name="remark"
            value={values.remark}
            onChange={(event) => updateField("remark", event.target.value)}
            placeholder="Add lead remarks, notes, or approval context"
          />
        </FieldWrapper>
      </LeadSection>

      {message ? (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10">
          {message}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-100 bg-white/95 px-3 py-3 shadow-lg backdrop-blur sm:gap-3 sm:px-4 sm:py-4 dark:border-white/10 dark:bg-slate-950/90">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="secondary" type="button" onClick={resetForm}>
          <RotateCcw size={16} />
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader /> : null}
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FollowupDateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = splitLocalDateTime(value);
  const hours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    onChange(buildLocalDateTime(merged.date, merged.hour, merged.minute, merged.period));
  }

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-sm font-bold">Next Follow-up</span>
        <span className="text-xs font-medium text-blue-600">
          {formatFollowupDisplay(value)}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_76px_76px_76px]">
        <input
          type="date"
          value={parts.date}
          onChange={(event) => update({ date: event.target.value })}
          className="h-12 min-w-0 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-[color:var(--text)] outline-none transition focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
        />
        <select
          value={parts.hour}
          onChange={(event) => update({ hour: event.target.value })}
          className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 text-sm font-semibold outline-none transition focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
        >
          {hours.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <select
          value={parts.minute}
          onChange={(event) => update({ minute: event.target.value })}
          className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 text-sm font-semibold outline-none transition focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
        >
          {minutes.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
        <select
          value={parts.period}
          onChange={(event) => update({ period: event.target.value })}
          className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 text-sm font-semibold outline-none transition focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function LeadSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldWrapper({
  error,
  className,
  children,
}: {
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      {children}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function CountryStateSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const selectedOption = options.find((opt) => opt.value === value) || null;
  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(opt) => onChange(opt?.value || "")}
      placeholder={placeholder}
      isDisabled={disabled}
      isClearable
      unstyled
      classNames={{
        control: (state) =>
          `flex min-h-[42px] w-full min-w-0 items-center justify-between rounded-xl border bg-white px-3 py-1.5 text-sm transition-all dark:bg-slate-900 ${
            state.isFocused
              ? "border-blue-500 ring-1 ring-blue-500"
              : "border-slate-200 dark:border-slate-800"
          } ${disabled ? "cursor-not-allowed opacity-60 bg-slate-50 dark:bg-slate-900/50" : "cursor-pointer"} hover:border-slate-300 dark:hover:border-slate-700`,
        menu: () =>
          "mt-1 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 absolute z-50 w-full",
        option: (state) =>
          `px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
            state.isSelected
              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              : "text-slate-700 dark:text-slate-300"
          }`,
        input: () => "text-slate-900 dark:text-white outline-none",
        singleValue: () => "text-slate-900 dark:text-slate-100",
        placeholder: () => "text-slate-500",
        menuList: () => "max-h-60 overflow-y-auto py-1",
        dropdownIndicator: (state) =>
          `text-slate-400 transition-transform ${state.selectProps.menuIsOpen ? "rotate-180" : ""}`,
        clearIndicator: () =>
          "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1",
        indicatorSeparator: () => "hidden",
      }}
    />
  );
}
