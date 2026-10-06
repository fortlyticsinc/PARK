/**
 * PARK — Login
 * Real path: Supabase email/password -> /v1/auth/sync -> /v1/auth/me
 * All credentials are verified by the configured local Supabase Auth service.
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken, setUser } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.session) {
      setError(authError?.message || "Login failed — check your email and password");
      setIsLoading(false);
      return;
    }

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      setToken(null);
      setError("Please verify your email address before signing in.");
      setIsLoading(false);
      return;
    }

    setToken(data.session.access_token);

    const syncResponse = await api.post("/v1/auth/sync", {
      full_name: data.user?.user_metadata?.full_name || null,
      matric_number: data.user?.user_metadata?.matric_number || null,
      department_id: data.user?.user_metadata?.department_id || null,
      institution_id: data.user?.user_metadata?.institution_id || null,
    });

    if (syncResponse.error) {
      setError(syncResponse.error.message || "Could not finish signing you in.");
      setIsLoading(false);
      return;
    }

    const meResponse = await api.get("/v1/auth/me");
    if (meResponse.data) {
      setUser(meResponse.data as any);
      navigate("/");
    } else {
      setError("Signed in, but couldn't load your profile. Contact your coordinator.");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src="/logo-square.png" alt="PARK" className="mx-auto mb-3 aspect-square h-16 w-16 object-contain" />
          <h1 className="font-serif text-3xl text-sage-500">PARK</h1>
          <p className="mt-1 text-sm text-stone-500">Project Approval and Resolution Kit</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {searchParams.get("confirmed") === "1" && (
            <p role="status" className="rounded-lg border border-sage-800 bg-sage-950/30 p-3 text-sm text-sage-300">
              Email confirmed. Log in to continue to PARK.
            </p>
          )}
          {error && <p className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isLoading}>Log In</Button>
        </form>

      </div>
    </div>
  );
}
