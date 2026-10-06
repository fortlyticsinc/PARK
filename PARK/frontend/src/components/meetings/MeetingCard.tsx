// frontend/src/components/meetings/MeetingCard.tsx
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Meeting } from "@/hooks/useMeetings";

interface MeetingCardProps {
  meeting: Meeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const typeIcons = {
    physical: "🤝",
    virtual: "💻",
    phone: "📞",
  };

  return (
    <Card className={`border-l-2 ${meeting.is_upcoming ? "border-l-sage-500" : "border-l-stone-700"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-lg">{typeIcons[meeting.meeting_type]}</span>
            <span className="text-sm font-medium capitalize text-stone-300">{meeting.meeting_type} Meeting</span>
            <Badge variant={meeting.is_upcoming ? "active" : "default"}>
              {meeting.is_upcoming ? "Upcoming" : "Past"}
            </Badge>
            {meeting.duration_minutes && (
              <span className="text-xs text-stone-600">{meeting.duration_minutes} min</span>
            )}
          </div>

          <p className="text-xs text-stone-500">
            {new Date(meeting.scheduled_at).toLocaleDateString("en-NG", {
              weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
            {" · "}
            {meeting.venue}
          </p>

          <p className="mt-2 text-sm text-stone-400">{meeting.agenda}</p>

          <p className="mt-2 text-xs text-stone-600">
            Scheduled by <span className="text-stone-400">{meeting.supervisor_name}</span>
            {meeting.student_name ? ` — just for ${meeting.student_name}` : " — for all their students"}
          </p>
        </div>
      </div>
    </Card>
  );
}
