/**
 * PARK — App Root
 * "/" shows the public landing page to anonymous visitors, and the
 * real role-aware HomePage (student/supervisor/coordinator/admin) to
 * anyone already logged in.
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import { LandingPage } from "@/pages/marketing/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { VerifyAccountPage } from "@/pages/auth/VerifyAccountPage";
import { PrivacyPage, TermsPage } from "@/pages/legal/LegalPages";
import { HomePage } from "@/pages/HomePage";
import { PairingsPage } from "@/pages/PairingsPage";
import { ChaptersPage } from "@/pages/chapters/ChaptersPage";
import { MeetingsPage } from "@/pages/MeetingsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SupervisorWorkloadPage } from "@/pages/SupervisorWorkloadPage";
import { TeamPage } from "@/pages/team/TeamPage";
import { RepositoryPage } from "@/pages/repository/RepositoryPage";
import { ProjectDetailPage } from "@/pages/repository/ProjectDetailPage";
import { CertificatePage } from "@/pages/certificate/CertificatePage";
import { VerifyCertificatePage } from "@/pages/verify/VerifyCertificatePage";
import { AtRiskList } from "@/components/dashboard/AtRisk";
import { ThemeProvider } from "@/hooks/useTheme";

function App() {
  const { isAuthenticated, isLoading, bootstrap, setToken } = useAuthStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setToken(data.session?.access_token || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setToken]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-sage-600" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
          {/* Public — "/" is only registered here for LOGGED-OUT
              visitors. Logged-in users hit the "/" route further down
              (inside AppShell), which renders the real role-aware
              HomePage instead of marketing copy. Registering "/" twice
              unconditionally previously meant HomePage never rendered —
              React Router just always used whichever "/" route came
              first, which was this one's redirect-to-/pairings branch. */}
          {!isAuthenticated && <Route path="/" element={<LandingPage />} />}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />} />
          <Route path="/verify-account" element={<VerifyAccountPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/repository" element={<RepositoryPage />} />
          <Route path="/repository/:projectId" element={<ProjectDetailPage />} />
          {/* Public certificate verification — same pattern as the
              public repository, no login required. */}
          <Route path="/verify" element={<VerifyCertificatePage />} />
          <Route path="/verify/:certificateNumber" element={<VerifyCertificatePage />} />

          {/* Authenticated */}
          <Route element={<AppShell />}>
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/pairings" element={<ProtectedRoute><PairingsPage /></ProtectedRoute>} />
            {/* Accessible to any authenticated role that has a reason
                to see it — the service layer (certificate:view) still
                enforces pairing-participant/dept-staff scoping, this
                route just doesn't add a redundant role gate. */}
            <Route path="/pairings/:pairingId/certificate" element={<ProtectedRoute><CertificatePage /></ProtectedRoute>} />
            {/* Restricted to student/supervisor — the backend's chapter
                list endpoint requires a pairing_id for coordinator/admin
                requests, which this page never sends, so those roles
                would otherwise hit a permanent 422 error page. */}
            <Route
              path="/chapters"
              element={
                <ProtectedRoute roles={["student", "supervisor"]}>
                  <ChaptersPage />
                </ProtectedRoute>
              }
            />
            <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
            {/* Restricted to student/supervisor — Chats and
                Announcements are both scoped to student/supervisor
                pairings server-side (admin has no department_id to
                filter by, and no personal broadcast feed). */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute roles={["student", "supervisor"]}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["coordinator", "admin"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute roles={["supervisor", "coordinator", "admin"]}>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/at-risk"
              element={
                <ProtectedRoute roles={["coordinator", "admin"]}>
                  <div className="min-h-screen bg-stone-950 px-4 py-4 sm:px-6">
                    <AtRiskList />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/supervisor-workload"
              element={
                <ProtectedRoute roles={["coordinator", "admin"]}>
                  <SupervisorWorkloadPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            path="*"
            element={
              <div className="flex h-screen items-center justify-center bg-stone-950 text-stone-500">
                Page not found
              </div>
            }
          />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
