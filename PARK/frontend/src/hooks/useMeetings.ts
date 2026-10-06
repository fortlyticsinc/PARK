// frontend/src/hooks/useMeetings.ts
/**
 * PARK — Meetings Hook (redesigned)
 * =======================================
 * Meetings are now SCHEDULED by a supervisor for their whole cohort
 * (or one student), not logged after the fact. Every create/update
 * must respect a 24-hour minimum notice window — enforced by the
 * backend, mirrored here client-side so the UI can warn before submit
 * instead of only after a failed request.
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export const MIN_NOTICE_HOURS = 24;

export interface Meeting {
  id: string;
  supervisor_id: string;
  supervisor_name: string;
  pairing_id: string | null;
  student_name: string | null;
  scheduled_at: string;
  venue: string;
  agenda: string;
  meeting_type: "physical" | "virtual" | "phone";
  duration_minutes: number | null;
  is_upcoming: boolean;
  created_at: string;
}

export interface PaginatedMeetings {
  items: Meeting[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface InactivityFlag {
  pairing_id: string;
  student_id: string;
  supervisor_id: string;
  days_since_meeting: number | null;
  last_meeting_date: string | null;
}

// Earliest a meeting can legally be scheduled — used to set the `min`
// attribute on the datetime picker so users can't even select an
// invalid time, rather than finding out only after clicking submit.
export function earliestAllowedMeetingTime(): Date {
  return new Date(Date.now() + MIN_NOTICE_HOURS * 60 * 60 * 1000);
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<PaginatedMeetings | null>(null);
  const [flags, setFlags] = useState<InactivityFlag[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listMeetings = useCallback(
    async (params?: { pairing_id?: string; page?: number; limit?: number; upcoming_only?: boolean }) => {
      setIsLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (params?.pairing_id) query.set("pairing_id", params.pairing_id);
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.upcoming_only) query.set("upcoming_only", "true");

      const response = await api.get<PaginatedMeetings>(`/v1/meetings?${query.toString()}`);

      if (response.error) {
        setError(response.error.message);
        setMeetings(null);
      } else if (response.data) {
        setMeetings(response.data);
      }
      setIsLoading(false);
    },
    []
  );

  const scheduleMeeting = useCallback(
    async (data: {
      scheduled_at: string; // ISO string
      venue: string;
      agenda: string;
      meeting_type: "physical" | "virtual" | "phone";
      duration_minutes?: number;
      pairing_id?: string; // omit to broadcast to the whole cohort
    }) => {
      setIsLoading(true);
      setError(null);

      const response = await api.post<{ meeting: Meeting }>("/v1/meetings", data);

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }
      return response.data?.meeting ?? null;
    },
    []
  );

  const updateMeeting = useCallback(
    async (
      meetingId: string,
      data: { venue?: string; agenda?: string; duration_minutes?: number; scheduled_at?: string }
    ) => {
      setIsLoading(true);
      setError(null);
      // api.ts only exposes get/post/patch/delete (no `put`) — and this
      // is a partial update anyway, so PATCH is correct here.
      const response = await api.patch<{ meeting: Meeting }>(`/v1/meetings/${meetingId}`, data);
      setIsLoading(false);
      if (response.error) {
        setError(response.error.message);
        return null;
      }
      return response.data?.meeting ?? null;
    },
    []
  );

  const getInactivityFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await api.get<{ flags: InactivityFlag[]; count: number }>("/v1/meetings/flags/inactivity");

    setIsLoading(false);

    if (response.error) {
      setError(response.error.message);
      setFlags(null);
      return null;
    }
    if (response.data) {
      setFlags(response.data.flags);
      return response.data.flags;
    }
    return null;
  }, []);

  return {
    meetings, flags, isLoading, error,
    listMeetings, scheduleMeeting, updateMeeting, getInactivityFlags,
  };
}
