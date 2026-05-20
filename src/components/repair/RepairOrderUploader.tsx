"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { uploadRepairMedia, isAcceptedRepairFile } from "@/lib/firebase/storage";

interface RepairOrderUploaderProps {
  shopId: string;
  customerId: string;
  repairOrderId: string;
  uploadedBy: string;
  orderLabel?: string;
  onUploaded?: () => void;
}

export function RepairOrderUploader({
  shopId,
  customerId,
  repairOrderId,
  uploadedBy,
  orderLabel,
  onUploaded,
}: RepairOrderUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setError("");
    setSuccess("");
    setUploading(true);

    const rejected: string[] = [];
    let uploaded = 0;

    try {
      for (const file of Array.from(files)) {
        if (!isAcceptedRepairFile(file)) {
          rejected.push(file.name);
          continue;
        }
        await uploadRepairMedia(
          shopId,
          customerId,
          repairOrderId,
          file,
          uploadedBy,
          caption || undefined
        );
        uploaded += 1;
      }

      if (uploaded === 0) {
        setError(
          rejected.length
            ? `Could not upload: ${rejected.join(", ")}. Use images, videos, or PDFs under 50 MB.`
            : "No valid files selected."
        );
      } else {
        setSuccess(
          uploaded === 1
            ? "File uploaded."
            : `${uploaded} files uploaded.`
        );
        setCaption("");
        onUploaded?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-4">
      {orderLabel && (
        <p className="text-sm font-medium text-slate-700">
          Upload to <span className="text-blue-600">{orderLabel}</span>
        </p>
      )}
      <p className="text-xs text-slate-500">
        Photos, videos, or PDF job cards (max 50 MB each)
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Caption (optional)
        </label>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="e.g. Brake inspection — before"
          disabled={uploading}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf,.pdf"
        className="hidden"
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Choose files"}
        </Button>
      </div>

      <FormFeedback error={error} success={success} />
    </div>
  );
}
