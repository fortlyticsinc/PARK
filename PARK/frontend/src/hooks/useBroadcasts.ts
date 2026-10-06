/**
 * PARK — Broadcasts Data Layer
 * Matches app/routers/broadcast.py. Supervisors post; students read
 * broadcasts from their own active supervisor(s).
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface BroadcastMessage {
  id: string;
  supervisor_id: string;
  supervisor_name: string;
  content: string;
  created_at: string;
}

export function useBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listBroadcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await api.get<{ items: BroadcastMessage[] }>("/v1/broadcasts");
    if (response.error) {
      setError(response.error.message);
    } else if (response.data) {
      setBroadcasts(response.data.items);
    }
    setIsLoading(false);
  }, []);

  const sendBroadcast = useCallback(async (content: string) => {
    const response = await api.post<{ broadcast: BroadcastMessage }>("/v1/broadcasts", { content });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data?.broadcast;
  }, []);

  return { broadcasts, isLoading, error, listBroadcasts, sendBroadcast };
}
