/**
 * PARK — Repository Data Layer (Module 5)
 * Matches app/routers/repository.py exactly. This hook was referenced
 * by ProjectDetail.tsx / RepositorySearch.tsx / RepositoryProjectCard.tsx
 * but never actually existed in the codebase — this fills that gap.
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface RepositoryProject {
  id: string;
  title: string;
  student_name: string;
  academic_year: string;
  keywords: string[] | null;
  view_count: number;
  download_count: number;
}

export interface RepositoryProjectDetail extends RepositoryProject {
  student_matric: string;
  supervisor_name: string;
  abstract: string | null;
  department_id: string;
  chapter_count: number;
  final_copy_url: string | null;
}

export interface SearchResults {
  items: RepositoryProject[];
  total: number;
  page: number;
  limit: number;
  query: string | null;
}

export function useRepository() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [projectDetail, setProjectDetail] = useState<RepositoryProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (params?: { q?: string; academic_year?: string; department_id?: string; sort_by?: string; page?: number }) => {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (params?.q) query.set("q", params.q);
      if (params?.academic_year) query.set("academic_year", params.academic_year);
      if (params?.department_id) query.set("department_id", params.department_id);
      if (params?.sort_by) query.set("sort_by", params.sort_by);
      if (params?.page) query.set("page", String(params.page));

      const response = await api.get<SearchResults>(`/v1/repository?${query.toString()}`);

      if (response.error) {
        setError(response.error.message);
        setSearchResults(null);
      } else if (response.data) {
        setSearchResults(response.data);
      }
      setLoading(false);
    },
    []
  );

  const getProject = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);

    const response = await api.get<RepositoryProjectDetail>(`/v1/repository/${projectId}`);

    if (response.error) {
      setError(response.error.message);
      setProjectDetail(null);
    } else if (response.data) {
      setProjectDetail(response.data);
    }
    setLoading(false);
  }, []);

  const getDownloadUrl = useCallback(async (projectId: string) => {
    const response = await api.get<{ download_url: string; expires_in: number }>(
      `/v1/repository/${projectId}/download`
    );
    if (response.error || !response.data) {
      throw new Error(response.error?.message || "Failed to get download link");
    }
    return response.data;
  }, []);

  return { searchResults, projectDetail, loading, error, search, getProject, getDownloadUrl };
}
