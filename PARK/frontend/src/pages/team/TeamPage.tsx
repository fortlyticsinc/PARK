// frontend/src/pages/team/TeamPage.tsx
/**
 * PARK — Team / Staff Management
 * ===================================
 * One page, two audiences:
 *  - Admin: create departments and coordinators, and set the current academic session
 *    (assigning each coordinator to a department).
 *  - Coordinator: add supervisors into their own department, see
 *    the current roster, and bulk-import via CSV/XLSX.
 *
 * Role is read once from the auth store — nothing here trusts the
 * UI alone; every write still goes through the backend's RBAC
 * (require_permission("user:manage") etc.), so this page is a
 * convenience layer, not the security boundary.
 */
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUsers, StaffUser } from "@/hooks/useUsers";
import { useLookups } from "@/hooks/useLookups";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { BulkImportModal } from "@/components/BulkImportModal";

function CreateDepartmentForm({ institutions, onCreated }: { institutions: { id: string; name: string }[]; onCreated: () => void }) {
  const { createDepartment, isLoading, error } = useLookups();
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id || "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!institutionId && institutions[0]) setInstitutionId(institutions[0].id);
  }, [institutions]);

  const submit = async () => {
    if (!name.trim() || !institutionId) return;
    const result = await createDepartment({ institution_id: institutionId, name, code: code || undefined });
    if (result) { setName(""); setCode(""); onCreated(); }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <Select
        label="Institution"
        value={institutionId}
        onChange={(e) => setInstitutionId(e.target.value)}
        options={institutions.map((i) => ({ value: i.id, label: i.name }))}
        className="sm:w-56"
      />
      <Input label="Department name" placeholder="e.g. Computer Science" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
      <Input label="Code (optional)" placeholder="CSC" value={code} onChange={(e) => setCode(e.target.value)} className="sm:w-28" />
      <Button onClick={submit} isLoading={isLoading}>Add Department</Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function AcademicSessionControl({ institution, onSaved }: {
  institution: { id: string; name: string; academic_session: string | null };
  onSaved: () => void;
}) {
  const { updateAcademicSession, isLoading, error } = useLookups();
  const [academicSession, setAcademicSession] = useState(institution.academic_session || "");
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setMessage(null);
    if (!/^\d{4}\/\d{4}$/.test(academicSession) || Number(academicSession.slice(5)) !== Number(academicSession.slice(0, 4)) + 1) {
      setMessage("Enter consecutive years in YYYY/YYYY format, for example 2025/2026.");
      return;
    }
    const result = await updateAcademicSession(institution.id, academicSession);
    if (result) {
      setMessage(`Current session set to ${result.academic_session}.`);
      onSaved();
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-stone-800 py-4 last:border-0 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-200">{institution.name}</p>
        <p className="mt-1 text-xs text-stone-500">Current session: {institution.academic_session || "Not set"}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2 sm:justify-end">
        <Input label="Academic session" placeholder="2025/2026" value={academicSession} onChange={(event) => setAcademicSession(event.target.value)} className="w-36" />
        <Button size="sm" onClick={save} isLoading={isLoading}>Save session</Button>
      </div>
      {(message || error) && <p role="status" className={`basis-full text-xs ${error ? "text-red-400" : "text-sage-400"}`}>{error || message}</p>}
    </div>
  );
}

// ---- "Add a staff member" form, shared by admin (coordinators) and coordinator (supervisors) ----
function AddStaffForm({
  role, departments, defaultDepartmentId, defaultInstitutionId, onCreated,
}: {
  role: "coordinator" | "supervisor";
  departments: { id: string; name: string; institution_id: string }[];
  defaultDepartmentId?: string | null;
  defaultInstitutionId?: string | null;
  onCreated: () => void;
}) {
  const { createUser, isLoading, error } = useUsers();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || "");
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setLocalError(null);
    setSuccess(null);
    if (!fullName.trim() || !email.trim() || password.length < 8 || !departmentId) {
      setLocalError("Full name, email, password (8+ characters), and department are required.");
      return;
    }
    const dept = departments.find((d) => d.id === departmentId);
    const institutionId = dept?.institution_id || defaultInstitutionId || "";
    if (!institutionId) {
      setLocalError("Could not resolve institution for that department.");
      return;
    }

    const created = await createUser({
      email, password, full_name: fullName, role, phone: phone || undefined,
      department_id: departmentId, institution_id: institutionId,
    });
    if (created) {
      setSuccess(`${created.full_name} added as ${role}.`);
      setFullName(""); setEmail(""); setPassword(""); setPhone("");
      onCreated();
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <h3 className="font-serif text-sm text-stone-200">
        Add a new {role === "coordinator" ? "Coordinator" : "Supervisor"}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Full name" placeholder="Dr. Ada Obi" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" placeholder="ada.obi@university.edu.ng" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Temporary password" type="password" minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Phone (optional)" placeholder="+2348012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {/* Coordinators only ever add within their own department, so we
            lock the field when a default is supplied — one less way to
            fat-finger the wrong department. Admins get the full picker. */}
        {defaultDepartmentId ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">Department</label>
            <div className="rounded-lg border border-stone-800 bg-stone-900 px-3.5 py-2.5 text-sm text-stone-400">
              {departments.find((d) => d.id === defaultDepartmentId)?.name || "Your department"}
            </div>
          </div>
        ) : (
          <Select
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={[{ value: "", label: "Select department..." }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
          />
        )}
      </div>
      {localError && <p className="text-xs text-red-400">{localError}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-emerald-400">{success}</p>}
      <Button onClick={submit} isLoading={isLoading} size="sm">
        Add {role === "coordinator" ? "Coordinator" : "Supervisor"}
      </Button>
    </div>
  );
}

// ---- One roster row, expandable into an inline edit form ----
function RosterRow({
  staffUser, departments, canReassignDepartment, onChanged,
}: {
  staffUser: StaffUser;
  departments: { id: string; name: string }[];
  canReassignDepartment: boolean;
  onChanged: () => void;
}) {
  const { updateUser, isLoading, error } = useUsers();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(staffUser.full_name || "");
  const [phone, setPhone] = useState(staffUser.phone || "");
  const [departmentId, setDepartmentId] = useState(staffUser.department_id || "");
  const [localError, setLocalError] = useState<string | null>(null);

  const saveEdit = async () => {
    setLocalError(null);
    const result = await updateUser(staffUser.id, {
      full_name: fullName.trim() || undefined,
      phone: phone.trim() || undefined,
      department_id: canReassignDepartment ? departmentId : undefined,
    });
    if (result) {
      setIsEditing(false);
      onChanged();
    } else {
      setLocalError(error || "Could not save changes.");
    }
  };

  const toggleActive = async () => {
    const result = await updateUser(staffUser.id, { is_active: !staffUser.is_active });
    if (result) onChanged();
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-stone-100">{staffUser.full_name}</p>
          <p className="truncate text-xs text-stone-500">
            {staffUser.email}{staffUser.phone ? ` · ${staffUser.phone}` : ""}
          </p>
        </div>
        <Badge variant={staffUser.is_active ? "active" : "muted"}>
          {staffUser.is_active ? "Active" : "Inactive"}
        </Badge>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant={staffUser.is_active ? "danger" : "secondary"}
            size="sm"
            onClick={toggleActive}
            isLoading={isLoading}
          >
            {staffUser.is_active ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </div>

      {/* Inline edit form — deliberately not a separate modal, so
          editing a roster entry stays lightweight: expand, change,
          save, collapse. */}
      {isEditing && (
        <div className="mt-3 space-y-2 rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {canReassignDepartment && (
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          )}
          {localError && <p className="text-xs text-red-400">{localError}</p>}
          <Button size="sm" onClick={saveEdit} isLoading={isLoading}>Save Changes</Button>
        </div>
      )}
    </div>
  );
}

