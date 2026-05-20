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
  assignedUsers,
  clientTypes,
  countryCodes,
  defaultLeadValues,
  docTypes,
  type LeadFormValues,
  leadStatuses,
  services,
  sources,
} from "@/features/lead/data/lead.data";

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
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setMessage(payload?.message ?? "Unable to save lead.");
        return;
      }

      setMessage(leadId ? "Lead updated successfully." : "Lead created successfully.");
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

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
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
            options={mapToOptions(leadStatuses)}
            placeholder="Select lead status"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SearchableSelect
            label="Assigned User"
            name="assignedUser"
            value={values.assignedUser}
            onChange={(value) => updateField("assignedUser", value)}
            options={mapToOptions(assignedUsers)}
            placeholder="Select assigned user"
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
          <Input
            label="Next Followup"
            name="nextFollowupAt"
            type="datetime-local"
            value={values.nextFollowupAt}
            onChange={(event) => updateField("nextFollowupAt", event.target.value)}
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

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-4 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
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

function LeadSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
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
    <div className={className}>
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
          `flex min-h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 py-1.5 text-sm transition-all dark:bg-slate-900 ${
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
