"use client";

import { CheckCircle2, FileUp, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";

type FileUploadProps = {
  label: string;
  moduleName: string;
  fileCategory?: string;
  accept?: string;
  required?: boolean;
  existingFile?: {
    id: string; // FileStorage ID or RegistrationFile ID
    fileName: string;
    url?: string;
    size?: number;
  };
  onUploadComplete: (fileStorageId: string) => void;
  onRemove: () => void;
};

export function FileUpload({
  label,
  moduleName,
  accept,
  required,
  existingFile,
  onUploadComplete,
  onRemove,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setError("");
      setSuccess(false);
      setUploading(true);
      setProgress(10); // Start progress

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("module", moduleName);

        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
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

        setProgress(100);
        setSuccess(true);
        onUploadComplete(data.id);
      } catch (err: any) {
        setError(err.message || "An error occurred during upload.");
        setFile(null);
      } finally {
        setUploading(false);
      }
    },
    [moduleName, onUploadComplete]
  );

  const handleRemove = () => {
    setFile(null);
    setSuccess(false);
    setError("");
    setProgress(0);
    onRemove();
  };

  const handleReplace = () => {
    handleRemove();
  };

  if (existingFile && !file) {
    return (
      <div className="grid gap-2">
        <span className="text-sm font-bold">{label}</span>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--border) bg-white/70 px-4 py-3 text-sm font-semibold text-blue-700 dark:bg-white/5 dark:text-blue-200">
          <span className="grid min-w-0 gap-1">
            <span className="truncate">{existingFile.fileName}</span>
          </span>
          <div className="flex gap-2">
            {existingFile.url || existingFile.id ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const targetUrl = existingFile.url && !existingFile.url.startsWith("http")
                    ? existingFile.url
                    : `/api/files/${existingFile.id}/view`;
                  window.open(targetUrl, "_blank");
                }}
                type="button"
              >
                Preview
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={handleReplace} type="button">
              <RefreshCw size={16} /> Replace
            </Button>
            <Button variant="danger" size="sm" onClick={onRemove} type="button">
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-bold">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      
      {!file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 transition-colors hover:bg-blue-50 hover:border-blue-400 dark:border-blue-500/30 dark:bg-blue-500/5 dark:hover:bg-blue-500/10">
          <FileUp className="mb-2 text-blue-500" size={24} />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Click to select or drag and drop
          </span>
          <span className="mt-1 text-xs text-soft">
            Supported files: JPG, PNG, WEBP, PDF, DOCX, XLSX
          </span>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            required={required && !file && !existingFile}
          />
        </label>
      ) : (
        <div className="rounded-2xl border border-(--border) bg-white/70 p-4 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-(--text)">
                {file.name}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30">
                <div
                  className={`h-full transition-all duration-300 ${
                    success ? "bg-emerald-500" : error ? "bg-rose-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {!uploading && (
              <Button variant="ghost" size="icon" onClick={handleRemove} type="button">
                <Trash2 size={16} className="text-rose-500" />
              </Button>
            )}
          </div>
          
          <div className="mt-2 flex items-center gap-2 text-xs">
            {uploading && (
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 size={12} className="animate-spin" /> Uploading...
              </span>
            )}
            {success && (
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 size={12} /> Uploaded successfully
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 font-semibold text-rose-600">
                <XCircle size={12} /> {error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
