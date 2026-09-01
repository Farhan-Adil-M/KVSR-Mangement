"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  setHod,
  getDepartmentsWithHod,
  getFacultyList,
  type DepartmentWithHod,
  type FacultyListRow,
} from "@/lib/actions/admin";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentWithHod[]>([]);
  const [faculty, setFaculty] = useState<FacultyListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ code: "", name: "" });
  const [editing, setEditing] = useState<DepartmentWithHod | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [depts, fac] = await Promise.all([
      getDepartmentsWithHod(),
      getFacultyList(),
    ]);
    setDepartments(depts);
    setFaculty(fac);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createDepartment(form);
      if (res.success) {
        setForm({ code: "", name: "" });
        showMessage("Department created.");
        await load();
      } else {
        showMessage(res.error);
      }
    });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    startTransition(async () => {
      const res = await updateDepartment({
        id: editing.id,
        code: editing.code,
        name: editing.name,
      });
      if (res.success) {
        setEditing(null);
        showMessage("Department updated.");
        await load();
      } else {
        showMessage(res.error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this department?")) return;
    startTransition(async () => {
      const res = await deleteDepartment(id);
      showMessage(res.success ? "Department deleted." : res.error);
      if (res.success) await load();
    });
  }

  function handleSetHod(departmentId: string, facultyId: string) {
    startTransition(async () => {
      const res = await setHod({ departmentId, facultyId });
      showMessage(res.success ? "HOD updated." : res.error);
      if (res.success) await load();
    });
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-kvsr-navy">Departments</h1>
        <p className="text-sm text-slate-700">Create departments and assign HODs.</p>
      </div>

      {message && (
        <div className="rounded-lg bg-kvsr-orange/10 px-4 py-2 text-sm text-kvsr-orange">
          {message}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-600">Code</label>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="CSE"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-orange"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Computer Science & Engineering"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-orange"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-kvsr-navy px-4 py-2 text-sm font-medium text-white hover:bg-kvsr-navy/90 disabled:opacity-50"
        >
          Add Department
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-700">Loading departments...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">HOD</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Assign HOD</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Faculty</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{d.code}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {editing?.id === d.id ? (
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      d.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.hodName ? <span className="font-medium text-green-600">{d.hodName}</span> : "â€”"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={d.hodId ?? ""}
                      onChange={(e) => handleSetHod(d.id, e.target.value)}
                      disabled={isPending}
                      className="w-48 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-orange"
                    >
                      <option value="">â€” Select HOD â€”</option>
                      {faculty
                        .filter((f) => f.departmentId === d.id)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.fullName}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{d.facultyCount}</td>
                  <td className="px-4 py-3 text-right">
                    {editing?.id === d.id ? (
                      <form onSubmit={handleUpdate} className="inline-flex gap-2">
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => setEditing(d)}
                          className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={isPending}
                          className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
