import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupervisorWorkload } from "@/hooks/useSupervisorWorkload";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supervisorFirstName } from "@/lib/formatters";

export function SupervisorWorkloadPage() {
  const { items, isLoading, error, load } = useSupervisorWorkload();

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-4 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <Link to="/dashboard"><Button variant="ghost" size="sm">Back</Button></Link>
        <div>
          <h1 className="font-serif text-xl text-stone-100 sm:text-2xl">Supervisor Workload</h1>
          <p className="text-xs text-stone-500">Active pairings, chapter reviews, and scheduled meetings.</p>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-300">{error}<Button variant="ghost" size="sm" onClick={load} className="ml-3">Retry</Button></div>}
      {isLoading ? <div className="py-12 text-center text-stone-500">Loading workload...</div> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.supervisor_id} className="space-y-4">
              <div><h2 className="font-medium text-stone-100">{supervisorFirstName(item.supervisor_name)}</h2><p className="text-xs text-stone-500">{item.supervisor_email}</p></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Pairings" value={item.active_pairings} />
                <Metric label="Pending" value={item.pending_chapters} />
                <Metric label="Approved" value={item.approved_chapters} />
                <Metric label="Meetings" value={item.upcoming_meetings} />
              </div>
            </Card>
          ))}
          {!items.length && <p className="py-12 text-center text-stone-500">No active supervisors found.</p>}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-stone-900 p-3 text-center"><p className="text-xl font-semibold text-sage-400">{value}</p><p className="text-xs text-stone-500">{label}</p></div>;
}