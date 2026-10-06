// frontend/src/components/meetings/MeetingLog.tsx
/**
 * PARK — Schedule Meeting Form
 * ==================================
 * Only supervisors see this. By default a meeting broadcasts to every
 * active student under the supervisor; toggling "Just one student"
 * narrows it to a single pairing. The datetime picker's `min` attribute
 * is set 24 hours out so an invalid time can't even be selected — the
 * backend re-checks anyway, but this keeps the happy path friction-free.
 */
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useMeetings, earliestAllowedMeetingTime, MIN_NOTICE_HOURS } from "@/hooks/useMeetings";
import { cn } from "@/lib/utils";

interface Pairing {
  id: string;
  student_name: string;
  project_title: string | null;
}

interface MeetingLogProps {
  // The supervisor's active pairings — used only for the optional
  // "single student" picker. Cohort-wide scheduling needs none of this.
  pairings: Pairing[];
  initialPairingId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Formats a Date as the value a <input type="datetime-local"> expects,
// in the user's local timezone (not UTC) — otherwise the picker's `min`
// and the displayed value drift by the timezone offset.
function toLocalDatetimeInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function MeetingLog({ pairings, initialPairingId, onSuccess, onCancel }: MeetingLogProps) {
  const { scheduleMeeting, isLoading, error } = useMeetings();

  const minAllowed = useMemo(() => earliestAllowedMeetingTime(), []);
  const minAllowedValue = useMemo(() => toLocalDatetimeInputValue(minAllowed), [minAllowed]);

  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingType, setMeetingType] = useState<"physical" | "virtual" | "phone">("physical");
  const [venue, setVenue] = useState("");
  const [agenda, setAgenda] = useState("");
  const [duration, setDuration] = useState("");
  const [scope, setScope] = useState<"cohort" | "single">(initialPairingId ? "single" : "cohort");
  const [pairingId, setPairingId] = useState(initialPairingId || pairings[0]?.id || "");
  const [localError, setLocalError] = useState<string | null>(null);

  // Live check so the person sees the 24h problem before they submit,
  // not after a round-trip to the server.
  const noticeWarning =
    scheduledAt && new Date(scheduledAt) < minAllowed
      ? `Meetings need at least ${MIN_NOTICE_HOURS} hours' notice — pick a time after ${minAllowed.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}.`
      : null;

  const handleSubmit = async () => {
    setLocalError(null);
    if (!scheduledAt || !venue.trim() || !agenda.trim()) {
      setLocalError("Date/time, venue, and agenda are all required.");
      return;
    }
    if (noticeWarning) return;
    if (scope === "single" && !pairingId) {
      setLocalError("Pick which student this meeting is for.");
      return;
    }

    const result = await scheduleMeeting({
      scheduled_at: new Date(scheduledAt).toISOString(),
      venue: venue.trim(),
      agenda: agenda.trim(),
      meeting_type: meetingType,
      duration_minutes: duration ? parseInt(duration) : undefined,
      pairing_id: scope === "single" ? pairingId : undefined,
    });

    if (result) onSuccess?.();
  };

  return (
    <div className="space-y-4">
      {/* Who this meeting is for */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-stone-300">Who is this for?</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScope("cohort")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
              scope === "cohort" ? "border-sage-500/50 bg-sage-500/10 text-sage-300" : "border-stone-800 text-stone-400 hover:border-stone-700"
            )}
          >
            All my students
          </button>
          <button
            type="button"
            onClick={() => setScope("single")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
              scope === "single" ? "border-sage-500/50 bg-sage-500/10 text-sage-300" : "border-stone-800 text-stone-400 hover:border-stone-700"
            )}
          >
            Just one student
          </button>
        </div>
      </div>

      {scope === "single" && (
        <Select
          label="Student"
          value={pairingId}
          onChange={(e) => setPairingId(e.target.value)}
          options={pairings.map((p) => ({ value: p.id, label: `${p.student_name} — ${p.project_title || "Untitled"}` }))}
        />
      )}

      <div>
        <Input
          label="Date & Time"
          type="datetime-local"
          min={minAllowedValue}
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <p className="mt-1 text-xs text-stone-500">
          Students need at least {MIN_NOTICE_HOURS} hours' notice, so the earliest slot you can pick is{" "}
          {minAllowed.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}.
        </p>
        {noticeWarning && <p className="mt-1 text-xs font-medium text-amber-400">{noticeWarning}</p>}
      </div>

      <Select
        label="Meeting Type"
        value={meetingType}
        onChange={(e) => setMeetingType(e.target.value as "physical" | "virtual" | "phone")}
        options={[
          { value: "physical", label: "Physical Meeting" },
          { value: "virtual", label: "Virtual Meeting" },
          { value: "phone", label: "Phone Call" },
        ]}
      />

      <Input
        label={meetingType === "virtual" ? "Meeting Link" : "Venue"}
        placeholder={meetingType === "virtual" ? "https://zoom.us/j/... or https://meet.google.com/..." : "e.g. Dept. Seminar Room 2"}
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
      />

      <Input
        label="Duration (minutes, optional)"
        type="number"
        placeholder="e.g. 45"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-stone-300">Agenda</label>
        <textarea
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="What will be covered in this meeting..."
          rows={3}
          className={cn(
            "w-full rounded-lg border bg-stone-900 px-3.5 py-2.5 text-sm text-stone-100",
            "placeholder:text-stone-600 focus:border-sage-500/50 focus:outline-none",
            "border-stone-800 hover:border-stone-700 transition-colors resize-none"
          )}
        />
      </div>

      {(localError || error) && (
        <p className="text-xs font-medium text-red-400">{localError || error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!scheduledAt || !venue || !agenda || !!noticeWarning}
          className="flex-1"
        >
          Schedule & Announce
        </Button>
      </div>
    </div>
  );
}
