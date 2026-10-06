// frontend/src/hooks/useLookups.ts
/**
 * PARK — Institutions & Departments Hook
 * Thin wrapper around /v1/institutions and /v1/departments.
 * Both endpoints are public reads (see lookups.py), so this hook
 * works even before login — signup page reuses it too.
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface Institution {
  id: string;
  name: string;
  code: string | null;
  academic_session: string | null;
}

export interface Department {
  id: string;
  institution_id: string;
  name: string;
  code: string | null;
  coordinator_id: string | null;
}

export function useLookups() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listInstitutions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await api.get<{ institutions: Institution[] }>("/v1/institutions");
    if (res.error) setError(res.error.message);
    else if (res.data) setInstitutions(res.data.institutions);
    setIsLoading(false);
  }, []);

  const listDepartments = useCallback(async (institutionId?: string) => {
    setIsLoading(true);
    setError(null);
    const query = institutionId ? `?institution_id=${institutionId}` : "";
    const res = await api.get<{ departments: Department[] }>(`/v1/departments${query}`);
    if (res.error) setError(res.error.message);
    else if (res.data) setDepartments(res.data.departments);
    setIsLoading(false);
  }, []);

  const updateAcademicSession = useCallback(async (institutionId: string, academicSession: string) => {
    setError(null);
    const res = await api.patch<{ institution: Institution }>(
      `/v1/institutions/${institutionId}/academic-session`,
      { academic_session: academicSession },
    );
    if (res.error) { setError(res.error.message); return null; }
    return res.data?.institution ?? null;
  }, []);

  const createDepartment = useCallback(async (data: { institution_id: string; name: string; code?: string }) => {
    const res = await api.post<{ department: Department }>("/v1/departments", data);
    if (res.error) { setError(res.error.message); return null; }
    return res.data?.department ?? null;
  }, []);

  return {
    institutions, departments, isLoading, error,
    listInstitutions, listDepartments, updateAcademicSession, createDepartment,
  };
}
