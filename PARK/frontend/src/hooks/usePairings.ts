// frontend/src/hooks/usePairings.ts
/**
 * PARK — Module 1: Pairing Data Hook
 * Encapsulates all pairing API calls with loading/error states.
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export interface Pairing {
  id: string;
  student_name: string;
  student_matric: string | null;
  supervisor_name: string;
  project_title: string | null;
  status: "active" | "completed" | "suspended";
  academic_year: string;
  chapter_count: number;
  last_meeting_date: string | null;
  created_at: string;
}

export interface PaginatedPairings {
  items: Pairing[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface BulkImportResult {
  row_number: number;
  success: boolean;
  pairing_id: string | null;
  error_code: string | null;
  error_message: string | null;
}

export function usePairings() {
  const [pairings, setPairings] = useState<PaginatedPairings | null>(null);
  const [currentPairing, setCurrentPairing] = useState<Pairing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkImportResult[] | null>(null);

  const listPairings = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      academic_year?: string;
      status?: string;
      search?: string;
    }) => {
      setIsLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.academic_year) query.set("academic_year", params.academic_year);
      if (params?.status) query.set("status", params.status);
      if (params?.search) query.set("search", params.search);

      const response = await api.get<PaginatedPairings>(
        `/v1/pairings?${query.toString()}`
      );

      if (response.error) {
        setError(response.error.message);
        setPairings(null);
      } else if (response.data) {
        setPairings(response.data);
      }

      setIsLoading(false);
    },
    []
  );

  const getPairing = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    const response = await api.get<{ pairing: Pairing }>(`/v1/pairings/${id}`);

    if (response.error) {
      setError(response.error.message);
      setCurrentPairing(null);
    } else if (response.data) {
      setCurrentPairing((response.data as unknown as { pairing: Pairing }).pairing);
    }

    setIsLoading(false);
  }, []);

  const createPairing = useCallback(
    async (data: {
      student_id: string;
      supervisor_id: string;
      department_id: string;
      institution_id: string;
      academic_year: string;
      project_title?: string;
    }) => {
      setIsLoading(true);
      setError(null);

      const response = await api.post<{ pairing: Pairing }>("/v1/pairings", data);

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return response.data as unknown as Pairing;
    },
    []
  );

  const updatePairing = useCallback(
    async (
      id: string,
      data: { project_title?: string; status?: "active" | "completed" | "suspended" }
    ) => {
      setIsLoading(true);
      setError(null);

      const response = await api.patch<{ pairing: Pairing }>(
        `/v1/pairings/${id}`,
        data
      );

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return response.data as unknown as Pairing;
    },
    []
  );

  const deletePairing = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    const response = await api.delete(`/v1/pairings/${id}`);

    setIsLoading(false);

    if (response.error) {
      setError(response.error.message);
      return false;
    }

    return true;
  }, []);

  const bulkImport = useCallback(
    async (file: File, onProgress?: (progress: number) => void) => {
      setIsLoading(true);
      setError(null);
      setBulkResults(null);

      const response = await api.uploadFile<{
        total_rows: number;
        success_count: number;
        failure_count: number;
        results: BulkImportResult[];
      }>("/v1/pairings/bulk-import", file, onProgress);

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      if (response.data) {
        setBulkResults(response.data.results);
      }

      return response.data;
    },
    []
  );

  return {
    pairings,
    currentPairing,
    isLoading,
    error,
    bulkResults,
    listPairings,
    getPairing,
    createPairing,
    updatePairing,
    deletePairing,
    bulkImport,
  };
}
