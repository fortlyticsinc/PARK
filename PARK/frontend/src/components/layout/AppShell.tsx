/**
 * PARK — App Shell
 * Top identity bar (logo + role + logout) and bottom tab nav. Pages
 * render via <Outlet/> in between.
 */
import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { BottomNav } from "./BottomNav";
import { NotificationBell } from "./NotificationBell";
import { useTheme } from "@/hooks/useTheme";
import { ChangePasswordPage } from "@/pages/auth/ChangePasswordPage";

export function AppShell() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  if (user?.must_change_password) return <ChangePasswordPage />;

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <img src="/logo-square.png" alt="PARK" className="aspect-square h-5 w-5 object-contain" />
          <span className="font-serif text-sage-500">PARK</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className="capitalize">{user?.full_name} · {user?.role}</span>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "light"}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-stone-200 shadow-sm transition-colors hover:bg-stone-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sage-500/50"
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.4 15.2A8.5 8.5 0 1 1 8.8 3.6 6.7 6.7 0 0 0 20.4 15.2Z" />
              </svg>
            )}
          </button>
          <button onClick={logout} className="text-stone-400 hover:text-red-400">
            Log out
          </button>
        </div>
      </div>

      <div className="pb-20">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  );
}
