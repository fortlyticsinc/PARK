/**
 * PARK — Bottom Tab Navigation (mobile-first, per the low-end
 * Android / thumb-reachable-nav constraint)
 */
import { NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface Tab {
  to: string;
  label: string;
  roles?: Array<"student" | "supervisor" | "coordinator" | "admin">;
  icon: React.ReactNode;
}

const ICONS = {
  pairings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
    </svg>
  ),
  chapters: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  meetings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  repository: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  home: (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: ICONS.home },
  { to: "/dashboard", label: "Dashboard", roles: ["coordinator", "admin"], icon: ICONS.dashboard },
  { to: "/team", label: "Team", roles: ["coordinator", "admin"], icon: ICONS.team },
  { to: "/pairings", label: "Pairings", icon: ICONS.pairings },
  // Chapters is scoped server-side to student/supervisor pairings —
  // coordinator was never included, and admin is removed here because
  // chapter_service.list_chapters() requires a pairing_id for
  // coordinator/admin requests that this page never sends, which
  // previously left admin looking at a permanent error screen.
  { to: "/chapters", label: "Chapters", roles: ["student", "supervisor"], icon: ICONS.chapters },
  { to: "/meetings", label: "Meetings", icon: ICONS.meetings },
  // Messages (Chats + Announcements) are also scoped to student/
  // supervisor pairings — admin has no department_id to filter
  // conversations by and no personal announcement feed, so hide it
  // here rather than let it silently show an empty inbox or 403.
  { to: "/messages", label: "Messages", roles: ["student", "supervisor"], icon: ICONS.messages },
  { to: "/repository", label: "Repository", icon: ICONS.repository },
];

export function BottomNav() {
  const { user } = useAuthStore();
  const visibleTabs = TABS.filter((tab) => !tab.roles || (user && tab.roles.includes(user.role)));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-800 bg-stone-950/95 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
                isActive ? "text-sage-500" : "text-stone-500 hover:text-stone-300"
              )
            }
          >
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
