"use client";

import React, { useState, useEffect } from "react";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/common/FileUpload";
import { Building2, CheckCircle, FileText, Loader2 } from "lucide-react";

export type CorporateDetailFormData = {
  id?: string;
  companyName: string;
  contactPersonName: string;
  contactPersonMobile: string;
  email: string;
  address: string;
  agreementFileId: string | null;
  isActive: boolean;
};

type CorporateDetailFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (record: any) => void;
  initialData?: Partial<CorporateDetailFormData> | null;
  title?: string;
  description?: string;
};

export function CorporateDetailFormModal({
  open,
  onClose,
  onSuccess,
  initialData,
  title = "Add Corporate Details",
  description = "Enter company contact details and upload client agreement.",
}: CorporateDetailFormModalProps) {
  const [form, setForm] = useState<CorporateDetailFormData>({
    companyName: "",
    contactPersonName: "",
    contactPersonMobile: "",
    email: "",
    address: "",
    agreementFileId: null,
    isActive: true,
  });

  const [agreementFileId, setAgreementFileId] = useState<string | null>(null);
  const [existingFile, setExistingFile] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        companyName: initialData.companyName || "",
        contactPersonName: initialData.contactPersonName || "",
        contactPersonMobile: initialData.contactPersonMobile || "",
        email: initialData.email || "",
        address: initialData.address || "",
        agreementFileId: initialData.agreementFileId || null,
        isActive: initialData.isActive ?? true,
      });
      setAgreementFileId(initialData.agreementFileId || null);
      setExistingFile((initialData as any).agreementFile || null);
    } else {
      setForm({
        companyName: "",
        contactPersonName: "",
        contactPersonMobile: "",
        email: "",
        address: "",
        agreementFileId: null,
        isActive: true,
      });
      setAgreementFileId(null);
      setExistingFile(null);
    }
    setError("");
  }, [initialData, open]);

  const updateField = (field: keyof CorporateDetailFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.companyName.trim()) {
      setError("Company Name is required.");
      return;
    }
    if (!form.contactPersonName.trim()) {
      setError("Contact Person Name is required.");
      return;
    }
    if (!form.contactPersonMobile.trim()) {
      setError("Contact Person Mobile is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        agreementFileId,
      };

      const url = form.id
        ? `/api/master-data/corporate-details/${form.id}`
        : `/api/master-data/corporate-details`;
      const method = form.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save Corporate Details.");
      }

      onSuccess(data.item || data);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      placement="center"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 p-3 text-xs font-semibold text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/40 dark:text-blue-200">
          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Newly created companies will automatically trigger validation in Pending Approvals.</span>
        </div>

        <Input
          label="Company Name *"
          value={form.companyName}
          onChange={(e) => updateField("companyName", e.target.value)}
          placeholder="e.g. ABC Travels & Tours"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contact Person Name *"
            value={form.contactPersonName}
            onChange={(e) => updateField("contactPersonName", e.target.value)}
            placeholder="e.g. Rahul Sharma"
            required
          />

          <Input
            label="Contact Person Mobile *"
            value={form.contactPersonMobile}
            onChange={(e) => updateField("contactPersonMobile", e.target.value)}
            placeholder="e.g. +91 9876543210"
            required
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="e.g. info@abctravels.com"
        />

        <Textarea
          label="Address"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="Enter corporate office address..."
          rows={3}
        />

        <FileUpload
          label="Agreement Upload (Optional)"
          moduleName="Corporate Details"
          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
          onUploadComplete={(id) => {
            setAgreementFileId(id);
          }}
          onRemove={() => {
            setAgreementFileId(null);
            setExistingFile(null);
          }}
          existingFile={
            existingFile
              ? {
                  id: existingFile.id,
                  fileName: existingFile.originalName || existingFile.fileName || "Agreement Document",
                  url: existingFile.url,
                }
              : undefined
          }
        />

        {error && (
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
            {submitting ? (
              <>
                <Loader2 size={16} className="mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle size={16} className="mr-1.5" /> Save Corporate Details
              </>
            )}
          </Button>
        </div>
      </form>
    </FormDrawer>
  );
}
