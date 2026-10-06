import { useCallback, useState } from "react";
import { api } from "@/lib/api";

export interface DepartmentGuideline {
  id: string;
  department_id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: string | null;
  updated_at: string | null;
}

export function useGuideline() {
  const [guideline, setGuideline] = useState<DepartmentGuideline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGuideline = useCallback(async () => {
    setIsLoading(true);
    const response = await api.get<{ guideline: DepartmentGuideline | null }>("/v1/guidelines/mine");
    if (response.error) setError(response.error.message);
    else setGuideline(response.data?.guideline ?? null);
    setIsLoading(false);
  }, []);

  const uploadGuideline = useCallback(async (departmentId: string, file: File) => {
    setIsLoading(true);
    setError(null);
    const response = await api.uploadFile<{ guideline: DepartmentGuideline }>(
      `/v1/guidelines/${departmentId}`,
      file,
    );
    if (response.error) {
      setError(response.error.message);
      setIsLoading(false);
      return null;
    }
    const next = response.data?.guideline ?? null;
    setGuideline(next);
    setIsLoading(false);
    return next;
  }, []);

  return { guideline, isLoading, error, loadGuideline, uploadGuideline };
}
