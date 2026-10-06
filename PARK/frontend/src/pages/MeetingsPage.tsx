// frontend/src/pages/MeetingsPage.tsx
/**
 * PARK — Meetings Page (Module 3, redesigned)
 * ==================================================
 * Supervisors schedule; everyone else views. No pairing picker needed
 * up front any more — MeetingLog handles the "whole cohort vs one
 * student" choice internally.
 *
 * Visibility (mirrors the backend's meeting_service.list_meetings):
 *   - Supervisor: only meetings they scheduled
 *   - Student: meetings from their own supervisor(s)
 *   - Coordinator: every meeting from supervisors in their department
 *   - Admin: every meeting, institution-wide (no department filter)
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useMeetings } from "@/hooks/useMeetings";
import { usePairings } from "@/hooks/usePairings";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { MeetingLog } from "@/components/meetings/MeetingLog";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";

export function MeetingsPage() {
  const location = useLocation();
  const meetingState = location.state as { openSchedule?: boolean; pairingId?: string } | null;
  const { user } = useAuthStore();
  const { meetings, isLoading, error, listMeetings } = useMeetings();
  const { pairings, listPairings } = usePairings();

  const [isScheduleOpen, setIsScheduleOpen] = useState(Boolean(meetingState?.openSchedule));
  const [currentPage, setCurrentPage] = useState(1);

  const isSupervisor = user?.role === "supervisor";
  const isCoordinator = user?.role === "coordinator";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    listMeetings({ page: currentPage, limit: 20 });
  }, [currentPage]);

  useEffect(() => {
    if (isSupervisor) {
      listPairings({ page: 1, limit: 100 });
    }
  }, [isSupervisor]);

  const activePairings = (pairings?.items || []).map((p) => ({
    id: p.id, student_name: p.student_name, project_title: p.project_title,
  }));

  // Admin sees everything institution-wide, coordinator is scoped to
  // their own department — the copy below should say so accurately
  // rather than using one blanket "your department" line for both.
  const subtitle = isSupervisor
    ? "Meetings you've scheduled for your students"
    : isAdmin
    ? "Every scheduled meeting across the institution — full oversight"
    : isCoordinator
    ? "Scheduled meetings across your department"
    : "Meetings your supervisor has scheduled — announced at least 24 hours ahead";

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="sticky top-0 z-10 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-xl text-stone-100 sm:text-2xl">Meetings</h1>
              <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
            </div>
            {isSupervisor && (
              <Button size="sm" onClick={() => setIsScheduleOpen(true)}>
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Schedule Meeting
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => listMeetings({ page: 1 })} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {isLoading && !meetings && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-900/50" />
            ))}
          </div>
        )}

        {!isLoading && meetings?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-900">
              <svg className="h-8 w-8 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-serif text-lg text-stone-300">No meetings scheduled yet</h3>
            <p className="mt-1 max-w-xs text-sm text-stone-500">
              {isSupervisor
                ? "Schedule your first meeting — it'll be announced to your students automatically."
                : "Nothing scheduled yet."}
            </p>
            {isSupervisor && (
              <Button onClick={() => setIsScheduleOpen(true)} className="mt-4">Schedule Meeting</Button>
            )}
          </div>
        )}

        {meetings && meetings.items.length > 0 && (
          <div className="space-y-3">
            {meetings.items.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
            {meetings.pages > 1 && (
              <Pagination currentPage={meetings.page} totalPages={meetings.pages} onPageChange={setCurrentPage} />
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title="Schedule a Meeting" size="lg">
        <MeetingLog
          pairings={activePairings}
          initialPairingId={meetingState?.pairingId}
          onSuccess={() => {
            setIsScheduleOpen(false);
            listMeetings({ page: 1 });
          }}
          onCancel={() => setIsScheduleOpen(false)}
        />
      </Modal>
    </div>
  );
}
