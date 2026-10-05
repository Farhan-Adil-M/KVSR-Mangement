"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createExam, deleteExam, updateExam } from "@/lib/actions/teaching";
import type { ExamAdminRow } from "@/lib/db/queries";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import { EventDateRail } from "@/components/events-list";
import {
  Field,
  StatusMessage,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  iconBtnCls,
  inputCls,
  textareaCls,
} from "@/components/form-controls";
import {
  CalendarDays,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";

export type ExamRow = ExamAdminRow;

interface ExamManagerProps {
  exams: ExamRow[];
  subjects: { id: string; name: string }[];
  sections: { id: string; label: string; studyYearId: string; yearLabel: string }[];
  studyYears: { id: string; label: string }[];
  today: string;
}

interface ExamFormState {
  subjectId: string;
  sectionId: string;
  studyYearId: string;
  title: string;
  examDate: string;
  startTime: string;
  instructions: string;
}

export function ExamManager({ exams, subjects, sections, studyYears, today }: ExamManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExamRow | null>(null);
  const [form, setForm] = useState<ExamFormState>({
    subjectId: "",
    sectionId: "",
    studyYearId: "",
    title: "",
    examDate: "",
    startTime: "",
    instructions: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      exams.filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          e.subjectName.toLowerCase().includes(q) ||
          (e.sectionName ?? "").toLowerCase().includes(q)
      ),
    [exams, q]
  );

  const { upcoming, past } = useMemo(() => {
    const upcoming = filtered
      .filter((e) => e.examDate >= today)
      .sort((a, b) => a.examDate.localeCompare(b.examDate));
    const past = filtered
      .filter((e) => e.examDate < today)
      .sort((a, b) => b.examDate.localeCompare(a.examDate));
    return { upcoming, past };
  }, [filtered, today]);

  const scopeLabel = (exam: ExamRow) =>
    exam.sectionName === "Year-wide"
      ? exam.studyYearLabel
        ? `Year-wide · ${exam.studyYearLabel}`
        : "Year-wide (all sections)"
      : exam.sectionName;

  function openCreate() {
    setEditing(null);
    setForm({
      subjectId: "",
      sectionId: "",
      studyYearId: studyYears[0]?.id ?? "",
      title: "",
      examDate: "",
      startTime: "",
      instructions: "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(exam: ExamRow) {
    setEditing(exam);
    setForm({
      subjectId: "",
      sectionId: "",
      studyYearId: "",
      title: exam.title,
      examDate: exam.examDate,
      startTime: exam.startTime ? exam.startTime.slice(0, 5) : "",
      instructions: exam.instructions ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function setSectionScope(sectionId: string) {
    setForm((f) => ({
      ...f,
      sectionId,
      studyYearId: sectionId ? "" : f.studyYearId || studyYears[0]?.id || "",
    }));
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      if (editing) {
        const res = await updateExam({
          id: editing.id,
          title: form.title.trim(),
          examDate: form.examDate,
          startTime: form.startTime || null,
          instructions: form.instructions.trim() || null,
        });
        if (!res.success) {
          setFormError(res.error);
          return;
        }
      } else {
        const res = await createExam({
          subjectId: form.subjectId,
          sectionId: form.sectionId || null,
          studyYearId: form.sectionId ? null : form.studyYearId || null,
          title: form.title.trim(),
          examDate: form.examDate,
          startTime: form.startTime || null,
          instructions: form.instructions.trim() || null,
        });
        if (!res.success) {
          setFormError(res.error);
          return;
        }
      }
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setBusy(true);
    try {
      const res = await deleteExam(deleteTarget.id);
      if (!res.success) {
        setDeleteError(res.error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const group = (title: string, rows: ExamRow[]) =>
    rows.length > 0 && (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-kvsr-muted uppercase tracking-wider">
          {title}
        </h2>
        <ul className="bg-white rounded-2xl border border-kvsr-soft shadow-sm divide-y divide-kvsr-soft overflow-hidden">
          {rows.map((exam) => (
            <li
              key={exam.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-kvsr-navy/[0.02]"
            >
              <EventDateRail eventDate={exam.examDate} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-kvsr-ink">{exam.title}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-kvsr-cta">
                    {exam.subjectName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    {scopeLabel(exam)}
                  </span>
                  {exam.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {exam.startTime.slice(0, 5)}
                    </span>
                  )}
                </div>
                {exam.instructions && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {exam.instructions}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                <button
                  type="button"
                  onClick={() => openEdit(exam)}
                  aria-label={`Edit ${exam.title}`}
                  className={iconBtnCls}
                >
                  <Pencil className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(exam);
                    setDeleteError(null);
                  }}
                  aria-label={`Delete ${exam.title}`}
                  className={`${iconBtnCls} hover:text-destructive hover:border-destructive/40`}
                >
                  <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exams by title, subject, or section"
            aria-label="Search exams"
            className="w-full bg-white border border-kvsr-soft rounded-xl pl-10 pr-4 py-2.5 min-h-[48px] text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>
        <button type="button" onClick={openCreate} className={btnPrimaryCls}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New exam
        </button>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No exams scheduled"
          description="Create the first exam schedule entry for a section or a whole study year."
          action={
            <button type="button" onClick={openCreate} className={btnPrimaryCls}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              New exam
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No exams match your search"
          description="Try a different word, or clear the search."
        />
      ) : (
        <>
          {group("Upcoming", upcoming)}
          {group("Past", past)}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit exam" : "New exam"}
        description={
          editing
            ? "Only the title, date, time, and instructions can be changed."
            : "Students see exams for their section, or year-wide exams for their study year."
        }
      >
        <form onSubmit={submitForm} className="space-y-4">
          {editing ? (
            <div>
              <p className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject & scope
              </p>
              <p className="flex items-center min-h-[48px] px-3 rounded-xl bg-kvsr-navy/[0.03] border border-kvsr-soft text-sm font-medium text-kvsr-ink">
                {editing.subjectName} — {scopeLabel(editing)}
              </p>
            </div>
          ) : (
            <>
              <Field label="Subject" htmlFor="exam-subject">
                <select
                  id="exam-subject"
                  value={form.subjectId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subjectId: e.target.value }))
                  }
                  required
                  className={inputCls}
                >
                  <option value="">Select subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Section"
                htmlFor="exam-section"
                hint="Year-wide exams apply to every section of the chosen study year."
              >
                <select
                  id="exam-section"
                  value={form.sectionId}
                  onChange={(e) => setSectionScope(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Year-wide (all sections)</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>

              {!form.sectionId && studyYears.length > 0 && (
                <Field label="Study year" htmlFor="exam-study-year">
                  <select
                    id="exam-study-year"
                    value={form.studyYearId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, studyYearId: e.target.value }))
                    }
                    required
                    className={inputCls}
                  >
                    {studyYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          )}

          <Field label="Title" htmlFor="exam-title">
            <input
              id="exam-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              maxLength={200}
              placeholder="Internal 1"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date" htmlFor="exam-date">
              <input
                id="exam-date"
                type="date"
                required
                value={form.examDate}
                onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Start time (optional)" htmlFor="exam-start-time">
              <input
                id="exam-start-time"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Instructions (optional)" htmlFor="exam-instructions">
            <textarea
              id="exam-instructions"
              rows={3}
              maxLength={2000}
              value={form.instructions}
              onChange={(e) =>
                setForm((f) => ({ ...f, instructions: e.target.value }))
              }
              placeholder="Bring your hall ticket and calculator…"
              className={textareaCls}
            />
          </Field>

          {formError && <StatusMessage kind="error" text={formError} />}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
              className={btnSecondaryCls}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className={btnPrimaryCls}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {editing ? "Save changes" : "Create exam"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete exam"
        description="This removes the exam for everyone."
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-kvsr-ink">
              Delete <span className="font-semibold">{deleteTarget.title}</span> (
              {deleteTarget.subjectName}, {scopeLabel(deleteTarget)})? Students
              will no longer see it in their exam schedule.
            </p>
            {deleteError && <StatusMessage kind="error" text={deleteError} />}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className={btnSecondaryCls}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className={btnDangerCls}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Delete exam
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
