"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createStudent,
  enrollStudents,
  moveStudent,
  unenrollStudents,
} from "@/lib/actions/enrollment";
import { removeSectionCR, setSectionCR } from "@/lib/actions/cr";
import { hodUpdateStudentContact } from "@/lib/actions/student-contact";
import type {
  PickerTreeRow,
  WorkspaceStudent,
} from "@/lib/db/enrollment-queries";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import {
  Field,
  StatusMessage,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  iconBtnCls,
  inputCls,
} from "@/components/form-controls";
import {
  ArrowRightLeft,
  Building2,
  CalendarDays,
  Crown,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

interface CrStudent {
  studentId: string;
  rollNumber: string;
  fullName: string;
}

interface EnrollmentManagerProps {
  basePath: string;
  tree: PickerTreeRow[];
  /** HOD's own department; null for admin (unrestricted). */
  departmentId: string | null;
  activeDeptId: string | null;
  sectionId: string | null;
  sectionLabel: string | null;
  enrolled: WorkspaceStudent[];
  unenrolled: WorkspaceStudent[];
  crs: CrStudent[];
}

interface SectionOption {
  id: string;
  name: string;
}

interface MoveGroup {
  key: string;
  label: string;
  options: SectionOption[];
}

type Busy = "enroll" | "unenroll" | "move" | "create" | "contact" | "cr" | null;

function dedupe<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const k = key(row);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function StudentRow({
  student,
  checked,
  onToggle,
  children,
}: {
  student: WorkspaceStudent;
  checked: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 px-2 sm:px-4 border-b border-kvsr-soft last:border-b-0">
      <label className="flex items-center gap-3 flex-1 min-w-0 py-2.5 min-h-[52px] cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-5 h-5 rounded accent-kvsr-navy shrink-0"
          aria-label={`Select ${student.fullName} (${student.rollNumber})`}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-kvsr-ink truncate">
            {student.fullName}
          </span>
          <span className="block text-xs text-muted-foreground">
            Roll #{student.rollNumber}
          </span>
        </span>
      </label>
      {children && <div className="flex items-center gap-1.5 shrink-0">{children}</div>}
    </div>
  );
}

export function EnrollmentManager({
  basePath,
  tree,
  departmentId,
  activeDeptId,
  sectionId,
  sectionLabel,
  enrolled,
  unenrolled,
  crs,
}: EnrollmentManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [checkedEnrolled, setCheckedEnrolled] = useState<string[]>([]);
  const [checkedUnenrolled, setCheckedUnenrolled] = useState<string[]>([]);
  const [busy, setBusy] = useState<Busy>(null);
  const [barMessage, setBarMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [crTarget, setCrTarget] = useState<{ student: WorkspaceStudent; make: boolean } | null>(null);
  const [crError, setCrError] = useState<string | null>(null);

  const [moveTarget, setMoveTarget] = useState<WorkspaceStudent | null>(null);
  const [moveSectionId, setMoveSectionId] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: "", rollNumber: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const [contactTarget, setContactTarget] = useState<WorkspaceStudent | null>(null);
  const [contactForm, setContactForm] = useState({ phone: "", email: "" });
  const [contactError, setContactError] = useState<string | null>(null);

  const currentRow = useMemo(
    () => tree.find((r) => r.sectionId === sectionId) ?? null,
    [tree, sectionId]
  );

  const crIds = useMemo(() => new Set(crs.map((c) => c.studentId)), [crs]);

  const departments = useMemo(
    () =>
      dedupe(
        tree.map((r) => ({
          id: r.departmentId,
          code: r.departmentCode,
          name: r.departmentName,
        })),
        (d) => d.id
      ),
    [tree]
  );

  const activeDept =
    currentRow?.departmentId ?? activeDeptId ?? departments[0]?.id ?? "";

  const programs = useMemo(
    () =>
      dedupe(
        tree
          .filter((r) => r.departmentId === activeDept && r.programId)
          .map((r) => ({ id: r.programId as string, name: r.programName as string })),
        (p) => p.id
      ),
    [tree, activeDept]
  );

  const activeProgram = currentRow?.programId ?? "";

  const years = useMemo(
    () =>
      dedupe(
        tree
          .filter(
            (r) =>
              r.departmentId === activeDept &&
              r.programId === activeProgram &&
              r.studyYearId
          )
          .map((r) => ({ id: r.studyYearId as string, name: r.yearLabel as string })),
        (y) => y.id
      ),
    [tree, activeDept, activeProgram]
  );

  const activeYear = currentRow?.studyYearId ?? "";

  const sections = useMemo(
    () =>
      dedupe(
        tree
          .filter(
            (r) =>
              r.departmentId === activeDept &&
              r.programId === activeProgram &&
              r.studyYearId === activeYear &&
              r.sectionId
          )
          .map((r) => ({
            id: r.sectionId as string,
            name: `${r.yearLabel}-${r.sectionName}`,
          })),
        (s) => s.id
      ),
    [tree, activeDept, activeProgram, activeYear]
  );

  const moveGroups = useMemo<MoveGroup[]>(() => {
    const groups: MoveGroup[] = [];
    const byKey = new Map<string, SectionOption[]>();
    for (const r of tree) {
      if (!r.sectionId || r.sectionId === sectionId) continue;
      const key = `${r.departmentId}/${r.programId ?? ""}/${r.studyYearId ?? ""}`;
      let options = byKey.get(key);
      if (!options) {
        options = [];
        byKey.set(key, options);
        groups.push({
          key,
          label: `${r.departmentName} / ${r.programName ?? ""} / ${r.yearLabel ?? ""}`,
          options,
        });
      }
      options.push({
        id: r.sectionId,
        name: `${r.yearLabel}-${r.sectionName}`,
      });
    }
    return groups;
  }, [tree, sectionId]);

  const q = query.trim().toLowerCase();
  const matches = (s: WorkspaceStudent) =>
    !q ||
    s.fullName.toLowerCase().includes(q) ||
    s.rollNumber.toLowerCase().includes(q);
  const filteredEnrolled = enrolled.filter(matches);
  const filteredUnenrolled = unenrolled.filter(matches);

  function goToSection(id: string | null) {
    router.push(
      id ? `${basePath}?section=${id}` : `${basePath}?dept=${activeDept}`
    );
  }

  function goToScope(dept: string, program: string | null, year: string | null) {
    const row = tree.find(
      (r) =>
        r.sectionId &&
        r.departmentId === dept &&
        (!program || r.programId === program) &&
        (!year || r.studyYearId === year)
    );
    if (row?.sectionId) {
      goToSection(row.sectionId);
    } else {
      router.push(`${basePath}?dept=${dept}`);
    }
  }

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function toggleAllVisible(
    rows: WorkspaceStudent[],
    checked: string[],
    setChecked: (v: string[]) => void
  ) {
    const visibleIds = rows.map((r) => r.id);
    const allChecked = visibleIds.every((id) => checked.includes(id));
    setChecked(allChecked ? [] : visibleIds);
  }

  async function runAction(kind: Exclude<Busy, null>, action: () => Promise<{ success: boolean; error?: string }>, onDone: () => void) {
    setBarMessage(null);
    setBusy(kind);
    const res = await action();
    setBusy(null);
    if (res.success) {
      onDone();
      router.refresh();
    } else {
      setBarMessage({ ok: false, text: res.error ?? "Something went wrong." });
    }
  }

  async function doEnroll() {
    if (!sectionId) return;
    const ids = checkedUnenrolled;
    await runAction(
      "enroll",
      () => enrollStudents({ sectionId, studentIds: ids }),
      () => {
        setCheckedUnenrolled([]);
        setBarMessage({ ok: true, text: `Enrolled ${ids.length} student${ids.length !== 1 ? "s" : ""}.` });
      }
    );
  }

  async function doUnenroll() {
    if (!sectionId) return;
    const ids = checkedEnrolled;
    await runAction(
      "unenroll",
      () => unenrollStudents({ sectionId, studentIds: ids }),
      () => {
        setCheckedEnrolled([]);
        setBarMessage({ ok: true, text: `Unenrolled ${ids.length} student${ids.length !== 1 ? "s" : ""}. They can be re-enrolled anytime.` });
      }
    );
  }

  async function doMove(e: React.FormEvent) {
    e.preventDefault();
    if (!moveTarget || !sectionId || !moveSectionId) return;
    const studentId = moveTarget.id;
    const fromSectionId = sectionId;
    const toSectionId = moveSectionId;
    setBarMessage(null);
    setBusy("move");
    const res = await moveStudent({ studentId, fromSectionId, toSectionId });
    setBusy(null);
    if (res.success) {
      setMoveTarget(null);
      setMoveSectionId("");
      setCheckedEnrolled([]);
      setBarMessage({ ok: true, text: "Student moved." });
      router.refresh();
    } else {
      setBarMessage(null);
      setMoveError(res.error);
    }
  }

  async function doCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setBusy("create");
    const res = await createStudent({
      fullName: createForm.fullName.trim(),
      rollNumber: createForm.rollNumber.trim(),
    });
    setBusy(null);
    if (res.success) {
      setCreateOpen(false);
      setCreateForm({ fullName: "", rollNumber: "" });
      setBarMessage({ ok: true, text: "Student created — they can log in with their roll number as the password." });
      router.refresh();
    } else {
      setCreateError(res.error);
    }
  }

  function openContact(student: WorkspaceStudent) {
    setContactForm({ phone: student.phone ?? "", email: student.email ?? "" });
    setContactError(null);
    setContactTarget(student);
  }

  async function doUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactTarget) return;
    const studentId = contactTarget.id;
    setBusy("contact");
    const res = await hodUpdateStudentContact({
      studentId,
      phone: contactForm.phone.trim() || null,
      email: contactForm.email.trim() || null,
    });
    setBusy(null);
    if (res.success) {
      setContactTarget(null);
      router.refresh();
    } else {
      setContactError(res.error);
    }
  }

  async function doSetCr() {
    if (!crTarget || !sectionId) return;
    const { student, make } = crTarget;
    setBarMessage(null);
    setBusy("cr");
    const res = make
      ? await setSectionCR({ sectionId, studentId: student.id })
      : await removeSectionCR({ sectionId, studentId: student.id });
    setBusy(null);
    if (res.success) {
      setCrTarget(null);
      setBarMessage({
        ok: true,
        text: make
          ? `${student.fullName} is now a class representative.`
          : `CR role removed from ${student.fullName}.`,
      });
      router.refresh();
    } else {
      setCrError(res.error);
    }
  }

  const noDepartments = departments.length === 0;
  const noSection = !currentRow && departments.length > 0;

  const barVisible =
    checkedEnrolled.length > 0 || checkedUnenrolled.length > 0;
  const barShown = barVisible || barMessage !== null;

  return (
    <div className="space-y-5">
      {/* Picker toolbar */}
      <div className="rounded-2xl bg-white border border-kvsr-soft shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {departmentId ? (
            <div>
              <p className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Department
              </p>
              <p className="flex items-center min-h-[48px] px-3 rounded-xl bg-kvsr-navy/[0.03] border border-kvsr-soft text-sm font-medium text-kvsr-ink">
                {tree[0]?.departmentName ?? "Your department"}
              </p>
            </div>
          ) : (
            <Field label="Department" htmlFor="enroll-dept">
              <select
                id="enroll-dept"
                value={activeDept}
                onChange={(e) => goToScope(e.target.value, null, null)}
                className={inputCls}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Program" htmlFor="enroll-program">
            <select
              id="enroll-program"
              value={activeProgram}
              onChange={(e) => goToScope(activeDept, e.target.value || null, null)}
              className={inputCls}
              disabled={programs.length === 0}
            >
              <option value="">All programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Study year" htmlFor="enroll-year">
            <select
              id="enroll-year"
              value={activeYear}
              onChange={(e) => goToScope(activeDept, activeProgram || null, e.target.value || null)}
              className={inputCls}
              disabled={years.length === 0}
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Section" htmlFor="enroll-section">
            <select
              id="enroll-section"
              value={sectionId ?? ""}
              onChange={(e) => goToSection(e.target.value || null)}
              className={inputCls}
              disabled={sections.length === 0}
            >
              <option value="">
                {sections.length === 0 ? "No sections" : "Choose a section"}
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 pt-4 border-t border-kvsr-soft">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students by name or roll number"
              aria-label="Search students"
              className="w-full bg-white border border-kvsr-soft rounded-xl pl-10 pr-4 py-2.5 min-h-[48px] text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateForm({ fullName: "", rollNumber: "" });
              setCreateOpen(true);
            }}
            className={btnSecondaryCls}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New student
          </button>
        </div>
      </div>

      {noDepartments ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create a department, program and sections in Setup before managing enrollment."
          action={
            <a href="/admin/setup/sections" className={btnPrimaryCls}>
              Go to Setup
            </a>
          }
        />
      ) : noSection ? (
        <EmptyState
          icon={CalendarDays}
          title="No section in this scope"
          description="Choose a different scope above, or create a section for this study year in Setup."
          action={
            <a href="/admin/setup/sections" className={btnPrimaryCls}>
              Create a section
            </a>
          }
        />
      ) : (
        <>
          {/* Selection action bar */}
          {barShown && (
            <div className="rounded-2xl bg-kvsr-navy px-4 py-3 shadow-sm space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-white/90 flex-1 min-w-[12rem]">
                  {barVisible
                    ? [
                        checkedEnrolled.length > 0
                          ? `${checkedEnrolled.length} enrolled selected`
                          : null,
                        checkedUnenrolled.length > 0
                          ? `${checkedUnenrolled.length} not enrolled selected`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "\u00A0"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {checkedUnenrolled.length > 0 && sectionId && (
                    <button
                      type="button"
                      onClick={doEnroll}
                      disabled={busy !== null}
                      className="inline-flex items-center justify-center gap-2 px-4 min-h-[48px] sm:min-h-[40px] rounded-xl bg-white text-kvsr-navy text-sm font-semibold hover:bg-white/90 disabled:opacity-50"
                    >
                      {busy === "enroll" ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <UserCheck className="w-4 h-4" aria-hidden="true" />
                      )}
                      Enroll {checkedUnenrolled.length}
                    </button>
                  )}
                  {checkedEnrolled.length > 0 && sectionId && (
                    <button
                      type="button"
                      onClick={doUnenroll}
                      disabled={busy !== null}
                      className="inline-flex items-center justify-center gap-2 px-4 min-h-[48px] sm:min-h-[40px] rounded-xl bg-white/10 text-white text-sm font-semibold border border-white/25 hover:bg-white/20 disabled:opacity-50"
                    >
                      {busy === "unenroll" ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <UserMinus className="w-4 h-4" aria-hidden="true" />
                      )}
                      Unenroll {checkedEnrolled.length}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCheckedEnrolled([]);
                      setCheckedUnenrolled([]);
                      setBarMessage(null);
                    }}
                    className="inline-flex items-center justify-center px-3 min-h-[48px] sm:min-h-[40px] rounded-xl text-sm font-medium text-white/70 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {barMessage && (
                <p
                  role="status"
                  className={`text-sm ${barMessage.ok ? "text-emerald-300" : "text-red-300"}`}
                >
                  {barMessage.text}
                </p>
              )}
            </div>
          )}

          {/* Roster panels */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-kvsr-navy/[0.03] border-b border-kvsr-soft">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-kvsr-cta" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-kvsr-ink">Enrolled</h3>
                  <span className="px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-xs font-semibold text-kvsr-muted">
                    {filteredEnrolled.length}
                  </span>
                </div>
                {filteredEnrolled.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-kvsr-navy"
                      checked={
                        filteredEnrolled.length > 0 &&
                        filteredEnrolled.every((s) => checkedEnrolled.includes(s.id))
                      }
                      onChange={() =>
                        toggleAllVisible(filteredEnrolled, checkedEnrolled, setCheckedEnrolled)
                      }
                      aria-label="Select all enrolled students"
                    />
                    All
                  </label>
                )}
              </div>
              <p className="flex items-center gap-1.5 px-4 py-2 text-xs text-kvsr-muted bg-kvsr-navy/[0.02] border-b border-kvsr-soft">
                <Crown className="w-3.5 h-3.5 text-kvsr-gold" aria-hidden="true" />
                Class Representatives:{" "}
                {crs.length > 0 ? `${crs.length}/3` : "None yet"}
              </p>
              {filteredEnrolled.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                  {enrolled.length === 0
                    ? "No students enrolled in this section yet. Select from Not enrolled to enroll."
                    : "No enrolled students match your search."}
                </p>
              ) : (
                <ul>
                  {filteredEnrolled.map((student) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      checked={checkedEnrolled.includes(student.id)}
                      onToggle={() =>
                        toggle(checkedEnrolled, setCheckedEnrolled, student.id)
                      }
                    >
                      {student.contactLockedAt && (
                        <span
                          title="Contact info is locked"
                          className="inline-flex items-center justify-center w-8 h-8 text-kvsr-muted"
                          aria-label="Contact info is locked"
                        >
                          <Lock className="w-4 h-4" aria-hidden="true" />
                        </span>
                      )}
                      {crIds.has(student.id) ? (
                        <>
                          <span
                            title="Class representative"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-kvsr-gold/15 text-kvsr-cta text-xs font-semibold"
                          >
                            <Crown className="w-3 h-3" aria-hidden="true" />
                            CR
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCrError(null);
                              setCrTarget({ student, make: false });
                            }}
                            disabled={busy !== null}
                            aria-label={`Remove CR role from ${student.fullName}`}
                            className={iconBtnCls}
                          >
                            <UserMinus className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCrError(null);
                            setCrTarget({ student, make: true });
                          }}
                          disabled={busy !== null}
                          aria-label={`Make ${student.fullName} a class representative`}
                          className={iconBtnCls}
                        >
                          <Crown className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMoveSectionId("");
                          setMoveTarget(student);
                        }}
                        disabled={busy !== null}
                        aria-label={`Move ${student.fullName} to another section`}
                        className={iconBtnCls}
                      >
                        <ArrowRightLeft className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openContact(student)}
                        aria-label={`Edit contact for ${student.fullName}`}
                        className={iconBtnCls}
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </StudentRow>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-kvsr-navy/[0.03] border-b border-kvsr-soft">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-kvsr-cta" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-kvsr-ink">Not enrolled</h3>
                  <span className="px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-xs font-semibold text-kvsr-muted">
                    {filteredUnenrolled.length}
                  </span>
                </div>
                {filteredUnenrolled.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-kvsr-navy"
                      checked={
                        filteredUnenrolled.length > 0 &&
                        filteredUnenrolled.every((s) => checkedUnenrolled.includes(s.id))
                      }
                      onChange={() =>
                        toggleAllVisible(filteredUnenrolled, checkedUnenrolled, setCheckedUnenrolled)
                      }
                      aria-label="Select all unenrolled students"
                    />
                    All
                  </label>
                )}
              </div>
              {filteredUnenrolled.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                  {unenrolled.length === 0
                    ? "Every student is enrolled in a section. Create more with New student."
                    : "No unenrolled students match your search."}
                </p>
              ) : (
                <ul>
                  {filteredUnenrolled.map((student) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      checked={checkedUnenrolled.includes(student.id)}
                      onToggle={() =>
                        toggle(checkedUnenrolled, setCheckedUnenrolled, student.id)
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Move to another section */}
      <Modal
        open={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        title="Move student"
        description={`Moves the student out of ${sectionLabel ?? "this section"} into the section you pick. Their other enrollments stay inactive.`}
      >
        {moveTarget && (
          <form onSubmit={doMove} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-kvsr-navy/[0.03] border border-kvsr-soft">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-kvsr-navy/5 text-kvsr-navy font-semibold text-sm shrink-0">
                {moveTarget.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-kvsr-ink truncate">
                  {moveTarget.fullName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Roll #{moveTarget.rollNumber}
                </p>
              </div>
            </div>

            <Field
              label="Move to"
              htmlFor="move-section"
              hint="Sections across departments appear only for admins; HODs can move within their own department."
            >
              <select
                id="move-section"
                required
                value={moveSectionId}
                onChange={(e) => setMoveSectionId(e.target.value)}
                className={inputCls}
              >
                <option value="">Choose a section</option>
                {moveGroups.map((group) => (
                  <optgroup key={group.key} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            {moveError && <StatusMessage kind="error" text={moveError} />}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className={btnSecondaryCls}
              >
                Cancel
              </button>
              <button type="submit" disabled={busy !== null || !moveSectionId} className={btnPrimaryCls}>
                {busy === "move" && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                Move student
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Class representative role */}
      <Modal
        open={crTarget !== null}
        onClose={() => setCrTarget(null)}
        title={crTarget?.make ? "Make class representative" : "Remove class representative"}
        description={
          crTarget?.make
            ? `Max 3 CRs per section. ${crTarget.student.fullName} will be able to upload resources for this class.`
            : `Remove CR role from ${crTarget?.student.fullName ?? ""}?`
        }
      >
        {crTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-kvsr-navy/[0.03] border border-kvsr-soft">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-kvsr-navy/5 text-kvsr-navy font-semibold text-sm shrink-0">
                {crTarget.student.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-kvsr-ink truncate">
                  {crTarget.student.fullName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Roll #{crTarget.student.rollNumber}
                </p>
              </div>
            </div>

            {crError && <StatusMessage kind="error" text={crError} />}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCrTarget(null)}
                className={btnSecondaryCls}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doSetCr}
                disabled={busy !== null}
                className={crTarget.make ? btnPrimaryCls : btnDangerCls}
              >
                {busy === "cr" && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                {crTarget.make ? "Make CR" : "Remove CR"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New student */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New student"
        description="They can log in right away using their roll number as the password."
      >
        <form onSubmit={doCreateStudent} className="space-y-4">
          <Field label="Full name" htmlFor="new-student-name">
            <input
              id="new-student-name"
              required
              maxLength={120}
              value={createForm.fullName}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, fullName: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field
            label="Roll number"
            htmlFor="new-student-roll"
            hint="Must be unique — it doubles as the student's first password."
          >
            <input
              id="new-student-roll"
              required
              maxLength={40}
              value={createForm.rollNumber}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, rollNumber: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          {createError && <StatusMessage kind="error" text={createError} />}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className={btnSecondaryCls}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy !== null} className={btnPrimaryCls}>
              {busy === "create" && (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              )}
              Create student
            </button>
          </div>
        </form>
      </Modal>

      {/* Contact edit (HOD override) */}
      <Modal
        open={contactTarget !== null}
        onClose={() => setContactTarget(null)}
        title="Edit contact info"
        description="Only phone and email can be changed here."
      >
        {contactTarget && (
          <form onSubmit={doUpdateContact} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-kvsr-muted">
              {contactTarget.contactLockedAt ? (
                <>
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  Contact is locked — you can still change it as the {departmentId ? "HOD" : "admin"}.
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                  Contact is not locked yet — the student can still set it themselves.
                </>
              )}
            </div>
            <Field label="Phone" htmlFor="contact-phone">
              <input
                id="contact-phone"
                type="tel"
                inputMode="tel"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, phone: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Email" htmlFor="contact-email">
              <input
                id="contact-email"
                type="email"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, email: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Leave a field empty to clear it.
            </p>
            {contactError && <StatusMessage kind="error" text={contactError} />}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setContactTarget(null)}
                className={btnSecondaryCls}
              >
                Cancel
              </button>
              <button type="submit" disabled={busy !== null} className={btnPrimaryCls}>
                {busy === "contact" && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                Save contact
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
