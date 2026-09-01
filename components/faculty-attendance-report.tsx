"use client";

import { useEffect, useState } from "react";
import { getFacultyAttendanceReport } from "@/lib/actions/faculty-attendance";

export function FacultyAttendanceReport({ defaultDate }: { defaultDate?: string }) {
  const [date, setDate] = useState(
    defaultDate ?? new Date().toISOString().slice(0, 10)
  );
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getFacultyAttendanceReport>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const data = await getFacultyAttendanceReport(date);
      if (mounted) setRows(data);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [date]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-orange"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No faculty attendance data for this date.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Faculty</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Expected</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Marked</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Classes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.facultyId}>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.facultyName}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r.expected}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r.marked}</td>
                  <td className="px-4 py-3">
                    {r.slots.length === 0 ? (
                      <span className="text-xs text-slate-400">No classes scheduled</span>
                    ) : (
                      <ul className="space-y-1">
                        {r.slots.map((s) => (
                          <li
                            key={s.slotId}
                            className={`text-xs ${
                              s.marked ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            P{s.periodNumber} {s.subjectName} ({s.sectionName}){" "}
                            {s.startTime ? `at ${String(s.startTime).slice(0, 5)}` : ""} —{" "}
                            {s.marked ? "Marked" : "Pending"}
                          </li>
                        ))}
                      </ul>
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
