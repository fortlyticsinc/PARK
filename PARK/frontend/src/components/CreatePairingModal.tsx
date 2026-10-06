// frontend/src/components/CreatePairingModal.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  full_name: string;
  email: string;
  matric_number?: string;
  department_id?: string | null;
  institution_id?: string | null;
}

interface SearchInputProps {
  role: "student" | "supervisor";
  label: string;
  onSelect: (user: User) => void;
  selected: User | null;
}

function UserSearchInput({ role, label, onSelect, selected }: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      const res = await api.get<{ items: User[] }>(
        `/v1/users?role=${role}&search=${encodeURIComponent(query)}&active_only=true&limit=10`
      );
      if (res.data) { setResults(res.data.items); setOpen(true); }
      setLoading(false);
    }, 300);
  }, [query, role]);

  if (selected) {
    return (
      <div className="space-y-1">
        <label className="text-sm text-stone-400">{label}</label>
        <div className="flex items-center justify-between rounded-lg border border-sage-700/50 bg-stone-900 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-stone-100">{selected.full_name}</p>
            <p className="text-xs text-stone-500">{selected.email}{selected.matric_number ? ` · ${selected.matric_number}` : ""}</p>
          </div>
          <button onClick={() => onSelect(null as any)} className="text-xs text-red-400 hover:text-red-300">
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-1">
      <label className="text-sm text-stone-400">{label}</label>
      <Input
        placeholder={`Search by name or email...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && <p className="text-xs text-stone-500 px-1">Searching...</p>}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full rounded-lg border border-stone-800 bg-stone-900 shadow-xl">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => { onSelect(u); setOpen(false); setQuery(""); }}
              className="flex w-full flex-col px-3 py-2 text-left hover:bg-stone-800 first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="text-sm text-stone-100">{u.full_name}</span>
              <span className="text-xs text-stone-500">{u.email}{u.matric_number ? ` · ${u.matric_number}` : ""}</span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2">
          <p className="text-sm text-stone-500">No {role}s found</p>
        </div>
      )}
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePairingModal({ isOpen, onClose, onSuccess }: Props) {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<User | null>(null);
  const [supervisor, setSupervisor] = useState<User | null>(null);
  const [institutions, setInstitutions] = useState<{ id: string; name: string; academic_session: string | null }[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [departmentId, setDepartmentId] = useState(user?.department_id || "");
  const [institutionId, setInstitutionId] = useState(user?.institution_id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const academicYear = institutions.find((institution) => institution.id === institutionId)?.academic_session || "";

  useEffect(() => {
    if (!isOpen) return;
    api.get<{ institutions: { id: string; name: string; academic_session: string | null }[] }>("/v1/institutions")
      .then((response) => { if (response.data) setInstitutions(response.data.institutions); });
  }, [isOpen]);

  useEffect(() => {
    if (!departmentId && user?.department_id) setDepartmentId(user.department_id);
    if (!institutionId && user?.institution_id) setInstitutionId(user.institution_id);
  }, [user?.department_id, user?.institution_id, departmentId, institutionId]);

  useEffect(() => {
    const selectedScope = student || supervisor;
    if (!selectedScope) return;
    if (selectedScope.department_id) setDepartmentId(selectedScope.department_id);
    if (selectedScope.institution_id) setInstitutionId(selectedScope.institution_id);
  }, [student, supervisor]);

  const handleSubmit = async () => {
    if (!student || !supervisor) {
      setError("Select both a student and a supervisor");
      return;
    }
    if (!academicYear) {
      setError("The selected institution has no current academic session. Ask an administrator to set one.");
      return;
    }
    if (!departmentId || !institutionId) {
      setError("The selected users are missing department or institution information");
      return;
    }
    setIsLoading(true);
    setError(null);
    const res = await api.post("/v1/pairings", {
      student_id: student.id, supervisor_id: supervisor.id,
      department_id: departmentId, institution_id: institutionId,
      academic_year: academicYear, project_title: projectTitle || null,
    });
    setIsLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-950 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-stone-100">Create Pairing</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">✕</button>
        </div>

        <UserSearchInput role="student" label="Student *" onSelect={setStudent} selected={student} />
        <UserSearchInput role="supervisor" label="Supervisor *" onSelect={setSupervisor} selected={supervisor} />

        <Input label="Current academic session" value={academicYear || "Not set by institution"} readOnly aria-readonly="true" />

        <div className="space-y-1">
          <label className="text-sm text-stone-400">Project Title (optional)</label>
          <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="e.g. IoT-Based Irrigation System" />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} isLoading={isLoading} disabled={!academicYear}>Create Pairing</Button>
        </div>
      </div>
    </div>
  );
}