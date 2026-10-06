// frontend/src/pages/HomePage.tsx
// Role-aware landing page - replaces the bland pairings redirect
import { useEffect, useState, type ChangeEvent } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { supervisorFirstName } from "@/lib/formatters";
import { Link } from "react-router-dom";
import { useGuideline } from "@/hooks/useGuideline";

interface PairingSummary {
  id: string;
  project_title: string | null;
  supervisor_name: string;
  student_name: string;
  chapter_count: number;
  last_meeting_date: string | null;
}

interface ChapterSummary {
  status: string;
}

interface DashboardSummary {
  total_pairings: number;
  active_pairings: number;
  total_students: number;
  total_supervisors: number;
  chapters_submitted_this_week: number;
  chapters_approved_this_week: number;
  pending_reviews: number;
  at_risk_pairings: number;
  completed_pairings: number;
  meetings_logged_this_week: number;
}

interface AtRiskSummary {
  pairing_id: string;
  student_name: string;
  days_since_last_meeting: number;
}

function PageHeading({ title, role, email }: { title: string; role: string; email?: string }) {
  return (
    <header className="flex flex-col gap-2 border-b border-stone-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-500">{role} workspace</p>
        <h1 className="mt-2 font-serif text-3xl text-stone-100 sm:text-4xl">{title}</h1>
      </div>
      {email && <p className="text-sm text-stone-500">{email}</p>}
    </header>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("relative min-h-28 overflow-hidden rounded-xl border p-4 sm:p-5", accent ? "border-sage-700/50 bg-sage-950/40" : "border-stone-800 bg-stone-900/60")}>
      <div className={cn("absolute inset-y-0 left-0 w-1", accent ? "bg-sage-500" : "bg-stone-700")} />
      <p className="pl-2 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className={cn("mt-2 pl-2 text-3xl font-semibold tabular-nums", accent ? "text-sage-300" : "text-stone-100")}>{value}</p>
      {sub && <p className="mt-1 pl-2 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-serif text-xl text-stone-100">{title}</h2>
      {detail && <p className="text-xs text-stone-500">{detail}</p>}
    </div>
  );
}

