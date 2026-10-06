// frontend/src/pages/verify/VerifyCertificatePage.tsx
/**
 * PARK — Public Certificate Verification
 * =============================================
 * No login required — matches the public repository pattern. Anyone
 * holding a printed certificate can type its number here (or follow a
 * printed link/QR code in future) and confirm it's genuine. Route:
 * /verify/:certificateNumber (also reachable via a bare /verify with a
 * search box, for someone typing the number in manually).
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCertificate, CertificateVerification } from "@/hooks/useCertificate";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function VerifyCertificatePage() {
  const { certificateNumber: routeNumber } = useParams<{ certificateNumber?: string }>();
  const { verifyCertificate, isLoading, error } = useCertificate();

  const [inputValue, setInputValue] = useState(routeNumber || "");
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [searched, setSearched] = useState(false);

  const runVerify = async (number: string) => {
    if (!number.trim()) return;
    setSearched(true);
    const res = await verifyCertificate(number.trim());
    setResult(res);
  };

  useEffect(() => {
    if (routeNumber) runVerify(routeNumber);
  }, [routeNumber]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-950 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-serif text-2xl text-sage-500">PARK</p>
          <p className="mt-1 text-sm text-stone-500">Verify a Certificate of Completion</p>
        </div>

        <Card className="space-y-3">
          <Input
            label="Certificate Number"
            placeholder="e.g. PARK-2025-CSC-0007"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button onClick={() => runVerify(inputValue)} isLoading={isLoading} className="w-full">
            Verify
          </Button>
        </Card>

        {searched && !isLoading && (
          <div className="mt-6">
            {result ? (
              <Card className="border-emerald-800/40 bg-emerald-950/10">
                <div className="mb-3 flex items-center gap-2 text-emerald-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold">Genuine PARK Certificate</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-stone-500">Student:</span> <span className="text-stone-200">{result.student_name}</span></p>
                  <p><span className="text-stone-500">Project:</span> <span className="text-stone-200">{result.project_title}</span></p>
                  <p><span className="text-stone-500">Department:</span> <span className="text-stone-200">{result.department_name}</span></p>
                  <p><span className="text-stone-500">Institution:</span> <span className="text-stone-200">{result.institution_name}</span></p>
                  <p><span className="text-stone-500">Academic Year:</span> <span className="text-stone-200">{result.academic_year}</span></p>
                  <p><span className="text-stone-500">Issued:</span> <span className="text-stone-200">{new Date(result.issued_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</span></p>
                </div>
              </Card>
            ) : (
              <Card className="border-red-900/40 bg-red-950/10 text-center">
                <p className="text-sm text-red-300">{error || "No certificate found with that number."}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
