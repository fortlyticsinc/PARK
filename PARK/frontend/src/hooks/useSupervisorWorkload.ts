import { useCallback, useState } from "react";
import { api } from "@/lib/api";

export interface SupervisorWorkload {
  supervisor_id: string;
  supervisor_name: string;
  supervisor_email: string;
  department_id: string | null;
  active_pairings: number;
  pending_chapters: number;
  approved_chapters: number;
  upcoming_meetings: number;
  last_activity_at: string | null;
}

export function useSupervisorWorkload() {
  const [items, setItems] = useState<SupervisorWorkload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await api.get<{ items: SupervisorWorkload[]; total: number }>("/v1/dashboard/supervisor-workload");
    setIsLoading(false);
    if (response.error) {
      setError(response.error.message);
      return;
    }
    setItems(response.data?.items ?? []);
  }, []);

  return { items, isLoading, error, load };
}