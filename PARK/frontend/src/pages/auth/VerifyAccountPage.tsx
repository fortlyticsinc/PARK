import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export function VerifyAccountPage() {
  const [email] = useState(
    sessionStorage.getItem("p_ark_pending_verification_email") || "",
  );
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    if (!email) {
      setError("Return to signup and enter your email address to request another verification email.");
      return;
    }
    setIsResending(true);
    setFeedback(null);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
    });
    if (resendError) setError("We couldn't request another link just now. Please try again shortly.");
    else setFeedback("A new verification email has been requested. Check your inbox and spam folder.");
    setIsResending(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-stone-800 bg-stone-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-sage-700/50 bg-sage-950/50 text-sage-300" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" /><path strokeLinecap="round" strokeLinejoin="round" d="m5 6 7 6 7-6" /><path strokeLinecap="round" strokeLinejoin="round" d="m9 17 2 2 4-4" /></svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-400">Account created</p>
        <h1 className="mt-2 font-serif text-3xl text-stone-100">Congratulations{email ? ", you're nearly there" : ""}.</h1>
        <p className="mt-4 text-sm leading-6 text-stone-300">
          Check your inbox for a verification link sent to{" "}
          <span className="font-medium text-stone-100">{email || "the email address you registered"}</span>.
        </p>
        <div className="mt-5 border-l-2 border-sage-600 bg-stone-950/60 px-4 py-3">
          <p className="text-sm font-medium text-sage-200">Verify your email to continue.</p>
          <p className="mt-1 text-xs leading-5 text-stone-400">Open the verification email and follow its link. Your workspace will be ready once your address is confirmed.</p>
        </div>
        {feedback && <p role="status" className="mt-4 text-sm text-sage-300">{feedback}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={resend} isLoading={isResending} className="w-full sm:flex-1">Resend verification email</Button>
          
        </div>
        <p className="mt-5 text-center text-xs text-stone-500">No email yet? Check spam, then request another verification message.</p>
      </section>
    </main>
  );
}