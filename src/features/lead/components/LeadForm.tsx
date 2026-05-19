"use client";

import type { ChangeEventHandler, FormEvent, ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Loader";
import { Textarea } from "@/components/ui/Textarea";
import {
  assignedUsers,
  clientTypes,
  countries,
  countryCodes,
  defaultLeadValues,
  docTypes,
  type LeadFormValues,
  leadStatuses,
  services,
  sources,
  states,
} from "@/features/lead/data/lead.data";

type LeadFormProps = {
  initialValues?: LeadFormValues;
  submitLabel?: string;
  onCancel?: () => void;
  leadId?: string;
  onSuccess?: () => void;
};

type FormErrors = Partial<Record<keyof LeadFormValues, string>>;

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

  const issuedCountryOptions = useMemo(() => countries, []);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setMessage("");
  }, [initialValues]);

  function updateField<Key extends keyof LeadFormValues>(key: Key, value: LeadFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
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
          <SelectLikeInput
            label="Country Code"
            name="countryCode"
            value={values.countryCode}
            onChange={(event) => updateField("countryCode", event.target.value)}
            options={countryCodes}
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
          <SelectLikeInput
            label="Doc Type"
            name="docType"
            value={values.docType}
            onChange={(event) => updateField("docType", event.target.value)}
            options={docTypes}
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
          <SelectLikeInput
            label="Country"
            name="country"
            value={values.country}
            onChange={(event) => updateField("country", event.target.value)}
            options={countries}
            placeholder="Select country"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SelectLikeInput
            label="State"
            name="state"
            value={values.state}
            onChange={(event) => updateField("state", event.target.value)}
            options={states}
            placeholder="Select state"
          />
        </FieldWrapper>
        <FieldWrapper className="md:col-span-2">
          <SelectLikeInput
            label="Document Issued Country"
            name="documentIssuedCountry"
            value={values.documentIssuedCountry}
            onChange={(event) => updateField("documentIssuedCountry", event.target.value)}
            options={issuedCountryOptions}
            placeholder="Select issued country"
          />
        </FieldWrapper>
      </LeadSection>

      <LeadSection title="Service Information">
        <FieldWrapper error={errors.service}>
          <SelectLikeInput
            label="Service"
            name="service"
            value={values.service}
            onChange={(event) => updateField("service", event.target.value)}
            options={services}
            placeholder="Select service"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SelectLikeInput
            label="Source"
            name="source"
            value={values.source}
            onChange={(event) => updateField("source", event.target.value)}
            options={sources}
            placeholder="Select source"
          />
        </FieldWrapper>
        <FieldWrapper error={errors.leadStatus}>
          <SelectLikeInput
            label="Lead Status"
            name="leadStatus"
            value={values.leadStatus}
            onChange={(event) => updateField("leadStatus", event.target.value)}
            options={leadStatuses}
            placeholder="Select lead status"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SelectLikeInput
            label="Assigned User"
            name="assignedUser"
            value={values.assignedUser}
            onChange={(event) => updateField("assignedUser", event.target.value)}
            options={assignedUsers}
            placeholder="Select assigned user"
          />
        </FieldWrapper>
        <FieldWrapper>
          <SelectLikeInput
            label="Client Type"
            name="clientType"
            value={values.clientType}
            onChange={(event) => updateField("clientType", event.target.value)}
            options={clientTypes}
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

function SelectLikeInput({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  options: string[];
  placeholder?: string;
}) {
  const listId = `${name}-list`;

  return (
    <>
      <Input
        label={label}
        name={name}
        list={listId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
