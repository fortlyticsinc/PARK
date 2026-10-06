/**
 * PARK — At-Risk Pairings List
 * Full list view for the coordinator dashboard, most-urgent-first.
 * Originally had a "Send SMS Nudge" action here — removed along with
 * the rest of SMS (see the Brevo weekly-digest pivot). Supervisors
 * now get this same at-risk data folded into their weekly email
 * instead of a per-pairing manual nudge button.
 */
import { useEffect } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { Badge } from "@/components/ui/Badge";
import { supervisorFirstName } from "@/lib/formatters";

export function AtRiskList() {
  const { atRisk, loading, error, fetchAtRisk } = useDashboard();

  useEffect(() => {
    fetchAtRisk({ limit: 50 });
  }, [fetchAtRisk]);

  if (loading) return <div className="py-12 text-center text-sage-500">Loading...</div>;

  if (error) {
    return <div className="py-12 text-center text-sm text-red-300">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-xl text-sage-500">At-Risk Pairings</h1>
      <p className="text-sm text-stone-400">No meeting logged in 21+ days. Most urgent first.</p>

      {atRisk?.items.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-500">Nothing at risk right now — nice.</p>
      )}

      {atRisk?.items.map((pairing) => (
        <div key={String(pairing.pairing_id)} className="space-y-2 rounded-xl bg-stone-900/80 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-sage-500">{pairing.student_name}</h3>
              <p className="text-sm text-stone-400">{supervisorFirstName(pairing.supervisor_name)}</p>
            </div>
            <Badge variant="danger">{pairing.days_since_last_meeting}d</Badge>
          </div>

          <div className="text-xs text-stone-400">
            {pairing.last_meeting_date
              ? `Last meeting: ${new Date(pairing.last_meeting_date).toLocaleDateString()}`
              : "No meetings logged yet"}
          </div>

          <div className="text-xs text-stone-400">
            Current: Chapter {pairing.current_chapter} ({pairing.chapter_status})
          </div>
        </div>
      ))}
    </div>
  );
}
