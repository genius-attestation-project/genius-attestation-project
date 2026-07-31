"use client";

import { CheckCircle2, FileUp, Loader2, Plus, RefreshCw, Trash2, XCircle, Eye, Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";

export type ExistingFileItem = {
  id: string; // RegistrationFile ID or FileStorage ID
  fileName: string;
  url?: string;
  size?: number;
  uploadedAt?: string | Date;
};

export type MultiFileUploadProps = {
  label: string;
  moduleName: string;
  fileCategory?: string;
  accept?: string;
  required?: boolean;
  existingFiles?: ExistingFileItem[];
  onFilesChange: (fileStorageIds: string[]) => void;
  onRemoveExistingFile?: (fileId: string) => void;
};

type UploadSlot = {
  slotId: string;
  fileStorageId: string | null;
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string;
  success: boolean;
};

export function MultiFileUpload({
  label,
  moduleName,
  accept = ".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx",
  required = false,
  existingFiles = [],
  onFilesChange,
  onRemoveExistingFile,
}: MultiFileUploadProps) {
  const [slots, setSlots] = useState<UploadSlot[]>([
    {
      slotId: "slot-initial-1",
      fileStorageId: null,
      file: null,
      uploading: false,
      progress: 0,
      error: "",
      success: false,
    },
  ]);

  const updateSlotsState = (newSlots: UploadSlot[]) => {
    setSlots(newSlots);
    const validIds = newSlots
      .map((s) => s.fileStorageId)
      .filter((id): id is string => Boolean(id));
    onFilesChange(validIds);
  };

  const handleFileChange = async (
    slotId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Update slot to uploading state
    setSlots((prev) =>
      prev.map((s) =>
        s.slotId === slotId
          ? {
              ...s,
              file: selectedFile,
              uploading: true,
              progress: 10,
              error: "",
              success: false,
            }
          : s
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("module", moduleName);

      const progressInterval = setInterval(() => {
        setSlots((prev) =>
          prev.map((s) =>
            s.slotId === slotId ? { ...s, progress: Math.min(90, s.progress + 10) } : s
          )
        );
      }, 100);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setSlots((prev) => {
        const updated = prev.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                fileStorageId: data.id,
                uploading: false,
                progress: 100,
                success: true,
              }
            : s
        );
        const validIds = updated
          .map((s) => s.fileStorageId)
          .filter((id): id is string => Boolean(id));
        onFilesChange(validIds);
        return updated;
      });
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                file: null,
                fileStorageId: null,
                uploading: false,
                progress: 0,
                error: err.message || "Upload error",
              }
            : s
        )
      );
    }
  };

  const handleAddField = () => {
    const newSlotId = `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSlots: UploadSlot[] = [
      ...slots,
      {
        slotId: newSlotId,
        fileStorageId: null,
        file: null,
        uploading: false,
        progress: 0,
        error: "",
        success: false,
      },
    ];
    setSlots(newSlots);
  };

  const handleRemoveSlot = (slotId: string) => {
    const filtered = slots.filter((s) => s.slotId !== slotId);
    // If filtered becomes empty and no existing files, maintain at least 1 slot
    if (filtered.length === 0 && existingFiles.length === 0) {
      const resetSlot: UploadSlot = {
        slotId: `slot-${Date.now()}`,
        fileStorageId: null,
        file: null,
        uploading: false,
        progress: 0,
        error: "",
        success: false,
      };
      updateSlotsState([resetSlot]);
    } else {
      updateSlotsState(filtered.length === 0 ? [] : filtered);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      </div>

      {/* Previously Uploaded Files Section */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Uploaded Files ({existingFiles.length})
          </span>
          <div className="grid gap-2">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs dark:border-white/10 dark:bg-white/5"
              >
                <span className="font-semibold text-blue-700 dark:text-blue-300 truncate max-w-xs sm:max-w-md">
                  {file.fileName}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const targetUrl =
                        file.url && !file.url.startsWith("http")
                          ? file.url
                          : `/api/registrations/files/${file.id}`;
                      window.open(targetUrl, "_blank");
                    }}
                    type="button"
                  >
                    <Eye size={14} className="mr-1" /> Preview
                  </Button>
                  {onRemoveExistingFile && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onRemoveExistingFile(file.id)}
                      type="button"
                    >
                      <Trash2 size={14} /> Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Upload Boxes */}
      <div className="space-y-3">
        {slots.map((slot, index) => {
          const canDeleteSlot =
            slots.length > 1 || existingFiles.length > 0 || slot.file !== null;

          return (
            <div key={slot.slotId} className="flex items-start gap-2">
              <div className="flex-1">
                {!slot.file ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-5 transition-all hover:bg-blue-50 hover:border-blue-400 dark:border-blue-500/30 dark:bg-blue-500/5 dark:hover:bg-blue-500/10">
                    <FileUp className="mb-1.5 text-blue-500" size={22} />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Click to select or drag and drop
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                      Supported files: JPG, PNG, WEBP, PDF, DOCX, XLSX
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept={accept}
                      onChange={(e) => handleFileChange(slot.slotId, e)}
                    />
                  </label>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {slot.file.name}
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <div
                            className={`h-full transition-all duration-300 ${
                              slot.success
                                ? "bg-emerald-500"
                                : slot.error
                                ? "bg-rose-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${slot.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {slot.uploading && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Loader2 size={12} className="animate-spin" /> Uploading...
                        </span>
                      )}
                      {slot.success && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <CheckCircle2 size={12} /> Uploaded successfully
                        </span>
                      )}
                      {slot.error && (
                        <span className="flex items-center gap-1 font-semibold text-rose-600">
                          <XCircle size={12} /> {slot.error}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Remove Field Button */}
              {canDeleteSlot && (
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(slot.slotId)}
                  className="mt-3.5 rounded-full p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Remove Upload Box"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add More Files (+) Button */}
      <div className="flex items-center pt-1">
        <button
          type="button"
          onClick={handleAddField}
          className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all group"
          title="Add More Files"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 group-hover:scale-105 transition-all active:scale-95">
            <Plus size={18} />
          </div>
          <span>Add More Files</span>
        </button>
      </div>
    </div>
  );
}
