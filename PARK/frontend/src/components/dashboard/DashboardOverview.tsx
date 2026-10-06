/**
 * Coordinator's home view — stats cards, at-risk alert, quick actions.
 * Every number is cached server-side; we show last-updated time.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { Card } from "@/components/ui/Card";
import { supervisorFirstName } from "@/lib/formatters";

export function DashboardOverview() {
  const { overview, atRisk, loading, error, fetchOverview, fetchAtRisk } = useDashboard();

  useEffect(() => {
    fetchOverview();
    fetchAtRisk({ limit: 5 }); // Top 5 most urgent
  }, [fetchOverview, fetchAtRisk]);

  if (loading && !overview) return <div className="text-center py-12 text-sage-500">Loading dashboard...</div>;
  if (error) return <div className="text-center py-12 text-red-400">Failed to load dashboard.</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {overview && <>
          <StatCard label="Active pairings" value={overview.active_pairings} sub={`${overview.total_pairings} total`} />
          <StatCard label="Pending reviews" value={overview.pending_reviews} sub="Chapters awaiting feedback" accent />
          <StatCard label="Submitted this week" value={overview.chapters_submitted_this_week} sub="Chapter activity" />
          <StatCard label="Completed pairings" value={overview.completed_pairings} sub="Projects completed" />
        </>}
      </div>

      {atRisk && atRisk.total > 0 && (
        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-300">Needs attention</p><h2 className="mt-1 font-serif text-xl text-stone-100">{atRisk.total} at-risk pairing{atRisk.total !== 1 ? "s" : ""}</h2></div>
            <Link to="/dashboard/at-risk" className="text-sm font-medium text-red-300 hover:text-red-200">Review all <span aria-hidden="true">→</span></Link>
          </div>
          <p className="mt-2 text-sm text-stone-400">These pairings have had no meeting recorded for 21 or more days.</p>
          <div className="mt-3 divide-y divide-red-900/30">
            {atRisk.items.slice(0, 5).map((pairing) => (
              <div key={pairing.pairing_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="text-sm font-medium text-stone-200">{pairing.student_name}</p><p className="mt-0.5 text-xs text-stone-500">Supervisor: {supervisorFirstName(pairing.supervisor_name)}</p></div>
                <span className="text-xs font-medium text-red-300">{pairing.days_since_last_meeting === 9999 ? "No meeting logged" : `${pairing.days_since_last_meeting} days`}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-serif text-xl text-stone-100">Department operations</h2><p className="text-xs text-stone-500">Move from overview to action</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/dashboard/supervisor-workload" className="group flex min-h-[76px] items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3 hover:border-sage-700/60 hover:bg-stone-900"><span><span className="block text-sm font-medium text-stone-200 group-hover:text-sage-300">Supervisor workload</span><span className="mt-1 block text-xs text-stone-500">Compare active pairings, reviews, and meetings</span></span><span aria-hidden="true" className="text-lg text-sage-500">→</span></Link>
          <Link to="/pairings" className="group flex min-h-[76px] items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3 hover:border-sage-700/60 hover:bg-stone-900"><span><span className="block text-sm font-medium text-stone-200 group-hover:text-sage-300">Manage pairings</span><span className="mt-1 block text-xs text-stone-500">Review student-supervisor assignments</span></span><span aria-hidden="true" className="text-lg text-sage-500">→</span></Link>
        </div>
      </section>

      {overview && (
        <p className="border-t border-stone-800 pt-4 text-right text-xs text-stone-500">Updated {new Date(overview.last_updated).toLocaleString()}</p>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent = false }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <Card className={`relative min-h-28 overflow-hidden p-4 sm:p-5 ${accent ? "border-sage-700/50 bg-sage-950/40" : ""}`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${accent ? "bg-sage-500" : "bg-stone-700"}`} />
      <p className="pl-2 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <div className={`mt-2 pl-2 text-3xl font-semibold tabular-nums ${accent ? "text-sage-300" : "text-stone-100"}`}>{value}</div>
      <p className="mt-1 pl-2 text-xs text-stone-500">{sub}</p>
    </Card>
  );
}
