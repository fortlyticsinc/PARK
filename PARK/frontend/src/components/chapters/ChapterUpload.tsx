import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useChapters } from "@/hooks/useChapters";
import { cn } from "@/lib/utils";

interface ChapterUploadProps {
  pairingId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isResubmit?: boolean;
  previousChapterId?: string;
}

export function ChapterUpload({
  pairingId,
  onSuccess,
  onCancel,
  isResubmit = false,
  previousChapterId,
}: ChapterUploadProps) {
  const {
    getUploadUrl,
    uploadToCloudinary,
    submitChapter,
    resubmitChapter,
    uploadProgress,
    uploadStatus,
    isLoading,
    error,
    resetUpload,
  } = useChapters();

  const [file, setFile] = useState<File | null>(null);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const validateAndSetFile = (f: File) => {
    // Validate MIME type server-side too, but check client-side first
    const allowedTypes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(f.type)) {
      alert("Chapter files must be DOC or DOCX documents.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      alert("File must be under 20MB.");
      return;
    }
    setFile(f);
    resetUpload();
  };

  const handleSubmit = async () => {
    if (!file) return;

    try {
      // Step 1: Get signed upload URL from backend
      const uploadData = await getUploadUrl(file.name, file.type, "chapter");
      if (!uploadData) {
        alert("Failed to get upload URL. Please try again.");
        return;
      }

      // Step 2: Upload directly to Cloudinary
      const uploadResult = await uploadToCloudinary(
        file,
        uploadData.upload_url,
        uploadData.params,
        "chapter",
      );

      // Step 3: Submit chapter metadata to backend
      let savedChapter;
      if (isResubmit && previousChapterId) {
        savedChapter = await resubmitChapter({
          chapter_id: previousChapterId,
          title: title || undefined,
          file_url: uploadResult.secure_url,
          file_public_id: uploadResult.public_id,
          file_size: uploadResult.bytes,
          mime_type: uploadResult.mime_type,
        });
      } else {
        savedChapter = await submitChapter({
          pairing_id: pairingId,
          chapter_number: chapterNumber,
          title: title || undefined,
          file_url: uploadResult.secure_url,
          file_public_id: uploadResult.public_id,
          file_size: uploadResult.bytes,
          mime_type: uploadResult.mime_type,
        });
      }

      if (savedChapter) onSuccess?.();
    } catch (err) {
      // Error handled by hook — uploadStatus becomes "error" or "paused"
      console.error("Upload failed:", err);
    }
  };

  const statusMessages = {
    idle: "Ready to upload",
    uploading: `Uploading... ${uploadProgress.toFixed(0)}%`,
    paused: "Paused — reconnecting...",
    success: "Upload complete!",
    error: "Upload failed — tap to retry",
  };

  return (
    <div className="space-y-5">
      {/* File Drop Zone */}
      {!file && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
            dragActive
              ? "border-sage-500 bg-sage-950/20"
              : "border-stone-700 bg-stone-900/50 hover:border-stone-600 hover:bg-stone-800/50"
          )}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-800">
            <svg className="h-6 w-6 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-300">
            {dragActive ? "Drop your file here" : "Tap to upload your chapter"}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            DOC or DOCX, max 20MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Selected File + Progress */}
      {file && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-800/50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-900/30">
              <svg className="h-5 w-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-200">{file.name}</p>
              <p className="text-xs text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {uploadStatus === "idle" && (
              <button
                onClick={() => { setFile(null); resetUpload(); }}
                className="rounded-md p-1 text-stone-500 hover:bg-stone-700 hover:text-stone-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {uploadStatus !== "idle" && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    uploadStatus === "error" ? "bg-red-600" : "bg-sage-600"
                  )}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-xs",
                  uploadStatus === "error" ? "text-red-400" : "text-stone-500"
                )}>
                  {statusMessages[uploadStatus]}
                </p>
                {uploadStatus === "paused" && (
                  <button
                    onClick={handleSubmit}
                    className="text-xs font-medium text-sage-500 hover:text-sage-400"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chapter Details */}
      {!isResubmit && (
        <Select
          label="Chapter Number"
          value={String(chapterNumber)}
          onChange={(e) => setChapterNumber(Number(e.target.value))}
          options={[
            { value: "1", label: "Chapter 1 — Introduction" },
            { value: "2", label: "Chapter 2 — Literature Review" },
            { value: "3", label: "Chapter 3 — Methodology" },
            { value: "4", label: "Chapter 4 — Results" },
            { value: "5", label: "Chapter 5 — Conclusion" },
          ]}
        />
      )}

      <Input
        label="Chapter Title (Optional)"
        placeholder="e.g. Machine Learning Approaches to Crop Yield Prediction"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        helperText="A clear title helps your supervisor understand your focus."
      />

      {error && (
        <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isLoading || uploadStatus === "uploading"}
          disabled={!file || uploadStatus === "uploading"}
          className="flex-1"
        >
          {isResubmit ? "Resubmit Chapter" : "Submit Chapter"}
        </Button>
      </div>

      {/* Reassurance text */}
      <p className="text-center text-xs text-stone-600">
        Your supervisor will be notified automatically.
      </p>
    </div>
  );
}
