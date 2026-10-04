"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Pencil, Plus, Trash2, Users, Building2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  setHod,
  type DepartmentWithHod,
  type FacultyListRow,
} from "@/lib/actions/admin";

export function DepartmentsManager({
  departments,
  faculty,
  institutionShortName,
}: {
  departments: DepartmentWithHod[];
  faculty: FacultyListRow[];
  institutionShortName: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ code: "", name: "" });
  const [editing, setEditing] = useState<DepartmentWithHod | null>(null);
  const [deleting, setDeleting] = useState<DepartmentWithHod | null>(null);
  const [hodPick, setHodPick] = useState<{
    department: DepartmentWithHod;
    facultyId: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, done: () => void) => {
    setIsPending(true);
    void (async () => {
      try {
        const res = await fn();
        setMessage(res.success ? null : (res.error ?? "Something went wrong."));
        if (res.success) {
          done();
          router.refresh();
        }
      } finally {
        setIsPending(false);
      }
    })();
  };

  const facultyOf = (departmentId: string) =>
    faculty.filter((f) => f.departmentId === departmentId);

  return (
    <div className="space-y-6">
      {/* Create */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createDepartment({ code: form.code, name: form.name }),
            () => setForm({ code: "", name: "" })
          );
        }}
        className="rounded-2xl border border-kvsr-soft bg-white shadow-sm p-5"
      >
        <p className="text-sm font-semibold text-kvsr-navy flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-kvsr-orange" />
          New department
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="sm:w-36">
            <label htmlFor="dept-code" className="block text-xs font-medium text-muted-foreground">
              Code
            </label>
            <input
              id="dept-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="CSE"
              required
              maxLength={20}
              className="mt-1 w-full min-h-[48px] rounded-xl border border-kvsr-soft px-3 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="dept-name" className="block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <input
              id="dept-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Computer Science & Engineering"
              required
              maxLength={120}
              className="mt-1 w-full min-h-[48px] rounded-xl border border-kvsr-soft px-3 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="self-end min-h-[48px] px-5 rounded-xl bg-kvsr-cta text-white text-sm font-medium hover:bg-kvsr-cta/90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      {message && (
        <p className="text-sm text-kvsr-cta" role="status">
          {message}
        </p>
      )}

      {/* Department cards */}
      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description={`Create ${institutionShortName}'s first department above.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((d) => {
            const deptFaculty = facultyOf(d.id);
            return (
              <div
                key={d.id}
                className="rounded-2xl border border-kvsr-soft bg-white shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-kvsr-navy/5 text-kvsr-navy text-xs font-bold">
                      {d.code}
                    </span>
                    <p className="font-semibold text-kvsr-ink mt-1.5 truncate">{d.name}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(d)}
                      aria-label={`Edit ${d.name}`}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-kvsr-navy/5 hover:text-kvsr-ink transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(d)}
                      aria-label={`Delete ${d.name}`}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {d.facultyCount} faculty
                  </span>
                  {d.hodName && (
                    <span className="flex items-center gap-1.5 font-medium text-kvsr-cta">
                      <Crown className="w-4 h-4" />
                      {d.hodName}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`hod-${d.id}`}
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    Head of Department
                  </label>
                  <select
                    id={`hod-${d.id}`}
                    value={d.hodId ?? ""}
                    onChange={(e) => {
                      const facultyId = e.target.value;
                      if (!facultyId) return;
                      const pick = deptFaculty.find((f) => f.id === facultyId);
                      if (pick) setHodPick({ department: d, facultyId });
                    }}
                    disabled={isPending}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-kvsr-soft px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                  >
                    <option value="">{d.hodName ? "Change HOD…" : "Assign HOD…"}</option>
                    {deptFaculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fullName}
                      </option>
                    ))}
                  </select>
                  {deptFaculty.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      No faculty in this department yet.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit department"
        description={editing?.code}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  updateDepartment({
                    id: editing.id,
                    code: editing.code,
                    name: editing.name,
                  }),
                () => setEditing(null)
              );
            }}
            className="space-y-3"
          >
            <div>
              <label htmlFor="edit-code" className="block text-xs font-medium text-muted-foreground">
                Code
              </label>
              <input
                id="edit-code"
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                required
                maxLength={20}
                className="mt-1 w-full min-h-[48px] rounded-xl border border-kvsr-soft px-3 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
              />
            </div>
            <div>
              <label htmlFor="edit-name" className="block text-xs font-medium text-muted-foreground">
                Name
              </label>
              <input
                id="edit-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
                maxLength={120}
                className="mt-1 w-full min-h-[48px] rounded-xl border border-kvsr-soft px-3 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 min-h-[48px] rounded-xl bg-kvsr-cta text-white text-sm font-medium hover:bg-kvsr-cta/90 disabled:opacity-50"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[48px] px-4 rounded-xl border border-kvsr-soft text-sm text-muted-foreground hover:text-kvsr-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete department?"
        description={deleting ? `${deleting.code} · ${deleting.name}` : undefined}
      >
        <p className="text-sm text-muted-foreground">
          This permanently deletes the department and everything inside it: its
          programs, study years, sections, subjects, timetables, enrollments, and
          attendance history. This cannot be undone.
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              if (!deleting) return;
              run(() => deleteDepartment(deleting.id), () => setDeleting(null));
            }}
            disabled={isPending}
            className="flex-1 min-h-[48px] rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Delete permanently
          </button>
          <button
            onClick={() => setDeleting(null)}
            disabled={isPending}
            className="min-h-[48px] px-4 rounded-xl border border-kvsr-soft text-sm text-muted-foreground hover:text-kvsr-ink"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* HOD assignment confirmation */}
      <Modal
        open={hodPick !== null}
        onClose={() => setHodPick(null)}
        title="Set Head of Department"
        description={
          hodPick
            ? `${hodPick.department.code} · ${hodPick.department.name}`
            : undefined
        }
      >
        <p className="text-sm text-muted-foreground">
          {hodPick &&
            `${faculty.find((f) => f.id === hodPick.facultyId)?.fullName} will become the HOD of ${hodPick.department.name} and gain department-wide access.`}
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              if (!hodPick) return;
              run(
                () => setHod({ departmentId: hodPick.department.id, facultyId: hodPick.facultyId }),
                () => setHodPick(null)
              );
            }}
            disabled={isPending}
            className="flex-1 min-h-[48px] rounded-xl bg-kvsr-cta text-white text-sm font-medium hover:bg-kvsr-cta/90 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => setHodPick(null)}
            disabled={isPending}
            className="min-h-[48px] px-4 rounded-xl border border-kvsr-soft text-sm text-muted-foreground hover:text-kvsr-ink"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
