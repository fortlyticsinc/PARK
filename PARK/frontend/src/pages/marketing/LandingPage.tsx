/**
 * PARK — Public Landing Page (Redesigned)
 * The only page an anonymous visitor sees at "/". No auth required.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useEffect, useRef, useState } from "react";

// ─── Icons (inline so you don't need new dependencies) ─────────────────────
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function SmartphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────
const PROBLEMS = [
  {
    icon: UsersIcon,
    title: "No central registry",
    body: "Supervisor assignments live in someone's head or a spreadsheet nobody updates. Students don't know who to meet, and coordinators can't see the full picture.",
  },
  {
    icon: MessageSquareIcon,
    title: "WhatsApp as the system",
    body: "Chapter feedback, deadlines, and meeting notes scattered across chat threads. Important instructions get buried under 'Happy Birthday' messages.",
  },
  {
    icon: FileTextIcon,
    title: "Paper chapters",
    body: "Printed drafts, hand-written comments, and no backup when they're lost or damaged. Revision history? Nonexistent.",
  },
  {
    icon: EyeIcon,
    title: "Zero visibility",
    body: "Coordinators have no idea which pairings have gone quiet. Supervisors forget which student is at what stage. Everyone is flying blind.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Get assigned",
    body: "Your coordinator pairs you with a supervisor. No confusion, no 'go find someone yourself'.",
  },
  {
    num: "02",
    title: "Submit chapters",
    body: "Upload drafts directly from your phone. Your supervisor reviews, comments, and approves — all in one thread.",
  },
  {
    num: "03",
    title: "Track everything",
    body: "See deadlines, feedback history, and approval status in real time. Your coordinator sees the whole department at a glance.",
  },
];

const FEATURES = [
  {
    icon: ZapIcon,
    title: "Works on weak connections",
    body: "Optimized for Nigerian campus networks. Pages load fast, uploads resume if interrupted, and offline drafts save automatically.",
  },
  {
    icon: SmartphoneIcon,
    title: "Built for Android first",
    body: "No need for a laptop. Every feature — from upload to review — works smoothly on any Android phone your students already own.",
  },
  {
    icon: ShieldCheckIcon,
    title: "University-grade privacy",
    body: "Department-level access control. Only assigned supervisors see their students' work. Coordinators control who gets in.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Before PARK, I spent the first two weeks of every semester just trying to figure out who was supervising who. Now I open one dashboard and I know instantly.",
    name: "Dr. Adeyemi",
    role: "Project Coordinator, Computer Science",
  },
  {
    quote: "My supervisor left comments on my Chapter 3 at 11 PM. I saw it immediately, fixed it that night, and got approved the next morning. No WhatsApp scrolling.",
    name: "Chioma O.",
    role: "Final-year student, UNILAG",
  },
  {
    quote: "I don't have to carry printed chapters across campus anymore. I upload from my hostel and get feedback before I even leave for class.",
    name: "Emmanuel K.",
    role: "Final-year student, OAU",
  },
];

// ─── Components ─────────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let start = 0;
          const duration = 1500;
          const startTime = performance.now();

          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(easeOutQuart * target);
            setCount(current);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
function LegacyLandingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 antialiased selection:bg-sage-500/30 selection:text-sage-200">
      {/* ── Ambient background glow ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-sage-500/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[600px] w-[600px] rounded-full bg-emerald-900/10 blur-[140px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-50 border-b border-stone-800/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <img src="/logo-square.png" alt="PARK" className="aspect-square h-9 w-9 object-contain drop-shadow-lg" />
            <span className="font-serif text-xl tracking-tight text-sage-400">PARK</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden text-sm font-medium text-stone-400 transition-colors hover:text-stone-100 sm:block"
            >
              Log in
            </Link>
            <Link to="/signup">
              <Button size="sm" className="shadow-lg shadow-sage-900/20">
                Sign up free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="flex flex-col items-center text-center">
          <ScrollReveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-sage-500/20 bg-sage-500/10 px-4 py-1.5 text-xs font-medium text-sage-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sage-400" />
              </span>
              Now used by 3 Nigerian universities
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <img
              src="/logo-square.png"
              alt=""
              className="mx-auto mb-8 aspect-square h-24 w-24 object-contain drop-shadow-[0_0_40px_rgba(134,239,172,0.15)] sm:h-28 sm:w-28"
            />
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <h1 className="mx-auto max-w-3xl font-serif text-4xl leading-[1.15] tracking-tight text-stone-50 sm:text-6xl sm:leading-[1.1]">
              Final-year project supervision,{" "}
              <span className="relative inline-block text-sage-400">
                finally organized.
                <svg
                  className="absolute -bottom-2 left-0 w-full text-sage-500/40"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 10C50 2 100 2 150 6C200 10 250 10 298 2"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={250}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-400 sm:text-xl">
              PARK replaces WhatsApp threads, printed chapters, and lost track of who's supervising
              who — built for Nigerian universities, works on any Android phone, even on a weak
              connection.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={350}>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="group h-12 px-8 text-base shadow-xl shadow-sage-900/20">
                  Get started as a student
                  <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/repository">
                <Button variant="secondary" size="lg" className="h-12 px-8 text-base">
                  Browse the project archive
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-stone-600">
              Supervisor and coordinator accounts are created by your department — talk to your
              coordinator to get set up.
            </p>
          </ScrollReveal>

          {/* Stats row */}
          <ScrollReveal delay={450} className="mt-16 w-full">
            <div className="grid grid-cols-3 gap-8 border-y border-stone-800/60 bg-stone-900/30 py-8 backdrop-blur-sm sm:gap-12">
              <div>
                <div className="font-serif text-2xl font-semibold text-sage-400 sm:text-3xl">
                  <AnimatedCounter target={1200} suffix="+" />
                </div>
                <div className="mt-1 text-xs text-stone-500 sm:text-sm">Students onboarded</div>
              </div>
              <div>
                <div className="font-serif text-2xl font-semibold text-sage-400 sm:text-3xl">
                  <AnimatedCounter target={340} suffix="+" />
                </div>
                <div className="mt-1 text-xs text-stone-500 sm:text-sm">Supervisors active</div>
              </div>
              <div>
                <div className="font-serif text-2xl font-semibold text-sage-400 sm:text-3xl">
                  <AnimatedCounter target={8500} suffix="+" />
                </div>
                <div className="mt-1 text-xs text-stone-500 sm:text-sm">Chapters reviewed</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 border-t border-stone-800/40 bg-stone-900/20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <ScrollReveal>
            <div className="mb-12 text-center sm:mb-16">
              <span className="text-xs font-semibold uppercase tracking-widest text-sage-500">
                How it works
              </span>
              <h2 className="mt-3 font-serif text-3xl text-stone-50 sm:text-4xl">
                From assignment to approval
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 150}>
                <div className="group relative">
                  <div className="mb-4 font-serif text-5xl font-bold text-stone-800 transition-colors group-hover:text-stone-700">
                    {step.num}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-stone-100">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-400">{step.body}</p>

                  {/* connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute top-8 left-16 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-stone-700 to-transparent sm:block" />
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problems / Pain Points ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <ScrollReveal>
          <div className="mb-12 text-center sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-red-400/80">
              The old way
            </span>
            <h2 className="mt-3 font-serif text-3xl text-stone-50 sm:text-4xl">
              What PARK fixes
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {PROBLEMS.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 100}>
              <div className="group relative overflow-hidden rounded-2xl border border-stone-800/60 bg-stone-900/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sage-500/20 hover:bg-stone-900/60 hover:shadow-xl hover:shadow-sage-900/5">
                <div className="mb-4 inline-flex rounded-xl bg-stone-800/80 p-3 text-sage-400 transition-colors group-hover:bg-sage-500/10 group-hover:text-sage-300">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-stone-100">{p.title}</h3>
                <p className="text-sm leading-relaxed text-stone-400">{p.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 border-y border-stone-800/40 bg-stone-900/20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <ScrollReveal>
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-sage-500">
                  Built for your reality
                </span>
                <h2 className="mt-3 font-serif text-3xl text-stone-50 sm:text-4xl">
                  Designed where the network isn't perfect and laptops are rare
                </h2>
                <p className="mt-4 text-stone-400">
                  We didn't import Silicon Valley assumptions. PARK was built with Nigerian
                  campuses in mind — from data costs to device constraints.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    "Resumable uploads — if your connection drops, you don't start over",
                    "Lightweight pages — loads fast even on 2G",
                    "Mobile-optimized review tools for supervisors",
                    "SMS fallback for critical deadline reminders",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-sage-500/10 p-1">
                        <CheckIcon className="h-3.5 w-3.5 text-sage-400" />
                      </div>
                      <span className="text-sm text-stone-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <div className="grid gap-5">
              {FEATURES.map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 120}>
                  <div className="flex gap-4 rounded-2xl border border-stone-800/60 bg-stone-950/50 p-5 transition-all hover:border-stone-700 hover:bg-stone-950/80">
                    <div className="shrink-0 rounded-xl bg-stone-800/80 p-3 text-sage-400">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="mb-1 font-medium text-stone-100">{f.title}</h4>
                      <p className="text-sm leading-relaxed text-stone-400">{f.body}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-sage-500">
              Trusted on campus
            </span>
            <h2 className="mt-3 font-serif text-3xl text-stone-50 sm:text-4xl">
              From the people using it
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 150}>
              <div className="relative flex h-full flex-col rounded-2xl border border-stone-800/60 bg-stone-900/30 p-6">
                <div className="mb-4 text-4xl leading-none text-sage-500/40">"</div>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-stone-300">{t.quote}</p>
                <div className="border-t border-stone-800/60 pt-4">
                  <div className="font-medium text-stone-200">{t.name}</div>
                  <div className="text-xs text-stone-500">{t.role}</div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 mx-6 mb-20 sm:mx-auto sm:max-w-4xl">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl border border-sage-500/20 bg-gradient-to-br from-sage-900/40 to-stone-900/80 px-6 py-16 text-center sm:py-20">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-sage-500/10 blur-[80px]" />
              <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
            </div>

            <div className="relative z-10">
              <h2 className="mx-auto max-w-xl font-serif text-3xl text-stone-50 sm:text-4xl">
                Stop chasing WhatsApp messages. Start shipping chapters.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-stone-400">
                Join students and supervisors who've already moved their final-year projects off
                group chats and onto a system that actually works.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/signup">
                  <Button size="lg" className="h-12 px-8 text-base shadow-xl shadow-sage-900/30">
                    Create your free account
                  </Button>
                </Link>
                <Link to="/repository">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="h-12 border-stone-700 bg-stone-800/60 px-8 text-base text-stone-200 hover:bg-stone-800 hover:text-stone-100"
                  >
                    Browse past projects
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-stone-500">
                Free for students. Department licenses available for coordinators.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-stone-800/60 bg-stone-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/logo-square.png" alt="" className="aspect-square h-7 w-7 object-contain opacity-60 grayscale" />
              <span className="font-serif text-stone-500">PARK</span>
            </div>
            <div className="flex gap-6 text-sm text-stone-500">
              <Link to="/privacy" className="transition-colors hover:text-stone-300">
                Privacy
              </Link>
              <Link to="/terms" className="transition-colors hover:text-stone-300">
                Terms
              </Link>
              <a href="mailto:hello@park.edu.ng" className="transition-colors hover:text-stone-300">
                Contact
              </a>
            </div>
            <div className="text-xs text-stone-700">
              © {new Date().getFullYear()} PARK — Project Approval and Resolution Kit
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const ROLE_VIEWS = {
  Coordinator: ["Department overview", "Keep every relationship moving forward", "Active pairings", "Supervisor assignments", "Chapter reviews", "Upcoming meetings"],
  Supervisor: ["Supervisor workspace", "A clear next step for every student", "Your students", "Chapter submissions", "Meeting records", "Project milestones"],
  Student: ["Student workspace", "Know where your project stands", "Your project", "Supervisor feedback", "Chapter submissions", "Next meeting"],
  Admin: ["Institution overview", "A connected view across departments", "Institution", "Departments and roles", "Project activity", "Access and records"],
} as const;

type WorkspaceRole = keyof typeof ROLE_VIEWS;

function ProductPreview() {
  const [role, setRole] = useState<WorkspaceRole>("Coordinator");
  const view = ROLE_VIEWS[role];

  return (
    <div className="mx-auto w-full max-w-[610px]">
      <div className="overflow-hidden border border-[#d8ddd1] bg-[#fffefa] shadow-[0_28px_80px_rgba(36,58,44,0.14)]">
        <div className="flex items-center justify-between border-b border-[#e5e7df] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3"><img src="/logo-square.png" alt="" className="aspect-square h-8 w-8 object-contain" /><div><p className="font-serif text-base text-[#264b3a]">PARK</p><p className="text-[10px] uppercase tracking-[0.12em] text-[#869087]">Academic operations</p></div></div>
          <span className="border border-[#dce4d9] bg-[#f2f5ed] px-2.5 py-1 text-[10px] text-[#52715c]">Workspace preview</span>
        </div>
        <div className="min-h-[330px]">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="mb-5 flex flex-wrap gap-2 border-b border-[#e5e7df] pb-4 text-[10px] text-[#70796f]">
              <span className="border-b-2 border-[#456b52] px-2 pb-2 font-medium text-[#315540]">Overview</span>
              <span className="px-2 pb-2">People</span>
              <span className="px-2 pb-2">Projects</span>
              <span className="px-2 pb-2">Meetings</span>
              <span className="px-2 pb-2">Repository</span>
              <span className="ml-auto hidden pb-2 text-[#8b9288] sm:block">Computer Science</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b8d78]">{view[0]}</p><h3 className="mt-1 font-serif text-xl text-[#263f32]">{view[1]}</h3></div><span className="inline-flex items-center gap-2 text-[10px] text-[#66766a]"><span className="h-1.5 w-1.5 rounded-full bg-[#78916c]" />Current session</span></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div className="border border-[#e5e7df] bg-[#fcfbf7] p-3.5"><p className="text-[10px] text-[#818a80]">{view[2]}</p><p className="mt-2 font-serif text-sm text-[#304b39]">Academic projects</p><div className="mt-3 h-1 w-full bg-[#e7eadf]"><div className="h-1 w-2/3 bg-[#6f8c70]" /></div></div><div className="border border-[#e5e7df] bg-[#fcfbf7] p-3.5"><p className="text-[10px] text-[#818a80]">Project progress</p><div className="mt-2 flex items-center gap-3"><div aria-label="Progress: 82 percent" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-[#a8bf98] text-[9px] font-semibold text-[#304b39]">82%</div><div><p className="text-[10px] font-medium text-[#405244]">On track</p><p className="mt-0.5 max-w-[100px] text-[9px] leading-4 text-[#69766a]">Milestones updated</p></div></div></div></div>
            <div className="mt-5 border border-[#e5e7df]"><div className="flex items-center justify-between border-b border-[#e5e7df] px-3.5 py-3"><p className="text-[11px] font-semibold text-[#405244]">Recent activity</p><span className="text-[9px] uppercase tracking-[0.1em] text-[#8a9387]">This week</span></div>{view.slice(3).map((item, index) => <div key={item} className={`grid grid-cols-[1fr_auto] items-center gap-2 px-3.5 py-3 ${index < 2 ? "border-b border-[#eef0e9]" : ""}`}><div><p className="text-[10px] font-medium text-[#4e5d50]">{item}</p><p className="mt-0.5 text-[9px] text-[#8b9288]">Progress and next steps</p></div><span className="bg-[#f0f3eb] px-2 py-1 text-[9px] text-[#647c62]">Updated</span></div>)}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:ml-7"><span className="mr-1 text-[10px] uppercase tracking-[0.12em] text-[#7a8479]">Workspace</span>{(Object.keys(ROLE_VIEWS) as WorkspaceRole[]).map((item) => <button key={item} type="button" onClick={() => setRole(item)} aria-pressed={role === item} className={`border px-3 py-1.5 text-[11px] transition-colors ${role === item ? "border-[#3f654b] bg-[#3f654b] text-white" : "border-[#d7ddd2] bg-[#faf9f4] text-[#59695b] hover:border-[#8aa08a]"}`}>{item}</button>)}</div>
    </div>
  );
}

  function PreviousLandingPage() {
  return (
    <main id="top" className="landing-dark min-h-screen overflow-hidden bg-[#111712] text-[#e8ece3] antialiased selection:bg-[#344b39] selection:text-[#f1f4eb]">
      <header className="sticky top-0 z-50 border-b border-[#e2e3da] bg-[#f6f4ed]/95 backdrop-blur-md"><nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-12"><Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="PARK home"><img src="/logo-square.png" alt="" className="aspect-square h-9 w-9 object-contain" /><span className="font-serif text-xl text-[#315540]">PARK</span></Link><div className="hidden items-center gap-7 text-[13px] text-[#5f6c60] md:flex"><a href="#why" className="hover:text-[#284c36]">Why PARK</a><a href="#roles" className="hover:text-[#284c36]">For your team</a><a href="#workflow" className="hover:text-[#284c36]">How it works</a><a href="#contact" className="hover:text-[#284c36]">Contact</a></div><div className="flex shrink-0 items-center gap-2 sm:gap-4"><Link to="/login" className="hidden text-[13px] font-medium text-[#526356] hover:text-[#284c36] sm:block">Sign in</Link><Link to="/signup"><Button size="sm" className="rounded-none bg-[#365b43] px-4 text-white hover:bg-[#294a35]">Get started</Button></Link></div></nav></header>
      <section className="relative border-b border-[#2c3930]"><div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(to right, #647365 1px, transparent 1px), linear-gradient(to bottom, #647365 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 85%)" }} /><div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-12 lg:pb-24 lg:pt-20"><div className="relative z-10"><div className="landing-reveal inline-flex items-center gap-2 border border-[#405543] bg-[#1b261e] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#bbd0ae]"><span className="h-1.5 w-1.5 rounded-full bg-[#a4bf91]" />The academic operations platform</div><h1 className="landing-reveal mt-6 max-w-[660px] font-serif text-[42px] leading-[1.08] text-[#e8ece3] sm:text-6xl lg:text-[68px]" style={{ animationDelay: "80ms" }}>Final-year project supervision, <em className="font-normal text-[#a9c19b]">finally organised.</em></h1><p className="landing-reveal mt-6 max-w-[510px] text-[15px] leading-7 text-[#b0bbae] sm:text-base" style={{ animationDelay: "150ms" }}>PARK replaces scattered chats, printed chapters, and “who is supervising who?” with one calm workspace built for modern universities.</p><div className="landing-reveal mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "220ms" }}><Link to="/signup"><Button size="lg" className="group h-12 w-full rounded-none bg-[#668363] px-6 text-sm text-white hover:bg-[#789470] sm:w-auto">Bring PARK to your institution <span className="ml-3 transition-transform group-hover:translate-x-1">&rarr;</span></Button></Link><a href="#workflow"><Button variant="secondary" size="lg" className="h-12 w-full rounded-none border-[#465548] bg-[#1a241d] px-6 text-sm text-[#dce6d6] hover:bg-[#26352a] sm:w-auto">See how it works</Button></a></div><div className="landing-reveal mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#344137] pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98a594] sm:text-[11px]" style={{ animationDelay: "290ms" }}><span>Designed for ambitious departments</span><span className="hidden h-1 w-1 rounded-full bg-[#a3ad9f] sm:block" /><span>University</span><span>Faculty</span><span>Academia</span></div></div><div className="landing-reveal lg:pl-3" style={{ animationDelay: "130ms" }}><ProductPreview /></div></div>
        <div className="relative border-t border-[#e2e3da] bg-[#eeefe6]"><div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-[#d9ddd2] px-5 sm:px-8 lg:px-12">{[["1,200+", "Students onboarded"], ["340+", "Supervisors active"], ["8,500+", "Chapters reviewed"]].map(([value, label]) => <div key={label} className="py-5 pr-3 sm:py-6 sm:px-6 first:sm:pl-0 last:sm:pr-0"><p className="font-serif text-2xl text-[#315540] sm:text-3xl">{value}</p><p className="mt-1 text-[10px] text-[#758075] sm:text-xs">{label}</p></div>)}</div></div>
      </section>
      <section id="why" className="scroll-mt-20 py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"><div className="grid gap-8 border-b border-[#dcdfd5] pb-8 sm:grid-cols-[0.72fr_1.28fr] sm:items-end sm:gap-12 sm:pb-10"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71866c]">One operating model</p><h2 className="mt-3 max-w-md font-serif text-3xl leading-tight text-[#253f30] sm:text-4xl">Everything academic teams need, in one place.</h2></div><p className="max-w-xl text-sm leading-7 text-[#687369] sm:justify-self-end">PARK turns disconnected processes into a shared rhythm, so every person can focus on the part of the journey they own.</p></div><div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-[#dcdfd5] sm:pt-8">{[["01", "Clear relationships", "Pair students and supervisors with confidence, then keep every responsibility visible."], ["02", "Progress that moves", "Track meetings, chapters, submissions, and next steps without the admin fog."], ["03", "Records you can trust", "Give every role the right view with secure, auditable academic records."]].map(([num, title, body]) => <article key={num} className="border-b border-[#dcdfd5] py-6 sm:border-0 sm:px-7 sm:py-1 first:sm:pl-0 last:sm:pr-0"><span className="font-serif text-lg text-[#91a18b]">{num}</span><h3 className="mt-4 font-serif text-xl text-[#2c4937]">{title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-[#748075]">{body}</p></article>)}</div></div></section>
      <section id="roles" className="scroll-mt-20 border-y border-[#dfe1d7] bg-[#eeefe6] py-20 sm:py-28"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16 lg:px-12"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71866c]">Built around your people</p><h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight text-[#253f30] sm:text-4xl">A clearer view for every role.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[#687369]">From institutional oversight to the next student milestone, PARK gives every person a focused workspace, connected to the bigger picture.</p><div className="mt-8 space-y-4 border-t border-[#d8ddd1] pt-6">{[["Administrators", "Institution-wide visibility and controlled access."], ["Coordinators", "Department oversight, assignments, and student progress."], ["Supervisors", "A focused view of assigned students and their work."], ["Students", "A clear place for chapters, meetings, and next steps."]].map(([title, body]) => <div key={title} className="grid grid-cols-[112px_1fr] gap-3 text-xs"><span className="font-semibold text-[#405d48]">{title}</span><span className="leading-5 text-[#768075]">{body}</span></div>)}</div></div><ProductPreview /></div></section>
      <section id="workflow" className="scroll-mt-20 py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"><div className="mb-12 flex flex-col justify-between gap-4 border-b border-[#dcdfd5] pb-7 sm:mb-14 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71866c]">A better academic rhythm</p><h2 className="mt-3 font-serif text-3xl text-[#253f30] sm:text-4xl">From first pairing to final submission.</h2></div><p className="max-w-sm text-sm leading-6 text-[#778177]">A connected journey for students and the teams who guide them.</p></div><div className="grid gap-8 sm:grid-cols-3 sm:gap-10">{STEPS.map((step) => <article key={step.num} className="border-t border-[#9eae9b] pt-5"><span className="font-serif text-4xl text-[#91a18b]">{step.num}</span><h3 className="mt-5 font-serif text-xl text-[#2c4937]">{step.title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-[#748075]">{step.body}</p></article>)}</div></div></section>
      <section className="border-y border-[#dfe1d7] bg-[#eeefe6] py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71866c]">Designed for your reality</p><h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight text-[#253f30] sm:text-4xl">Built for the network you have, not the one you wish you had.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#687369]">We didn't import Silicon Valley assumptions. PARK was built with Nigerian campuses in mind, from data costs to device constraints.</p><ul className="mt-7 space-y-3">{["Resumable uploads, so a dropped connection doesn't mean starting over", "Lightweight pages that load fast, even on 2G", "Mobile-optimized review tools for supervisors", "SMS fallback for critical deadline reminders"].map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#526254]"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#78916c]" />{item}</li>)}</ul></div><div className="border-t border-[#d5dbd0]">{FEATURES.map((feature, index) => <article key={feature.title} className="grid grid-cols-[38px_1fr] gap-4 border-b border-[#d5dbd0] py-5 sm:py-6"><span className="font-serif text-lg text-[#91a18b]">0{index + 1}</span><div><h3 className="font-serif text-lg text-[#2c4937]">{feature.title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-[#748075]">{feature.body}</p></div></article>)}</div></div><div className="mt-20 border-t border-[#d5dbd0] pt-10 sm:mt-24"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71866c]">The old way</p><h2 className="mt-3 font-serif text-3xl text-[#253f30]">What PARK fixes.</h2><div className="mt-8 grid gap-x-10 sm:grid-cols-2">{PROBLEMS.map((problem) => <article key={problem.title} className="grid grid-cols-[38px_1fr] gap-4 border-t border-[#d5dbd0] py-5"><span className="font-serif text-lg text-[#91a18b]">{String(PROBLEMS.indexOf(problem) + 1).padStart(2, "0")}</span><div><h3 className="font-serif text-lg text-[#2c4937]">{problem.title}</h3><p className="mt-2 text-sm leading-6 text-[#748075]">{problem.body}</p></div></article>)}</div></div></div></section>
      <section className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"><div className="mb-10 border-b border-[#dcdfd5] pb-7 sm:mb-12"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71866c]">Trusted on campus</p><h2 className="mt-3 font-serif text-3xl text-[#253f30] sm:text-4xl">From the people using it.</h2></div><div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-[#dcdfd5]">{TESTIMONIALS.map((testimonial, index) => <figure key={testimonial.name} className={`border-b border-[#dcdfd5] py-6 sm:border-0 sm:px-7 sm:py-2 ${index === 0 ? "sm:pl-0" : ""} ${index === 2 ? "sm:pr-0" : ""}`}><blockquote className="font-serif text-lg leading-7 text-[#405847]">“{testimonial.quote}”</blockquote><figcaption className="mt-6 border-t border-[#e2e4dc] pt-4"><p className="text-sm font-semibold text-[#334a39]">{testimonial.name}</p><p className="mt-1 text-xs text-[#818a80]">{testimonial.role}</p></figcaption></figure>)}</div></div></section>
      <section id="contact" className="scroll-mt-20 bg-[#355640] text-[#f8f7ef]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c4d1bb]">Ready when your department is</p><h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">Make academic progress feel less complicated.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#d4ddd0]">Give your teams a shared place to guide, manage, and complete great work.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link to="/signup"><Button size="lg" className="h-12 w-full rounded-none bg-[#f5f3e9] px-6 text-sm text-[#31523c] hover:bg-white sm:w-auto">Talk to the PARK team <span className="ml-3">&rarr;</span></Button></Link><a href="mailto:hello@park.edu.ng" className="px-2 py-2 text-center text-xs text-[#e2e8dc] underline decoration-[#8ca28a] underline-offset-4 hover:text-white">hello@park.edu.ng</a></div></div></section>
      <footer className="bg-[#f6f4ed]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><Link to="/" className="flex items-center gap-2"><img src="/logo-square.png" alt="" className="aspect-square h-7 w-7 object-contain" /><span className="font-serif text-[#315540]">PARK</span><span className="ml-2 hidden text-xs text-[#859086] sm:inline">Academic operations, thoughtfully organised.</span></Link><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#758075]"><a href="#roles" className="hover:text-[#315540]">Roles</a><a href="#workflow" className="hover:text-[#315540]">How it works</a><Link to="/privacy" className="hover:text-[#315540]">Privacy</Link><Link to="/terms" className="hover:text-[#315540]">Terms</Link><a href="mailto:hello@park.edu.ng" className="hover:text-[#315540]">Contact</a><Link to="/login" className="font-medium text-[#526d57] hover:text-[#315540]">Sign in</Link></div><p className="text-[10px] text-[#92988f]">&copy; {new Date().getFullYear()} PARK</p></div></footer>
    </main>
  );
}

export function LandingPage() {
  return (
    <main id="top" className="landing-dark min-h-screen overflow-hidden bg-[#111712] text-[#e8ece3] antialiased selection:bg-[#344b39] selection:text-[#f1f4eb]">
      <header className="sticky top-0 z-50 border-b border-[#2c3930] bg-[#111712]/95 backdrop-blur-md">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="PARK home"><img src="/logo-square.png" alt="" className="aspect-square h-9 w-9 object-contain" /><span className="font-serif text-xl text-[#b9cda9]">PARK</span></Link>
          <div className="hidden items-center gap-7 text-[13px] text-[#a8b2a6] md:flex"><a href="#platform" className="hover:text-[#d7e6ca]">Platform</a><a href="#roles" className="hover:text-[#d7e6ca]">Workspaces</a><a href="#security" className="hover:text-[#d7e6ca]">Security</a><a href="#contact" className="hover:text-[#d7e6ca]">Contact</a></div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4"><Link to="/login" className="hidden text-[13px] font-medium text-[#b9cda9] sm:block">Sign in</Link><Link to="/signup"><Button size="sm" className="rounded-none bg-[#668363] px-4 text-white hover:bg-[#789470]">Get started</Button></Link></div>
        </nav>
      </header>

      <section className="relative border-b border-[#2c3930]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(to right, #647365 1px, transparent 1px), linear-gradient(to bottom, #647365 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 85%)" }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-12 lg:pb-20 lg:pt-20">
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 border border-[#405543] bg-[#1b261e] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#b9cda9]"><span className="h-1.5 w-1.5 rounded-full bg-[#a4bf91]" />Academic operations, connected</p>
            <h1 className="mt-6 max-w-[660px] font-serif text-[42px] leading-[1.08] text-[#e8ece3] sm:text-6xl lg:text-[68px]">Final-year project supervision, <em className="font-normal text-[#a9c19b]">finally organised.</em></h1>
            <p className="mt-6 max-w-[510px] text-[15px] leading-7 text-[#b0bbae] sm:text-base">PARK brings student-supervisor relationships, academic work, and institutional coordination into one secure workspace.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/signup"><Button size="lg" className="group h-12 w-full rounded-none bg-[#668363] px-6 text-sm text-white hover:bg-[#789470] sm:w-auto">Create a student account <span className="ml-3 transition-transform group-hover:translate-x-1">&rarr;</span></Button></Link><a href="#platform"><Button variant="secondary" size="lg" className="h-12 w-full rounded-none border-[#465548] bg-[#1a241d] px-6 text-sm text-[#dce6d6] hover:bg-[#26352a] sm:w-auto">Explore the platform</Button></a></div>
            <p className="mt-4 max-w-md text-xs leading-5 text-[#98a594]">Student self-registration is available. Supervisors and coordinators are set up by their department.</p>
          </div>
          <div className="lg:pl-3"><ProductPreview /></div>
        </div>
        <div className="border-t border-[#2c3930] bg-[#151e18]"><div className="mx-auto grid max-w-7xl divide-y divide-[#344238] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">{[["Institutional structure", "Institutions, departments, and roles"], ["Connected supervision", "Student-supervisor pairings and progress"], ["Academic records", "Meetings, submissions, and documents"]].map(([title, detail]) => <div key={title} className="py-4 sm:px-5 sm:py-5 first:sm:pl-0 last:sm:pr-0"><p className="text-xs font-medium text-[#dce6d6]">{title}</p><p className="mt-1 text-[11px] text-[#a8b2a6]">{detail}</p></div>)}</div></div>
      </section>

      <section id="platform" className="scroll-mt-20 py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 border-b border-[#344238] pb-8 sm:grid-cols-[0.8fr_1.2fr] sm:items-end sm:gap-12 sm:pb-10"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a9c19b]">One academic operating model</p><h2 className="mt-3 max-w-md font-serif text-3xl leading-tight text-[#e8ece3] sm:text-4xl">The work around every student project, in one place.</h2></div><p className="max-w-xl text-sm leading-7 text-[#b0bbae] sm:justify-self-end">Replace fragmented records and manual follow-up with connected workflows for the people guiding, completing, and overseeing academic projects.</p></div>
        <div className="grid gap-x-10 sm:grid-cols-2">
          {[
            ["01", "Academic registry", "Organize institutions, departments, user profiles, and role-based onboarding in one shared system."],
            ["02", "Supervisor-student pairing", "Manage academic relationships with clear ownership and departmental oversight."],
            ["03", "Chapters and submissions", "Keep project documents and submission progress connected to the student-supervisor workflow."],
            ["04", "Meetings and communication", "Bring meeting records and academic conversations into the same coordination space."],
            ["05", "Repository and documents", "Organize academic artifacts and project records for easier access and traceability."],
            ["06", "Dashboards and oversight", "Give institutional teams visibility into project activity and student progress."],
          ].map(([num, title, body]) => <article key={num} className="grid grid-cols-[42px_1fr] gap-4 border-b border-[#344238] py-6 sm:py-7"><span className="font-serif text-lg text-[#a9c19b]">{num}</span><div><h3 className="font-serif text-xl text-[#e0e8dc]">{title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#a8b2a6]">{body}</p></div></article>)}
        </div>
      </div></section>

      <section id="roles" className="scroll-mt-20 border-y border-[#344238] bg-[#151e18] py-20 sm:py-24"><div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16 lg:px-12"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a9c19b]">Built around your people</p><h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight text-[#e8ece3] sm:text-4xl">A focused workspace for every role.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[#b0bbae]">Each role sees the tools and records relevant to its responsibilities, while the institution stays connected to the bigger picture.</p><div className="mt-8 space-y-4 border-t border-[#344238] pt-6">{[["Administrators", "Manage institutional structure, access, and oversight."], ["Coordinators", "Coordinate department users, assignments, and student progress."], ["Supervisors", "Guide assigned students through meetings and project work."], ["Students", "Follow supervisor relationships, submissions, and next steps."]].map(([title, body]) => <div key={title} className="grid grid-cols-[112px_1fr] gap-3 text-xs"><span className="font-semibold text-[#c3d4b7]">{title}</span><span className="leading-5 text-[#a8b2a6]">{body}</span></div>)}</div></div><div className="hidden lg:block"><p className="mb-3 text-[10px] uppercase tracking-[0.13em] text-[#98a594]">Switch roles in the preview above to explore each workspace</p><div className="border-t border-[#344238] pt-5 text-sm leading-7 text-[#b0bbae]">PARK connects role-aware access with shared academic records, so a student’s next milestone, a supervisor’s review work, and a coordinator’s department view all belong to the same academic workflow.</div></div></div></section>

      <section id="workflow" className="scroll-mt-20 py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"><div className="mb-12 flex flex-col justify-between gap-4 border-b border-[#344238] pb-7 sm:mb-14 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a9c19b]">A connected project journey</p><h2 className="mt-3 font-serif text-3xl text-[#e8ece3] sm:text-4xl">From first pairing to final submission.</h2></div><p className="max-w-sm text-sm leading-6 text-[#a8b2a6]">Bring people, progress, and academic records together from the start.</p></div><div className="grid gap-8 sm:grid-cols-3 sm:gap-10">{STEPS.map((step) => <article key={step.num} className="border-t border-[#6b8068] pt-5"><span className="font-serif text-4xl text-[#a9c19b]">{step.num}</span><h3 className="mt-5 font-serif text-xl text-[#e0e8dc]">{step.title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-[#a8b2a6]">{step.body.replace(" in real time", "")}</p></article>)}</div></div></section>

      <section id="security" className="scroll-mt-20 border-y border-[#344238] bg-[#151e18] py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a9c19b]">Governance by design</p><h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight text-[#e8ece3] sm:text-4xl">Secure access. Structured records. Clear responsibility.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[#b0bbae]">PARK uses authenticated access, role-based permissions, validated inputs, and scoped academic records to support accountable institutional workflows.</p></div><div className="grid gap-x-8 sm:grid-cols-2">{[["Role-based permissions", "Actions follow the user's institutional role and academic scope."], ["Verified authentication", "Supabase Auth and JWT verification protect authenticated access."], ["Validated data", "Pydantic schemas and structured services help preserve data integrity."], ["Traceable files and records", "Structured storage supports academic document organization and retrieval."]].map(([title, body]) => <article key={title} className="border-t border-[#344238] py-5"><h3 className="font-serif text-lg text-[#dce6d6]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#a8b2a6]">{body}</p></article>)}</div></div><div className="mt-12 border-t border-[#344238] pt-7"></div></div></section>

      <section id="contact" className="scroll-mt-20 bg-[#20382a]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c4d1bb]">Academic coordination, connected</p><h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-[#f0f2e9] sm:text-5xl">Make academic progress easier to see and manage.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#d4ddd0]">Give students, supervisors, coordinators, and administrators a shared place to manage the academic project journey.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link to="/signup"><Button size="lg" className="h-12 w-full rounded-none bg-[#668363] px-6 text-sm text-white hover:bg-[#789470] sm:w-auto">Create a student account <span className="ml-3">&rarr;</span></Button></Link><a href="mailto:hello@park.edu.ng" className="px-2 py-2 text-center text-xs text-[#e2e8dc] underline decoration-[#8ca28a] underline-offset-4 hover:text-white">Contact PARK</a></div></div></section>

      <footer className="bg-[#111712]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><Link to="/" className="flex items-center gap-2"><img src="/logo-square.png" alt="" className="aspect-square h-7 w-7 object-contain" /><span className="font-serif text-[#b9cda9]">PARK</span><span className="ml-2 hidden text-xs text-[#a8b2a6] sm:inline">Academic operations, thoughtfully organised.</span></Link><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#a8b2a6]"><a href="#platform" className="hover:text-[#d7e6ca]">Platform</a><a href="#roles" className="hover:text-[#d7e6ca]">Workspaces</a><Link to="/privacy" className="hover:text-[#d7e6ca]">Privacy</Link><Link to="/terms" className="hover:text-[#d7e6ca]">Terms</Link><a href="mailto:hello@park.edu.ng" className="hover:text-[#d7e6ca]">Contact</a><Link to="/login" className="font-medium text-[#b9cda9]">Sign in</Link></div><p className="text-[10px] text-[#98a594]">&copy; {new Date().getFullYear()} PARK</p></div></footer>
    </main>
  );
}