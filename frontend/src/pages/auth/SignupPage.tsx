/**
 * PARK — Student Signup (self-registration, students only)
 * Supervisor/coordinator accounts are NEVER created here — supervisors
 * are added by their coordinator, coordinators by an admin, both via
 * the internal user-management flow, not public signup.
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface Institution { id: string; name: string; code: string | null; academic_session: string | null; }
interface Department { id: string; institution_id: string; name: string; code: string | null; }

export function SignupPage() {
  const navigate = useNavigate();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const selectedInstitution = institutions.find((institution) => institution.id === institutionId);
  const currentAcademicSession = selectedInstitution?.academic_session || "Not set by your institution";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Institutions load once; departments reload whenever institution changes.
  useEffect(() => {
    api.get<{ institutions: Institution[] }>("/v1/institutions").then((res) => {
      if (res.data) setInstitutions(res.data.institutions);
    });
  }, []);

  useEffect(() => {
    if (!institutionId) {
      setDepartments([]);
      return;
    }
    setIsLoadingDepartments(true);
    api.get<{ departments: Department[] }>(`/v1/departments?institution_id=${institutionId}`).then((res) => {
      if (res.data) setDepartments(res.data.departments);
    }).finally(() => setIsLoadingDepartments(false));
  }, [institutionId]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!institutionId || !departmentId || !selectedInstitution?.academic_session) {
      setError("Select your institution and department. If no academic session is set, contact your institution administrator.");
      return;
    }

    setIsLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
        data: {
          full_name: fullName,
          matric_number: matricNumber,
          department_id: departmentId,
          institution_id: institutionId,
        },
      },
    });

    if (signupError || !data.user) {
      setError(signupError?.message || "Signup failed — please try again");
      setIsLoading(false);
      return;
    }

    if (data.session) await supabase.auth.signOut();

    sessionStorage.setItem("p_ark_pending_verification_email", email);
    void api.post<{ email_sent: boolean }>("/v1/auth/signup-event", {
      supabase_user_id: data.user.id,
    });
    navigate("/verify-account", { replace: true, state: { email } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="/logo-square.png" alt="PARK" className="mx-auto mb-3 aspect-square h-14 w-14 object-contain" />
          <h1 className="font-serif text-2xl text-sage-500">Create your student account</h1>
          <p className="mt-1 text-xs text-stone-500">
            Supervisor or coordinator? Ask your department to set up your account instead.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <section className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/40 p-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-200">Academic placement</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">Choose your institution and department. Your institution sets the academic session.</p>
            </div>
            <Select
              label="Institution"
              value={institutionId}
              onChange={(e) => { setInstitutionId(e.target.value); setDepartmentId(""); }}
              options={[{ value: "", label: "Select your institution" }, ...institutions.map((institution) => ({ value: institution.id, label: institution.name }))]}
              required
            />
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[{ value: "", label: isLoadingDepartments ? "Loading departments..." : "Select your department" }, ...departments.map((department) => ({ value: department.id, label: department.name }))]}
              disabled={!institutionId || isLoadingDepartments || departments.length === 0}
              required
            />
            <div className="space-y-1.5">
              <label htmlFor="academic-session" className="block text-sm font-medium text-stone-300">Current academic session</label>
              <input
                id="academic-session"
                value={currentAcademicSession}
                readOnly
                aria-readonly="true"
                className="min-h-11 w-full cursor-not-allowed rounded-lg border border-stone-800 bg-stone-950/70 px-3 py-2 text-sm text-stone-300 outline-none"
              />
              <p className="text-[11px] text-stone-500">Set by your institution administrator; students cannot change it.</p>
            </div>
            {institutionId && !isLoadingDepartments && departments.length === 0 && (
              <p className="text-xs text-amber-300">No departments are available for this institution yet. Contact your administrator.</p>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-200">Your details</h2>
              <p className="mt-1 text-xs text-stone-500">Use the name and student number associated with your academic records.</p>
            </div>
            <Input label="Full name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input label="Student email" type="email" placeholder="you@example.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Matric number" placeholder="Your student number" value={matricNumber} onChange={(e) => setMatricNumber(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Minimum 8 characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </section>

          {error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">{error}</p>
          )}
          <Button type="submit" className="w-full" isLoading={isLoading} disabled={!selectedInstitution?.academic_session || departments.length === 0}>Create student account</Button>
        </form>

        <p className="text-center text-xs text-stone-500">
          Already have an account? <Link to="/login" className="text-sage-500 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
