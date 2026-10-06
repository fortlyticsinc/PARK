// frontend/src/components/PairingCard.tsx
/**
 * PARK — Module 1: Pairing Card
 * Mobile-first list item. Supervisor sees "who needs me" first.
 */
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Pairing } from "@/hooks/usePairings";

interface PairingCardProps {
  pairing: Pairing;
  onClick?: () => void;
  userRole: string;
}

export function PairingCard({ pairing, onClick, userRole }: PairingCardProps) {
  const statusVariant =
    pairing.status === "active"
      ? "active"
      : pairing.status === "completed"
      ? "completed"
      : "suspended";

  const lastMeeting = pairing.last_meeting_date
    ? new Date(pairing.last_meeting_date).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      })
    : "No meeting yet";

  return (
    <Card isInteractive onClick={onClick} className="group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-serif text-base text-stone-100">
              {pairing.student_name}
            </h3>
            {pairing.student_matric && (
              <span className="shrink-0 text-xs text-stone-500">
                {pairing.student_matric}
              </span>
            )}
          </div>
          <p className="mb-2 truncate text-sm text-stone-400">
            {pairing.project_title || "No project title"}
          </p>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>{pairing.supervisor_name}</span>
            <span>·</span>
            <span>{pairing.academic_year}</span>
          </div>
        </div>
        <Badge variant={statusVariant}>
          {pairing.status}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-stone-800/60 pt-3">
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pairing.chapter_count} chapters
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {lastMeeting}
          </span>
        </div>
        {userRole === "coordinator" && pairing.status === "active" && (
          <button className="rounded-md p-1.5 text-stone-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-800 hover:text-sage-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        )}
      </div>
    </Card>
  );
}
