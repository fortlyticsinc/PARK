/**
 * PARK — Dashboard Page (Module 6)
 * Coordinator/admin only.
 */
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-stone-950">
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-6 sm:pt-9 lg:px-8">
        <header className="mb-7 border-b border-stone-800 pb-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-500">Department overview</p>
          <h1 className="mt-2 font-serif text-3xl text-stone-100 sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm text-stone-400">Cohort progress, supervisor workload, and pairings needing attention.</p>
        </header>
        <DashboardOverview />
      </div>
    </div>
  );
}
