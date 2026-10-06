// frontend/src/pages/certificate/CertificatePage.tsx
/**
 * PARK — Certificate Page
 * =============================
 * Reached from a pairing's detail view at /pairings/:pairingId/certificate.
 * Three states:
 *   1. Certificate already issued → show it, offer print/save-as-PDF.
 *   2. Not issued, viewer is the supervisor → show the 5-chapter
 *      checklist and a "Confirm Completion" button (disabled until
 *      every chapter is approved).
 *   3. Not issued, viewer is anyone else (student/coordinator/admin) →
 *      show the same checklist, read-only, so everyone can see exactly
 *      what's outstanding without guessing.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useCertificate } from "@/hooks/useCertificate";
import { useChapters } from "@/hooks/useChapters";
import { CertificateView } from "@/components/certificate/CertificateView";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function CertificatePage() {
  const { pairingId } = useParams<{ pairingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    certificate, status, isLoading, error,
    getCompletionStatus, getCertificate, confirmCompletion,
    getApplication, applyForCertificate, reviewApplication,
  } = useCertificate();
  const { getUploadUrl, uploadToCloudinary, uploadProgress, uploadStatus } = useChapters();

  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [application, setApplication] = useState<Awaited<ReturnType<typeof getApplication>>>(null);
  const [finalCopyUrl, setFinalCopyUrl] = useState("");
  const [finalCopyName, setFinalCopyName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewingDecision, setReviewingDecision] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    if (!pairingId) return;
    getCertificate(pairingId).then((cert) => {
      // Only bother checking the checklist if there's no certificate
      // yet — once issued, the checklist is irrelevant.
      if (!cert) getCompletionStatus(pairingId);
    });
    getApplication(pairingId).then(setApplication);
  }, [pairingId]);

  const handleConfirm = async () => {
    if (!pairingId) return;
    setConfirmError(null);
    const result = await confirmCompletion(pairingId);
    if (!result) setConfirmError(error || "Could not issue certificate.");
  };

  const handleApply = async () => {
    if (!pairingId || !finalCopyUrl.trim()) return;
    const result = await applyForCertificate(pairingId, finalCopyUrl.trim());
    if (result) setApplication(result);
  };

  const handleFinalCopyUpload = async (file: File) => {
    setConfirmError(null);
    try {
      const uploadData = await getUploadUrl(file.name, file.type, "final_copy");
      if (!uploadData) return;
      const uploadResult = await uploadToCloudinary(file, uploadData.upload_url, uploadData.params, "final_copy");
      setFinalCopyUrl(uploadResult.secure_url);
      setFinalCopyName(file.name);
    } catch (uploadError) {
      setConfirmError(uploadError instanceof Error ? uploadError.message : "Final-copy upload failed.");
    }
  };

  const handleReview = async (decision: "approved" | "rejected") => {
    if (!pairingId) return;
    setReviewingDecision(decision);
    try {
      const result = await reviewApplication(pairingId, decision, reviewComment.trim() || undefined);
      if (result?.certificate) {
        await getCertificate(pairingId);
        return;
      }
      if (result?.application) setApplication(result.application);
    } finally {
      setReviewingDecision(null);
    }
  };

  if (!pairingId) return null;

  if (isLoading && !certificate && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-sage-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-4 sm:px-6">
      {/* Print styles: hide everything except the certificate itself
          when the browser's print dialog is used — this is what makes
          "Print / Save as PDF" produce a clean single-page certificate
          instead of the whole app shell. */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          html, body { background: white !important; }
          body * { visibility: hidden; }
          #certificate-print-area, #certificate-print-area * { visibility: visible; }
          #certificate-print-area {
            position: relative;
            width: 100%;
            max-width: none;
            margin: 0;
            border-radius: 0;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="mb-4 flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
        <h1 className="font-serif text-xl text-stone-100">Certificate of Completion</h1>
      </div>

      {/* Certificate already issued */}
      {certificate && (
        <div className="space-y-4">
          <CertificateView certificate={certificate} />
          <div className="flex justify-center gap-3 print:hidden">
            <Button onClick={() => window.print()}>
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </Button>
          </div>
          <p className="text-center text-xs text-stone-600 print:hidden">
            Anyone can verify this certificate at{" "}
            <span className="font-mono text-stone-400">/verify/{certificate.certificate_number}</span>
          </p>
        </div>
      )}

      {/* Not yet issued */}
      {!certificate && (
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-center text-sm text-stone-400">
            Submit all chapters and meet all requirements to get your certificate.
          </p>
          {!status && !isLoading && (
            <Card>
              <p className="text-sm text-stone-400">
                Your certificate requirements are being checked. Please try again shortly.
              </p>
              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </Card>
          )}
          {status && (
          <Card>
            <h2 className="mb-1 font-serif text-lg text-stone-100">
              {status.ready ? "All chapters approved" : "Not yet qualified"}
            </h2>
            <p className="mb-4 text-xs text-stone-500">
              {status.ready
                ? user?.role === "student"
                  ? "Submit the complete final project copy for your supervisor's approval."
                  : "A student application is required before you can approve the certificate."
                : user?.role === "supervisor"
                ? "This student is not yet qualified. All five latest chapter versions must be approved before a certificate application can be reviewed."
                : "Every chapter must be approved before the certificate process can begin."}
            </p>

            <div className="space-y-2">
              {status.chapters.map((ch) => (
                <div key={ch.chapter_number} className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2">
                  <span className="text-sm text-stone-300">Chapter {ch.chapter_number}</span>
                  <span
                    className={
                      ch.approved
                        ? "text-xs font-medium text-emerald-400"
                        : ch.submitted
                        ? "text-xs font-medium text-amber-400"
                        : "text-xs text-stone-600"
                    }
                  >
                    {ch.approved ? "✓ Approved" : ch.submitted ? "Awaiting approval" : "Not submitted"}
                  </span>
                </div>
              ))}
            </div>

            {(confirmError || error) && (
              <p className="mt-3 text-xs text-red-400">{confirmError || error}</p>
            )}

            {user?.role === "student" && status.ready && (!application || application.status === "rejected") && (
              <div className="mt-4 space-y-2">
                <label className="block cursor-pointer rounded-lg border border-dashed border-stone-700 bg-stone-900 px-3 py-3 text-sm text-stone-300 hover:border-sage-600">
                  <span>{finalCopyName || "Upload final project copy (PDF only)"}</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleFinalCopyUpload(file);
                    }}
                  />
                </label>
                {uploadStatus === "uploading" && <p className="text-xs text-stone-500">Uploading to Cloudinary... {uploadProgress.toFixed(0)}%</p>}
                {finalCopyUrl && <p className="truncate text-xs text-emerald-400">Final copy uploaded to Cloudinary.</p>}
                <Button onClick={handleApply} isLoading={isLoading} disabled={!finalCopyUrl.trim()} className="w-full">
                  Apply for PARK Certificate
                </Button>
              </div>
            )}
            {application && (
              <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                <p className="text-sm text-stone-300">Certificate application: <span className="capitalize text-sage-400">{application.status}</span></p>
                <a href={application.final_copy_url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-sage-500 hover:underline">View final project copy</a>
                {application.supervisor_comment && <p className="mt-2 text-xs text-stone-400">Supervisor: {application.supervisor_comment}</p>}
              </div>
            )}
            {user?.role === "supervisor" && application?.status === "pending" && (
              <div className="mt-4 space-y-2">
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Optional feedback for the student"
                  rows={3}
                  className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-sage-500/50 focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleReview("rejected")} variant="secondary" isLoading={reviewingDecision === "rejected"} className="flex-1">Reject</Button>
                  <Button onClick={() => handleReview("approved")} isLoading={reviewingDecision === "approved"} className="flex-1">Approve & Issue</Button>
                </div>
              </div>
            )}
            {user?.role === "supervisor" && status.ready && !application && (
              <Button
                onClick={handleConfirm}
                isLoading={isLoading}
                disabled
                className="mt-4 w-full"
              >
                Waiting for student application
              </Button>
            )}
            {user?.role !== "supervisor" && (
              <p className="mt-4 text-center text-xs text-stone-600">
                Only the assigned supervisor can confirm completion.
              </p>
            )}
          </Card>
          )}
        </div>
      )}
    </div>
  );
}
