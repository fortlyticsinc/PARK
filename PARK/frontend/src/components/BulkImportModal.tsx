import { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { usePairings } from "@/hooks/usePairings";
import { useUsers } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

// Only the fields this component actually displays — shared shape
// between pairings' bulk-import results (pairing_id) and users'
// bulk-import results (user_id), so one table can render either.
interface BulkImportRow {
  row_number: number;
  success: boolean;
  user_id?: string | null;
  pairing_id?: string | null;
  error_message: string | null;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // "pairings" (default) hits /v1/pairings/bulk-import — used on the
  // Pairings page. "users" hits /v1/users/bulk-import — used on the
  // Team page for bulk-adding supervisors/students.
  mode?: "pairings" | "users";
}

export function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "pairings",
}: BulkImportModalProps) {
  const pairingsHook = usePairings();
  const usersHook = useUsers();
  const isLoading = mode === "pairings" ? pairingsHook.isLoading : usersHook.isLoading;
  const bulkImport = mode === "pairings" ? pairingsHook.bulkImport : usersHook.bulkImportUsers;

  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<BulkImportRow[] | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    success: number;
    failure: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    const lower = selected?.name.toLowerCase() || "";
    if (selected && (lower.endsWith(".csv") || lower.endsWith(".xlsx"))) {
      setFile(selected);
      setResults(null);
      setSummary(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const data = await bulkImport(file, setUploadProgress);
    if (data) {
      setResults(data.results);
      setSummary({
        total: data.total_rows,
        success: data.success_count,
        failure: data.failure_count,
      });
      if (data.failure_count === 0) {
        onSuccess?.();
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setSummary(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "pairings" ? "Bulk Import Pairings" : "Bulk Import Users"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {!results && (
            <Button
              onClick={handleUpload}
              isLoading={isLoading}
              disabled={!file}
            >
              {isLoading ? `Uploading ${uploadProgress.toFixed(0)}%` : "Import File"}
            </Button>
          )}
          {results && (
            <Button variant="secondary" onClick={handleReset}>
              Import Another File
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* File Drop Zone */}
        {!file && !results && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed border-stone-700 bg-stone-900/50 p-8",
              "text-center transition-colors hover:border-sage-700/50 hover:bg-stone-800/50"
            )}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-800">
              <svg className="h-6 w-6 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-stone-300">
              Click to upload a CSV or Excel file
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {mode === "pairings"
                ? "Must include: student_email, supervisor_email, department_id, institution_id, academic_year, project_title (optional)"
                : "Must include: email, full_name, role, password, department_id, institution_id (phone, matric_number optional)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Selected File */}
        {file && !results && (
          <div className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-800/50 p-4">
            <svg className="h-8 w-8 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-200">{file.name}</p>
              <p className="text-xs text-stone-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="rounded-md p-1 text-stone-500 hover:bg-stone-700 hover:text-stone-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {isLoading && (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full rounded-full bg-sage-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-center text-xs text-stone-500">
              Uploading and processing... {uploadProgress.toFixed(0)}%
            </p>
          </div>
        )}

        {/* Results Summary */}
        {summary && (
          <div className="rounded-xl border border-stone-700 bg-stone-800/30 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                summary.failure === 0 ? "bg-emerald-900/40" : "bg-sage-900/40"
              )}>
                <svg className={cn("h-5 w-5", summary.failure === 0 ? "text-emerald-400" : "text-sage-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={summary.failure === 0 
                    ? "M5 13l4 4L19 7" 
                    : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
                </svg>
              </div>
              <div>
                <p className="font-medium text-stone-200">
                  {summary.success} of {summary.total} {mode === "pairings" ? "pairings" : "users"} imported
                </p>
                <p className="text-xs text-stone-500">
                  {summary.failure > 0 
                    ? `${summary.failure} rows failed — see details below`
                    : "All rows imported successfully"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Per-Row Results Table */}
        {results && (
          <div className="max-h-64 overflow-auto rounded-lg border border-stone-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-900">
                <tr className="border-b border-stone-800">
                  <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Row</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {results.map((result) => (
                  <tr key={result.row_number} className={result.success ? "bg-emerald-950/10" : "bg-red-950/10"}>
                    <td className="px-3 py-2 text-stone-400">{result.row_number}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        result.success ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"
                      )}>
                        {result.success ? "Imported" : "Failed"}
                      </span>
                    </td>
                    <td className={cn("px-3 py-2 text-xs", result.success ? "text-emerald-300" : "text-red-300")}>
                      {result.success ? "Account created successfully" : result.error_message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