function ActionLink({ to, title, detail }: { to: string; title: string; detail: string }) {
  return (
    <Link to={to} className="group flex min-h-[76px] items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3 transition-colors hover:border-sage-700/60 hover:bg-stone-900">
      <span className="min-w-0"><span className="block text-sm font-medium text-stone-200 group-hover:text-sage-300">{title}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{detail}</span></span>
      <span aria-hidden="true" className="shrink-0 text-lg text-sage-500 transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function RiskRow({ name, daysSinceLastMeeting }: { name: string; daysSinceLastMeeting: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-red-900/30 py-3 text-sm">
      <span className="text-stone-200">{name}</span>
      <span className="text-xs font-medium text-red-300">{daysSinceLastMeeting === 9999 ? "No meeting logged" : `${daysSinceLastMeeting} days without a meeting`}</span>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function GuidelineCard() {
  const { guideline, isLoading, error, loadGuideline } = useGuideline();

  useEffect(() => { void loadGuideline(); }, [loadGuideline]);

  return (
    <div className="rounded-2xl border border-sage-700/30 bg-sage-950/20 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-500">Department resource</p>
          <h2 className="mt-1 font-serif text-lg text-stone-100">Project guideline</h2>
          <p className="mt-1 text-sm text-stone-400">Use the current departmental standard while planning and reviewing your project.</p>
        </div>
        <span className="rounded-full bg-sage-500/10 px-2.5 py-1 text-xs text-sage-400">Uniform</span>
      </div>
      {guideline ? (
        <a href={guideline.file_url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-between rounded-xl border border-stone-700/80 bg-stone-900/70 px-4 py-3 hover:border-sage-600/60">
          <span className="min-w-0 truncate text-sm text-stone-200">{guideline.file_name}</span>
          <span className="ml-3 shrink-0 text-xs font-medium text-sage-400">Open document</span>
        </a>
      ) : (
        <p className="mt-4 text-sm text-stone-500">{isLoading ? "Checking for the latest guideline..." : "No guideline has been uploaded yet."}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function GuidelineManager() {
  const { guideline, isLoading, error, loadGuideline, uploadGuideline } = useGuideline();
  const { user } = useAuthStore();

  useEffect(() => { void loadGuideline(); }, [loadGuideline]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user?.department_id) await uploadGuideline(user.department_id, file);
    event.target.value = "";
  };

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-500">Department resource</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-stone-100">Project guideline</h2>
          <p className="mt-1 text-sm text-stone-400">Upload the standard document students and supervisors should follow.</p>
        </div>
        <label className="cursor-pointer">
          <span className="inline-flex min-h-[36px] items-center rounded-lg bg-sage-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sage-500">
            {isLoading ? "Uploading..." : guideline ? "Replace" : "Upload"}
          </span>
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={isLoading} />
        </label>
      </div>
      {guideline && <p className="mt-4 truncate text-xs text-stone-500">Current: {guideline.file_name}</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Student home ─────────────────────────────────────────────
function StudentHome() {
  const { user } = useAuthStore();
  const [pairing, setPairing] = useState<PairingSummary | null>(null);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);

  useEffect(() => {
    api.get<{ items: PairingSummary[] }>("/v1/pairings?limit=1").then((r) => r.data?.items?.[0] && setPairing(r.data.items[0]));
    api.get<{ items: ChapterSummary[] }>("/v1/chapters?limit=5").then((r) => r.data?.items && setChapters(r.data.items));
  }, []);

  const approved = chapters.filter((c) => c.status === "approved").length;
  const progress = Math.min(100, Math.round((approved / 5) * 100));

  return (
    <div className="space-y-8">
      <PageHeading title={`Welcome back, ${user?.full_name?.split(" ")[0] || "student"}`} role="Student" email={user?.email} />

      <GuidelineCard />

      {pairing ? (
        <section className="rounded-2xl border border-sage-800/60 bg-gradient-to-br from-sage-950/60 to-stone-900/70 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-400">Your project</p>
              <h2 className="mt-2 font-serif text-2xl text-stone-100">{pairing.project_title || "Project title pending"}</h2>
              <p className="mt-2 text-sm text-stone-400">Supervisor <span className="text-sage-300">{supervisorFirstName(pairing.supervisor_name)}</span></p>
            </div>
            <span className="rounded-full border border-sage-700/50 bg-sage-900/30 px-3 py-1 text-xs text-sage-300">Active pairing</span>
          </div>
          <div className="mt-6 max-w-2xl space-y-2">
            <div className="flex justify-between gap-3 text-xs text-stone-400"><span>Approved chapters</span><span className="tabular-nums text-stone-200">{approved} of 5</span></div>
            <div role="progressbar" aria-label="Approved chapters" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(approved, 5)} className="h-2 overflow-hidden rounded-full bg-stone-800">
              <div className="h-full rounded-full bg-sage-500 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <Link to="/chapters" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sage-300 hover:text-sage-200">Open chapter workspace <span aria-hidden="true">→</span></Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-400">Project setup</p><h2 className="mt-2 font-serif text-xl text-stone-100">Your supervisor pairing is next</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">Your coordinator will assign your supervisor. Your project workspace will appear here once the pairing is active.</p></section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Chapters submitted" value={chapters.length} sub="In your recent activity" />
        <StatCard label="Approved" value={approved} sub="Ready for the next milestone" accent />
      </div>

      <section><SectionHeading title="Your workspaces" detail="Pick up where you left off" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ActionLink to="/chapters" title="Chapters" detail="Submit work and follow review progress" /><ActionLink to="/meetings" title="Meetings" detail="Review upcoming and past sessions" /><ActionLink to="/messages" title="Messages" detail="Continue academic conversations" /><ActionLink to="/repository" title="Repository" detail="Explore academic projects" /></div></section>
    </div>
  );
}

// ─── Supervisor home ──────────────────────────────────────────
function SupervisorHome() {
  const { user } = useAuthStore();
  const [pairings, setPairings] = useState<any[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    api.get<{ items: PairingSummary[] }>("/v1/pairings?limit=50").then((r) => r.data?.items && setPairings(r.data.items));
    api.get<{ items: ChapterSummary[] }>("/v1/chapters?limit=50").then((r) => {
      if (r.data?.items) {
        setPending(r.data.items.filter((c: any) => ["submitted", "resubmitted"].includes(c.status)).length);
      }
    });
  }, []);

  return (
    <div className="space-y-8">
      <PageHeading title={`Welcome back, ${user?.full_name ? supervisorFirstName(user.full_name) : "supervisor"}`} role="Supervisor" email={user?.email} />

      <GuidelineCard />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active Students" value={pairings.length} accent />
        <StatCard label="Pending Reviews" value={pending} sub="chapters awaiting review" />
      </div>

      <section>
        <SectionHeading title="Your students" detail={`${pairings.length} active pairing${pairings.length === 1 ? "" : "s"}`} />
        {pairings.length === 0 ? (
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 px-5 py-8 text-center"><p className="text-sm text-stone-400">No active student pairings yet.</p></div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/40">
            {pairings.map((p) => (
              <Link key={p.id} to="/chapters" className="flex items-center justify-between gap-4 border-b border-stone-800/70 px-4 py-4 last:border-0 hover:bg-stone-800/40 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-900/50 font-serif text-sm text-sage-300">{p.student_name?.split(/\s+/).map((part: string) => part[0]).slice(0, 2).join("")}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-stone-100">{p.student_name}</p><p className="mt-0.5 truncate text-xs text-stone-500">{p.project_title || "Project title pending"}</p></div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-stone-400">{p.chapter_count} chapter{p.chapter_count !== 1 ? "s" : ""}</p>
                  {p.last_meeting_date ? (
                    <p className="mt-1 text-[11px] text-stone-500">Last met {new Date(p.last_meeting_date).toLocaleDateString()}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-red-300">No meetings logged</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section><SectionHeading title="Workspace shortcuts" /><div className="grid gap-3 sm:grid-cols-2"><ActionLink to="/messages" title="Messages" detail="Continue student and academic conversations" /><ActionLink to="/meetings" title="Meetings" detail="Schedule and review supervision sessions" /><ActionLink to="/chapters" title="Chapter reviews" detail="Open student submissions and feedback" /></div></section>
    </div>
  );
}

// ─── Admin home ───────────────────────────────────────────────
function AdminHome() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<any>(null);
  const [atRisk, setAtRisk] = useState<any[]>([]);

  useEffect(() => {
    api.get<DashboardSummary>("/v1/dashboard/overview").then((r) => r.data && setOverview(r.data));
    api.get<{ items: AtRiskSummary[] }>("/v1/dashboard/at-risk?limit=5").then((r) => r.data?.items && setAtRisk(r.data.items));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeading title="Institution overview" role="Administrator" email={user?.email} />

      {overview && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Pairings" value={overview.total_pairings} accent />
            <StatCard label="Active pairings" value={overview.active_pairings} />
            <StatCard label="Students" value={overview.total_students} />
            <StatCard label="Supervisors" value={overview.total_supervisors} />
          </div>

          <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-5 sm:p-6">
            <SectionHeading title="This week" detail="Recent academic activity" />
            <div className="grid grid-cols-3 gap-3 text-center sm:gap-6">
              <div>
                <p className="text-2xl font-semibold tabular-nums text-sage-300">{overview.chapters_submitted_this_week}</p>
                <p className="mt-1 text-xs text-stone-500">Submitted</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-emerald-300">{overview.chapters_approved_this_week}</p>
                <p className="mt-1 text-xs text-stone-500">Approved</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-amber-300">{overview.pending_reviews}</p>
                <p className="mt-1 text-xs text-stone-500">Awaiting review</p>
              </div>
            </div>
          </section>

          {overview.at_risk_pairings > 0 && (
            <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-300">Needs attention</p><h2 className="mt-1 font-serif text-xl text-stone-100">{overview.at_risk_pairings} at-risk pairing{overview.at_risk_pairings !== 1 ? "s" : ""}</h2></div>
                <Link to="/dashboard/at-risk" className="text-sm font-medium text-red-300 hover:text-red-200">Review all <span aria-hidden="true">→</span></Link>
              </div>
              <div className="mt-3">
                {atRisk.slice(0, 3).map((p) => (
                  <RiskRow key={p.pairing_id} name={p.student_name} daysSinceLastMeeting={p.days_since_last_meeting} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section><SectionHeading title="Institution workspaces" detail="Manage people, projects, and records" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ActionLink to="/team" title="Team" detail="Manage coordinators and supervisors" /><ActionLink to="/pairings" title="Pairings" detail="Review student-supervisor relationships" /><ActionLink to="/dashboard" title="Full dashboard" detail="Open institution-wide activity" /><ActionLink to="/repository" title="Repository" detail="Browse and manage project records" /></div></section>
    </div>
  );
}

// ─── Coordinator home — reuse existing dashboard ──────────────
function CoordinatorHome() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<any>(null);
  const [atRisk, setAtRisk] = useState<any[]>([]);

  useEffect(() => {
    api.get<DashboardSummary>("/v1/dashboard/overview").then((r) => r.data && setOverview(r.data));
    api.get<{ items: AtRiskSummary[] }>("/v1/dashboard/at-risk?limit=5").then((r) => r.data?.items && setAtRisk(r.data.items));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeading title={`Welcome back, ${user?.full_name?.split(" ")[0] || "coordinator"}`} role="Coordinator" email={user?.email} />

      <GuidelineManager />

      {overview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Active Pairings" value={overview.active_pairings} accent />
          <StatCard label="At Risk" value={overview.at_risk_pairings} sub="no contact 21+ days" />
          <StatCard label="Pending Reviews" value={overview.pending_reviews} />
          <StatCard label="Meetings This Week" value={overview.meetings_logged_this_week} />
        </div>
      )}

      {atRisk.length > 0 && (
        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-300">Needs attention</p><h2 className="mt-1 font-serif text-xl text-stone-100">At-risk students</h2></div>
            <Link to="/dashboard/at-risk" className="text-sm font-medium text-red-300 hover:text-red-200">Review all <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-3">{atRisk.slice(0, 3).map((p) => <RiskRow key={p.pairing_id} name={p.student_name} daysSinceLastMeeting={p.days_since_last_meeting} />)}</div>
        </section>
      )}

      <section><SectionHeading title="Department workspaces" detail="Jump into a coordination task" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><ActionLink to="/team" title="Team" detail="Manage supervisors in your department" /><ActionLink to="/pairings" title="Pairings" detail="Review student-supervisor assignments" /><ActionLink to="/dashboard" title="Department dashboard" detail="See progress and at-risk pairings" /></div></section>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────
export function HomePage() {
  const { user } = useAuthStore();

  return (
    <main className="min-h-screen bg-stone-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-7 pb-28 sm:px-6 sm:py-9 lg:px-8">
        {user?.role === "student" && <StudentHome />}
        {user?.role === "supervisor" && <SupervisorHome />}
        {user?.role === "coordinator" && <CoordinatorHome />}
        {user?.role === "admin" && <AdminHome />}
      </div>
    </main>
  );
}