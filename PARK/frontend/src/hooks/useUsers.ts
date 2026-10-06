// frontend/src/hooks/useUsers.ts
/**
 * PARK — Staff/User Management Hook
 * Used by the Team page: admins creating coordinators, coordinators
 * creating supervisors, and listing/searching the department roster.
 * Also powers CSV/XLSX bulk import of users.
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface StaffUser {
  id: string;
  email: string;
  role: "student" | "supervisor" | "coordinator" | "admin";
  full_name: string | null;
  department_id: string | null;
  institution_id: string | null;
  phone: string | null;
  matric_number: string | null;
  is_active: boolean;
}

export interface PaginatedUsers {
  items: StaffUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface BulkImportResult {
  row_number: number;
  success: boolean;
  user_id: string | null;
  error_code: string | null;
  error_message: string | null;
}

export function useUsers() {
  const [users, setUsers] = useState<PaginatedUsers | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listUsers = useCallback(
    async (params?: { role?: string; department_id?: string; search?: string; active_only?: boolean; page?: number; limit?: number }) => {
      setIsLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (params?.role) query.set("role", params.role);
      if (params?.department_id) query.set("department_id", params.department_id);
      if (params?.search) query.set("search", params.search);
      if (params?.active_only !== undefined) query.set("active_only", String(params.active_only));
      query.set("page", String(params?.page ?? 1));
      query.set("limit", String(params?.limit ?? 20));

      const res = await api.get<PaginatedUsers>(`/v1/users?${query.toString()}`);
      if (res.error) { setError(res.error.message); setUsers(null); }
      else if (res.data) setUsers(res.data);
      setIsLoading(false);
    },
    []
  );

  const createUser = useCallback(
    async (data: {
      email: string; full_name: string; role: "student" | "supervisor" | "coordinator" | "admin";
      password: string;
      phone?: string; matric_number?: string; department_id: string; institution_id: string;
    }) => {
      setIsLoading(true);
      setError(null);
      const res = await api.post<{ user: StaffUser }>("/v1/users", data);
      setIsLoading(false);
      if (res.error) { setError(res.error.message); return null; }
      return res.data?.user ?? null;
    },
    []
  );

  const updateUser = useCallback(
    async (id: string, data: { full_name?: string; phone?: string; department_id?: string; is_active?: boolean }) => {
      // NOTE: api.ts has no `put` method, only get/post/patch/delete —
      // user updates are partial, so PATCH is the correct verb anyway.
      const res = await api.patch<{ user: StaffUser }>(`/v1/users/${id}`, data);
      if (res.error) { setError(res.error.message); return null; }
      return res.data?.user ?? null;
    },
    []
  );

  const setUserActivation = useCallback(async (id: string, isActive: boolean) => {
    const res = await api.patch<{ user: StaffUser }>(`/v1/users/${id}/activation`, { is_active: isActive });
    if (res.error) { setError(res.error.message); return null; }
    return res.data?.user ?? null;
  }, []);

  const bulkImportUsers = useCallback(
    async (file: File, onProgress?: (progress: number) => void) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.uploadFile<{ job_id: string }>("/v1/users/bulk-import", file, onProgress);
        if (res.error || !res.data?.job_id) {
          setError(res.error?.message || "Could not start the import job.");
          return null;
        }

        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const status = await api.get<{
            status: "queued" | "processing" | "completed" | "failed";
            result?: { total_rows: number; success_count: number; failure_count: number; results: BulkImportResult[] };
            error_message?: string;
          }>(`/v1/users/bulk-import/jobs/${res.data.job_id}`);
          if (status.error || !status.data) {
            setError(status.error?.message || "Could not read the import job status.");
            return null;
          }
          if (status.data.status === "failed") {
            setError(status.data.error_message || "The import job failed.");
            return null;
          }
          if (status.data.status === "completed") {
            if (!status.data.result) {
              setError("The import job completed without a result.");
              return null;
            }
            return status.data.result;
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { users, isLoading, error, listUsers, createUser, updateUser, setUserActivation, bulkImportUsers };
}
