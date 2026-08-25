"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search, Mail, Phone, GraduationCap, Users, X } from "lucide-react";

interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  sectionId: string;
  sectionName: string;
  year: string;
  yearNumber: number;
}

interface Section {
  id: string;
  name: string;
  year: string;
}

interface StudentsListProps {
  students: Student[];
  sections: Section[];
  selectedSectionId: string;
  selectedYear: string;
  searchQuery: string;
}

const YEARS = [
  { value: "all", label: "All Years" },
  { value: "I", label: "I Year" },
  { value: "II", label: "II Year" },
  { value: "III", label: "III Year" },
  { value: "IV", label: "IV Year" },
];

export function StudentsList({
  students,
  sections,
  selectedSectionId,
  selectedYear,
  searchQuery,
}: StudentsListProps) {
  const [search, setSearch] = useState(searchQuery);

  const buildHref = (params: { section?: string; year?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params.section !== undefined) query.set("section", params.section);
    if (params.year !== undefined) query.set("year", params.year);
    if (params.search !== undefined && params.search.trim() !== "")
      query.set("search", params.search.trim());
    return `/students?${query.toString()}`;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
        {/* Section filter */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Section
          </label>
          <div className="flex flex-wrap gap-2">
            <a
              href={buildHref({ section: "all", year: selectedYear, search })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedSectionId === "all"
                  ? "bg-kvsr-navy text-white"
                  : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
              }`}
            >
              All
            </a>
            {sections.map((section) => (
              <a
                key={section.id}
                href={buildHref({
                  section: section.id,
                  year: selectedYear,
                  search,
                })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  section.id === selectedSectionId
                    ? "bg-kvsr-navy text-white"
                    : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                }`}
              >
                {section.year}-{section.name}
              </a>
            ))}
          </div>
        </div>

        {/* Year filter */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Year
          </label>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((year) => (
              <a
                key={year.value}
                href={buildHref({
                  section: selectedSectionId,
                  year: year.value,
                  search,
                })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedYear === year.value
                    ? "bg-kvsr-cta text-white"
                    : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-cta/50"
                }`}
              >
                {year.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <form
        action="/students"
        method="GET"
        className="flex flex-col sm:flex-row gap-3"
      >
        <input type="hidden" name="section" value={selectedSectionId} />
        <input type="hidden" name="year" value={selectedYear} />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name or roll number"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-kvsr-navy text-white text-sm font-medium rounded-xl hover:bg-kvsr-navy/90 transition-colors"
        >
          Search
        </button>
        {searchQuery && (
          <a
            href="/students"
            className="px-4 py-3 border border-kvsr-soft rounded-xl text-sm font-medium text-muted-foreground hover:bg-kvsr-navy/[0.03] transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </a>
        )}
      </form>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          {students.length} student{students.length !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* Student grid */}
      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-kvsr-soft p-12 text-center shadow-sm">
          <GraduationCap className="w-10 h-10 text-kvsr-muted mx-auto mb-3" />
          <p className="text-muted-foreground">No students match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className="group p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm hover:shadow-md hover:border-kvsr-navy/10 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-kvsr-ink leading-tight">
                    {student.fullName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Roll #{student.rollNumber}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-kvsr-navy/[0.06] text-kvsr-navy text-xs font-semibold shrink-0">
                  {student.year}-{student.sectionName}
                </span>
              </div>

              <div className="space-y-2 pt-3 border-t border-kvsr-soft">
                {student.email && (
                  <a
                    href={`mailto:${student.email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{student.email}</span>
                  </a>
                )}
                {student.phone && (
                  <a
                    href={`tel:${student.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{student.phone}</span>
                  </a>
                )}
                {!student.email && !student.phone && (
                  <p className="text-sm text-muted-foreground italic">
                    No contact info
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
