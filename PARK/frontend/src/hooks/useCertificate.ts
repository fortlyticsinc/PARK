// frontend/src/hooks/useCertificate.ts
/**
 * PARK — Certificate Hook
 * ============================
 * Powers the "PARK Approved" certificate flow: checking readiness,
 * confirming completion (supervisor-only action), fetching an issued
 * certificate, and public verification by certificate number.
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface Certificate {
  id: string;
  pairing_id: string;
  certificate_number: string;
  student_name: string;
  student_matric: string | null;
  supervisor_name: string;
  department_name: string;
  institution_name: string;
  project_title: string;
  academic_year: string;
  issued_at: string;
}

export interface CompletionChecklistItem {
  chapter_number: number;
  submitted: boolean;
  approved: boolean;
}

export interface CompletionStatus {
  ready: boolean;
  chapters: CompletionChecklistItem[];
  already_certified: boolean;
}

export interface CertificateApplication {
  id: string;
  pairing_id: string;
  final_copy_url: string;
  status: "pending" | "approved" | "rejected";
  supervisor_comment: string | null;
  applied_at: string;
  reviewed_at: string | null;
}

export interface CertificateVerification {
  certificate_number: string;
  student_name: string;
  project_title: string;
  department_name: string;
  institution_name: string;
  academic_year: string;
  issued_at: string;
  valid: boolean;
}

export function useCertificate() {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [status, setStatus] = useState<CompletionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApplication = useCallback(async (pairingId: string) => {
    const res = await api.get<{ application: CertificateApplication | null }>(
      `/v1/pairings/${pairingId}/certificate/application`
    );
    if (res.error) { setError(res.error.message); return null; }
    return res.data?.application ?? null;
  }, []);

  const applyForCertificate = useCallback(async (pairingId: string, finalCopyUrl: string) => {
    setIsLoading(true);
    setError(null);
    const res = await api.post<{ application: CertificateApplication }>(
      `/v1/pairings/${pairingId}/certificate/application`, { final_copy_url: finalCopyUrl }
    );
    setIsLoading(false);
    if (res.error) { setError(res.error.message); return null; }
    return res.data?.application ?? null;
  }, []);

  const reviewApplication = useCallback(async (pairingId: string, status: "approved" | "rejected", comment?: string) => {
    setIsLoading(true);
    setError(null);
    const res = await api.patch<{ certificate?: Certificate; application?: CertificateApplication }>(
      `/v1/pairings/${pairingId}/certificate/application`, { status, comment }
    );
    setIsLoading(false);
    if (res.error) { setError(res.error.message); return null; }
    return res.data ?? null;
  }, []);

  const getCompletionStatus = useCallback(async (pairingId: string) => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<CompletionStatus>(`/v1/pairings/${pairingId}/certificate/status`);
    setIsLoading(false);
    if (res.error) { setError(res.error.message); setStatus(null); return null; }
    setStatus(res.data ?? null);
    return res.data ?? null;
  }, []);

  const getCertificate = useCallback(async (pairingId: string) => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<{ certificate: Certificate }>(`/v1/pairings/${pairingId}/certificate`);
    setIsLoading(false);
    if (res.error) {
      // Not-yet-issued is an expected state, not a real error — don't
      // surface it as one to the caller's error banner.
      if (res.error.code !== "NOT_FOUND") setError(res.error.message);
      setCertificate(null);
      return null;
    }
    setCertificate(res.data?.certificate ?? null);
    return res.data?.certificate ?? null;
  }, []);

  const confirmCompletion = useCallback(async (pairingId: string) => {
    setIsLoading(true);
    setError(null);
    const res = await api.post<{ certificate: Certificate }>(`/v1/pairings/${pairingId}/certificate/confirm`, {});
    setIsLoading(false);
    if (res.error) { setError(res.error.message); return null; }
    setCertificate(res.data?.certificate ?? null);
    return res.data?.certificate ?? null;
  }, []);

  const verifyCertificate = useCallback(async (certificateNumber: string) => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<CertificateVerification>(`/v1/certificates/verify/${encodeURIComponent(certificateNumber)}`);
    setIsLoading(false);
    if (res.error) { setError(res.error.message); return null; }
    return res.data ?? null;
  }, []);

  return {
    certificate, status, isLoading, error,
    getCompletionStatus, getCertificate, confirmCompletion, verifyCertificate,
    getApplication, applyForCertificate, reviewApplication,
  };
}
