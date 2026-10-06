/**
 * PARK — Dashboard Data Layer (Module 6)
 * Coordinator-only, cached aggregates.
 *
 * Fixed during the build-and-fix pass: state setters were being
 * handed the whole ApiResponse<T> wrapper instead of response.data
 * (so `overview` would have held {data, error} instead of the actual
 * stats). Also: api.get()/post() never throw — they catch internally
 * and return {error} — so the try/catch here was dead code that could
 * never actually surface a failed request; errors are checked via
 * response.error now, matching every other hook in the app.
 *
 * sendSMSBlast removed entirely — /v1/dashboard/sms-blast no longer
 * exists on the backend (see the Brevo weekly-digest pivot).
 */
import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface DashboardOverview {
  total_pairings: number;
  active_pairings: number;
  at_risk_pairings: number;
  completed_pairings: number;
  total_students: number;
  total_supervisors: number;
  chapters_submitted_this_week: number;
  chapters_approved_this_week: number;
  pending_reviews: number;
  meetings_logged_this_week: number;
  messages_sent_this_week: number;
  last_updated: string;
}

export interface AtRiskPairing {
  pairing_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  supervisor_name: string;
  supervisor_email: string;
  supervisor_phone: string | null;
  days_since_last_meeting: number;
  last_meeting_date: string | null;
  current_chapter: number;
  chapter_status: string;
}

export function useDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [atRisk, setAtRisk] = useState<{ items: AtRiskPairing[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async (params?: { department_id?: string; institution_id?: string }) => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (params?.department_id) query.set("department_id", params.department_id);
    if (params?.institution_id) query.set("institution_id", params.institution_id);

    const response = await api.get<DashboardOverview>(`/v1/dashboard/overview?${query}`);

    if (response.error) {
      setError(response.error.message);
      setOverview(null);
    } else if (response.data) {
      setOverview(response.data);
    }
    setLoading(false);
  }, []);

  const fetchAtRisk = useCallback(async (params?: { department_id?: string; limit?: number }) => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (params?.department_id) query.set("department_id", params.department_id);
    if (params?.limit) query.set("limit", String(params.limit));

    const response = await api.get<{ items: AtRiskPairing[]; total: number }>(`/v1/dashboard/at-risk?${query}`);

    if (response.error) {
      setError(response.error.message);
      setAtRisk(null);
    } else if (response.data) {
      setAtRisk(response.data);
    }
    setLoading(false);
  }, []);

  return {
    overview,
    atRisk,
    loading,
    error,
    fetchOverview,
    fetchAtRisk,
  };
}
