import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ChangePasswordPage() {
  const { setUser } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSaving(true);
    const resetResponse = await api.post("/v1/auth/complete-password-reset", { password });
    if (resetResponse.error) {
      setError(resetResponse.error.message || "We couldn't update your password. Please try again.");
      setIsSaving(false);
      return;
    }

    const profileResponse = await api.get<{
      id: string;
      email: string;
      role: "student" | "supervisor" | "coordinator" | "admin";
      full_name: string | null;
      department_id: string | null;
      institution_id: string | null;
      avatar_url: string | null;
      must_change_password: boolean;
    }>("/v1/auth/me");
    if (profileResponse.data) setUser(profileResponse.data);
    setIsSaving(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-400">Account security</p>
        <h1 className="mt-2 font-serif text-3xl text-stone-100">Set your password</h1>
        <p className="mt-3 text-sm leading-6 text-stone-400">Your account was created with a temporary password. Choose a new password before continuing to PARK.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input label="New password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Input label="Confirm new password" type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          {error && <p role="alert" className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isSaving}>Save new password</Button>
        </form>
      </section>
    </main>
  );
}