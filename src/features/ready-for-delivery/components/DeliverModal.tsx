"use client";

import React, { useState, useEffect } from "react";
import { X, Truck, User, Upload, Save, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { compressImage } from "@/utils/image-compressor";

type DeliverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  registrationId: string;
  trackingNumber: string;
  customerName: string;
  onSuccess: (result: {
    isDelivered: boolean;
    requiresAdvancePayment?: boolean;
    isPendingApproval?: boolean;
  }) => void;
};

export function DeliverModal({
  isOpen,
  onClose,
  registrationId,
  trackingNumber,
  customerName,
  onSuccess,
}: DeliverModalProps) {
  const [deliveryType, setDeliveryType] = useState<"User" | "Courier">("User");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [courierTrackingNumber, setCourierTrackingNumber] = useState("");

  const [activeUsers, setActiveUsers] = useState<SelectOption[]>([]);
  const [activeCouriers, setActiveCouriers] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileId, setProofFileId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDeliveryType("User");
      setSelectedUserId("");
      setSelectedCourierId("");
      setCourierTrackingNumber("");
      setProofFile(null);
      setProofFileId(null);
      setError(null);

      setLoadingOptions(true);
      Promise.all([
        fetch("/api/users?active=true").then((res) => res.json()).catch(() => ({ users: [] })),
        fetch("/api/master-data/courier-companies?active=true").then((res) => res.json()).catch(() => ({ items: [] })),
      ])
        .then(([usersRes, couriersRes]) => {
          const userOpts: SelectOption[] = (usersRes.users || usersRes.items || []).map((u: any) => ({
            label: `${u.name || u.email}${u.role?.name ? ` (${u.role.name})` : ""}`,
            value: u.id,
          }));
          const courierOpts: SelectOption[] = (couriersRes.items || []).map((c: any) => ({
            label: c.name,
            value: c.id,
          }));
          setActiveUsers(userOpts);
          setActiveCouriers(courierOpts);
        })
        .finally(() => setLoadingOptions(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingFile(true);

    try {
      // Automatically compress image file before upload
      const compressed = await compressImage(file);

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("moduleName", "Ready For Delivery");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to upload delivery proof.");
      }

      setProofFile(compressed);
      setProofFileId(json.file?.id || json.id || json.fileStorageId);
    } catch (err: any) {
      setError(err.message || "Failed to compress or upload file.");
      setProofFile(null);
      setProofFileId(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (deliveryType === "User" && !selectedUserId) {
      setError("Please select a user.");
      return;
    }

    if (deliveryType === "Courier") {
      if (!selectedCourierId) {
        setError("Please select a courier company.");
        return;
      }
      if (!courierTrackingNumber.trim()) {
        setError("Please enter the courier tracking number.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/ready-for-delivery/${registrationId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType,
          deliveryUserId: deliveryType === "User" ? selectedUserId : null,
          courierCompanyId: deliveryType === "Courier" ? selectedCourierId : null,
          courierTrackingNumber: deliveryType === "Courier" ? courierTrackingNumber.trim() : null,
          proofFileId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to submit delivery details.");
      }

      onSuccess(json);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-160 max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Ready For Delivery · #{trackingNumber}
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
              Deliver Document
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer: <span className="font-semibold text-slate-700 dark:text-slate-200">{customerName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form id="deliver-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Delivery Type Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Delivery Type *
            </label>
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as "User" | "Courier")}
              className="w-full h-10 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="User">User</option>
              <option value="Courier">Courier</option>
            </select>
          </div>

          {/* Delivery Type = User */}
          {deliveryType === "User" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Select User *
              </label>
              <SearchableSelect
                value={selectedUserId}
                options={activeUsers}
                onChange={(val) => setSelectedUserId(val)}
                placeholder={loadingOptions ? "Loading active users..." : "Select user..."}
                emptyMessage="No active users found."
              />
            </div>
          )}

          {/* Delivery Type = Courier */}
          {deliveryType === "Courier" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Courier Company *
                </label>
                <SearchableSelect
                  value={selectedCourierId}
                  options={activeCouriers}
                  onChange={(val) => setSelectedCourierId(val)}
                  placeholder={loadingOptions ? "Loading active courier companies..." : "Select courier company..."}
                  emptyMessage="No active courier companies found in Master Configuration."
                />
              </div>

              <div className="space-y-1.5">
                <Input
                  label="Courier Tracking Number *"
                  placeholder="Enter courier tracking number"
                  value={courierTrackingNumber}
                  onChange={(e) => setCourierTrackingNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Delivery Proof Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Delivery Proof Upload (Auto-Compressed)
            </label>
            <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center hover:bg-slate-100/50 transition cursor-pointer dark:border-white/10 dark:bg-white/5">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploadingFile}
              />
              {uploadingFile ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                  <Loader2 size={18} className="animate-spin" /> Compressing & uploading proof...
                </div>
              ) : proofFile ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <Upload size={16} /> Attached: {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                </div>
              ) : (
                <div className="space-y-1 text-slate-500 dark:text-slate-400">
                  <Upload size={22} className="mx-auto text-slate-400" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click or drag file to upload delivery proof
                  </p>
                  <p className="text-[11px] text-slate-400">Images auto-compressed automatically before upload</p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80 dark:border-white/10 dark:bg-slate-900">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button type="submit" form="deliver-form" disabled={submitting || uploadingFile}>
            <Save size={16} />
            {submitting ? "Transferring..." : "Transfer to Ready For Delivery"}
          </Button>
        </div>
      </div>
    </div>
  );
}
