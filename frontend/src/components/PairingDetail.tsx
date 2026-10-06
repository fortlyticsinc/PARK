import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePairings } from "@/hooks/usePairings";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface PairingDetailProps {
  pairingId: string;
  onBack: () => void;
}

export function PairingDetail({ pairingId, onBack }: PairingDetailProps) {
  const { currentPairing, getPairing, isLoading } = usePairings();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    getPairing(pairingId);
  }, [pairingId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-sage-600" />
      </div>
    );
  }

  if (!currentPairing) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-stone-500">
        <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>Pairing not found</p>
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-3">
          Go Back
        </Button>
      </div>
    );
  }

  const statusVariant =
    currentPairing.status === "active"
      ? "active"
      : currentPairing.status === "completed"
      ? "completed"
      : "suspended";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
      </div>

      {/* Main Info Card */}
      <Card className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-xl text-stone-100">
              {currentPairing.student_name}
            </h1>
            <p className="text-sm text-stone-500">
              {currentPairing.student_matric || "No matric number"}
            </p>
          </div>
          <Badge variant={statusVariant}>{currentPairing.status}</Badge>
        </div>

        <div className="grid gap-4 border-t border-stone-800/60 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Supervisor</p>
            <p className="mt-1 text-sm text-stone-300">{currentPairing.supervisor_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Academic Year</p>
            <p className="mt-1 text-sm text-stone-300">{currentPairing.academic_year}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Project Title</p>
            <p className="mt-1 text-sm text-stone-300">
              {currentPairing.project_title || "No title set"}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-2xl font-serif text-sage-500">{currentPairing.chapter_count}</p>
          <p className="text-xs text-stone-500">Chapters Submitted</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-serif text-sage-500">
            {currentPairing.last_meeting_date
              ? new Date(currentPairing.last_meeting_date).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </p>
          <p className="text-xs text-stone-500">Last Meeting</p>
        </Card>
        <Card className="col-span-2 text-center sm:col-span-1">
          <p className="text-2xl font-serif text-sage-500">
            {new Date(currentPairing.created_at).toLocaleDateString("en-NG", {
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-stone-500">Paired Since</p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate("/messages", {
            state: {
              pairingId,
              name: user?.role === "student"
                ? currentPairing.supervisor_name
                : currentPairing.student_name,
            },
          })}
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Message
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/meetings", { state: { openSchedule: true, pairingId } })}
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule Meeting
        </Button>
        {/* Certificate is only meaningful once a pairing is actively
            progressing or already completed — surfacing it always
            (rather than hiding it) lets everyone see at a glance how
            close a pairing is to done via the status checklist inside. */}
        <Button variant="secondary" onClick={() => navigate(`/pairings/${pairingId}/certificate`)}>
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {currentPairing.status === "completed" ? "View Certificate" : "Certificate Status"}
        </Button>
      </div>
    </div>
  );
}
