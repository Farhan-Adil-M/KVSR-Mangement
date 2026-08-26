"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Users, TrendingDown, BookOpen, AlertCircle, Search } from "lucide-react";

interface ReportRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  subject: string;
  subjectId: string;
  classesHeld: number | null;
  classesAttended: number | null;
}

interface Section {
  id: string;
  name: string;
  year: string;
}

interface AttendanceReportProps {
  report: ReportRow[];
  sections: Section[];
  selectedSectionId: string;
}

function calculatePercentage(held: number, attended: number) {
  if (!held || held === 0) return 0;
  return Math.round((attended / held) * 100);
}

export function AttendanceReport({
  report,
  sections,
  selectedSectionId,
}: AttendanceReportProps) {
  // Aggregate per student
  const studentMap = new Map<
    string,
    { fullName: string; rollNumber: string; totalHeld: number; totalAttended: number; subjects: number }
  >();

  // Aggregate per subject
  const subjectMap = new Map<
    string,
    { name: string; held: number; attended: number; studentCount: number }
  >();

  report.forEach((row) => {
    const held = row.classesHeld ?? 0;
    const attended = row.classesAttended ?? 0;

    // Student aggregation
    const existingStudent = studentMap.get(row.studentId);
    if (existingStudent) {
      existingStudent.totalHeld += held;
      existingStudent.totalAttended += attended;
      existingStudent.subjects += 1;
    } else {
      studentMap.set(row.studentId, {
        fullName: row.fullName,
        rollNumber: row.rollNumber,
        totalHeld: held,
        totalAttended: attended,
        subjects: 1,
      });
    }

    // Subject aggregation
    const existingSubject = subjectMap.get(row.subjectId);
    if (existingSubject) {
      existingSubject.held += held;
      existingSubject.attended += attended;
      existingSubject.studentCount += 1;
    } else {
      subjectMap.set(row.subjectId, {
        name: row.subject,
        held,
        attended,
        studentCount: 1,
      });
    }
  });

  const students = Array.from(studentMap.entries())
    .map(([id, data]) => ({
      id,
      ...data,
      percentage: calculatePercentage(data.totalHeld, data.totalAttended),
    }))
    .sort((a, b) => a.percentage - b.percentage);

  const subjects = Array.from(subjectMap.entries()).map(([id, data]) => ({
    id,
    ...data,
    percentage: calculatePercentage(data.held, data.attended),
  }));

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const visibleStudents = q
    ? students.filter(
        (s) => s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
      )
    : students;

  return (
    <div className="space-y-6">
      {/* Section selector */}
      <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Section
        </label>
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const isSelected = section.id === selectedSectionId;
            return (
              <a
                key={section.id}
                href={`/admin/attendance/reports?section=${section.id}`}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isSelected
                    ? "bg-kvsr-navy text-white shadow-md"
                    : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                }`}
              >
                {section.year}-{section.name}
              </a>
            );
          })}
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-kvsr-soft p-12 text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-kvsr-muted mx-auto mb-3" />
          <p className="text-muted-foreground">
            No attendance data found for{" "}
            {selectedSection
              ? `${selectedSection.year}-${selectedSection.name}`
              : "this section"}
            .
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Mark attendance first to generate reports.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Students
                </span>
              </div>
              <div className="text-3xl font-bold text-kvsr-ink">
                {students.length}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Subjects
                </span>
              </div>
              <div className="text-3xl font-bold text-kvsr-ink">
                {subjects.length}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Below 75%
                </span>
              </div>
              <div className="text-3xl font-bold text-kvsr-ink">
                {students.filter((s) => s.percentage < 75).length}
              </div>
            </div>
          </div>

          {/* Subject breakdown */}
          <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-kvsr-soft">
              <h3 className="font-semibold text-kvsr-ink">Subject-wise Attendance</h3>
            </div>
            <div className="divide-y divide-kvsr-soft">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-kvsr-ink">{subject.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {subject.studentCount} students · {subject.attended} /{" "}
                      {subject.held} classes
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 sm:w-40 h-2 rounded-full bg-kvsr-navy/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          subject.percentage >= 75
                            ? "bg-emerald-500"
                            : subject.percentage >= 60
                            ? "bg-kvsr-gold"
                            : "bg-red-500"
                        }`}
                      />
                    </div>
                    <span className="text-sm font-semibold text-kvsr-ink w-12 text-right">
                      {subject.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student breakdown */}
          <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-kvsr-soft space-y-3">
              <h3 className="font-semibold text-kvsr-ink">Student Attendance</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a student by name or roll number…"
                  aria-label="Search students in report"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                />
              </div>
            </div>
            <div className="divide-y divide-kvsr-soft">
              {visibleStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-kvsr-navy/[0.02] transition-colors"
                >
                  <div>
                    <p className="font-medium text-kvsr-ink">{student.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      Roll #{student.rollNumber} · {student.subjects} subjects ·{" "}
                      {student.totalAttended} / {student.totalHeld} classes
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 sm:w-40 h-2 rounded-full bg-kvsr-navy/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          student.percentage >= 75
                            ? "bg-emerald-500"
                            : student.percentage >= 60
                            ? "bg-kvsr-gold"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${student.percentage}%` }}
                      />
                    </div>
                    <span
                      className={`text-sm font-semibold w-12 text-right ${
                        student.percentage >= 75
                          ? "text-emerald-600"
                          : student.percentage >= 60
                          ? "text-kvsr-cta"
                          : "text-red-600"
                      }`}
                    >
                      {student.percentage}%
                    </span>
                  </div>
                </motion.div>
              ))}
              {visibleStudents.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No students match “{search}”.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