function SupervisorStudents({ supervisorId }: { supervisorId: string }) {
  const { users, isLoading, error, listUsers, setUserActivation } = useUsers();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { listUsers({ role: "student", limit: 100 }); }, [listUsers, refresh]);
  const students = users?.items || [];

  return (
    <Card className="space-y-3">
      <h2 className="font-serif text-sm text-stone-200">Students under your supervision</h2>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {isLoading && <p className="text-sm text-stone-500">Loading students...</p>}
      {students.map((student) => (
        <div key={student.id} className="flex items-center justify-between gap-3 border-t border-stone-800 pt-3">
          <div><p className="text-sm text-stone-200">{student.full_name}</p><p className="text-xs text-stone-500">{student.email}</p></div>
          <Button variant={student.is_active ? "danger" : "secondary"} size="sm" onClick={async () => { const result = await setUserActivation(student.id, !student.is_active); if (result) setRefresh((value) => value + 1); }}>
            {student.is_active ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      ))}
      {!isLoading && !students.length && <p className="text-sm text-stone-500">No students found.</p>}
    </Card>
  );
}

// ---- Roster table with live search ----
function RosterTable({
  role, departmentId, departments, canReassignDepartment = false,
}: {
  role: "coordinator" | "supervisor" | "student";
  departmentId?: string | null;
  departments: { id: string; name: string }[];
  canReassignDepartment?: boolean;
}) {
  const { users, isLoading, listUsers, setUserActivation } = useUsers();
  const [search, setSearch] = useState("");

  const refresh = () => listUsers({ role, department_id: departmentId || undefined, search: search || undefined, active_only: false, limit: 50 });

  useEffect(() => {
    const timer = setTimeout(refresh, 300);
    return () => clearTimeout(timer);
  }, [search, role, departmentId]);

  return (
    <div className="space-y-3">
      <Input
        placeholder={`Search ${role}s by name, email...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading && <p className="text-xs text-stone-500">Searching...</p>}
      <div className="divide-y divide-stone-800 rounded-xl border border-stone-800">
        {users?.items.length ? (
          users.items.map((u: StaffUser) => (
            role === "student" ? (
              <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-stone-100">{u.full_name}</p>
                  <p className="truncate text-xs text-stone-500">{u.email}{u.matric_number ? ` · ${u.matric_number}` : ""}</p>
                </div>
                <Button
                  variant={u.is_active ? "danger" : "secondary"}
                  size="sm"
                  onClick={async () => {
                    const result = await setUserActivation(u.id, !u.is_active);
                    if (result) refresh();
                  }}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ) : (
              <RosterRow
                key={u.id}
                staffUser={u}
                departments={departments}
                canReassignDepartment={canReassignDepartment}
                onChanged={refresh}
              />
            )
          ))
        ) : (
          <p className="px-4 py-6 text-center text-sm text-stone-600">No {role}s found yet.</p>
        )}
      </div>
    </div>
  );
}

export function TeamPage() {
  const { user } = useAuthStore();
  const { institutions, departments, listInstitutions, listDepartments } = useLookups();
  const [tab, setTab] = useState<"coordinators" | "supervisors" | "structure" | "students">(
    user?.role === "admin" ? "coordinators" : "supervisors"
  );
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    listInstitutions();
    listDepartments();
  }, []);

  const bump = () => setRefreshKey((k) => k + 1);

  if (!user || !["admin", "coordinator", "supervisor"].includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500">
        You don't have access to this page.
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const isSupervisor = user.role === "supervisor";

  if (isSupervisor) {
    return <div className="min-h-screen bg-stone-950 px-4 py-4 sm:px-6"><h1 className="mb-4 font-serif text-xl text-stone-100">My Students</h1><SupervisorStudents supervisorId={user.id} /></div>;
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-4 sm:px-6">
      <div className="mb-4">
        <h1 className="font-serif text-xl text-stone-100 sm:text-2xl">Team</h1>
        <p className="mt-0.5 text-xs text-stone-500">
          {isAdmin
            ? "Manage departments, academic sessions, and coordinators."
            : "Add supervisors to your department and review your roster."}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-stone-800">
        {isAdmin && (
          <button
            onClick={() => setTab("structure")}
            className={`px-3 py-2 text-sm font-medium ${tab === "structure" ? "border-b-2 border-sage-500 text-sage-400" : "text-stone-500"}`}
          >
            Departments & Session
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setTab("coordinators")}
            className={`px-3 py-2 text-sm font-medium ${tab === "coordinators" ? "border-b-2 border-sage-500 text-sage-400" : "text-stone-500"}`}
          >
            Coordinators
          </button>
        )}
        <button
          onClick={() => setTab("supervisors")}
          className={`px-3 py-2 text-sm font-medium ${tab === "supervisors" ? "border-b-2 border-sage-500 text-sage-400" : "text-stone-500"}`}
        >
          Supervisors
        </button>
        {!isAdmin && (
          <button
            onClick={() => setTab("students")}
            className={`px-3 py-2 text-sm font-medium ${tab === "students" ? "border-b-2 border-sage-500 text-sage-400" : "text-stone-500"}`}
          >
            Students
          </button>
        )}
      </div>

      {/* Admin: Institutions & Departments */}
      {isAdmin && tab === "structure" && (
        <div className="space-y-6">
          <Card>
            <div className="space-y-3">
              <h2 className="font-serif text-sm text-stone-200">Departments ({departments.length})</h2>
              {institutions.length ? <CreateDepartmentForm institutions={institutions} onCreated={() => { listDepartments(); bump(); }} /> : <p className="text-sm text-stone-500">No institutions are configured. Contact the platform operator to add one before creating departments.</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                {departments.map((d) => (
                  <div key={d.id} className="rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2">
                    <p className="text-sm text-stone-200">{d.name}</p>
                    <p className="mt-0.5 select-all font-mono text-[10px] text-stone-500">{d.id}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <div><h2 className="font-serif text-lg text-stone-100">Current academic session</h2><p className="mt-1 text-sm text-stone-400">Set the active academic year for each institution.</p></div>
              {institutions.map((institution) => <AcademicSessionControl key={institution.id} institution={institution} onSaved={listInstitutions} />)}
            </div>
          </Card>
        </div>
      )}

      {/* Admin: Coordinators */}
      {isAdmin && tab === "coordinators" && (
        <div className="space-y-4">
          <AddStaffForm role="coordinator" departments={departments} onCreated={bump} />
          <RosterTable key={`coord-${refreshKey}`} role="coordinator" departments={departments} canReassignDepartment={isAdmin} />
        </div>
      )}

      {/* Supervisors — both admin (any dept) and coordinator (own dept, locked) */}
      {tab === "supervisors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsBulkOpen(true)}>
              Bulk Import
            </Button>
          </div>
          <AddStaffForm
            role="supervisor"
            departments={departments}
            defaultDepartmentId={isAdmin ? undefined : user.department_id}
            defaultInstitutionId={user.institution_id}
            onCreated={bump}
          />
          <RosterTable
            key={`sup-${refreshKey}`}
            role="supervisor"
            departmentId={isAdmin ? undefined : user.department_id}
            departments={departments}
            canReassignDepartment={isAdmin}
          />
        </div>
      )}
      {tab === "students" && (
        <RosterTable
          role="student"
          departmentId={user.department_id}
          departments={departments}
        />
      )}

      {/* Reuses the same bulk-import UI/endpoint as pairings' bulk import
          for CSV/XLSX — see BulkImportModal for the "users" mode. */}
      <BulkImportModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} onSuccess={bump} mode="users" />
    </div>
  );
}
