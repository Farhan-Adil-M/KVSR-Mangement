import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { FacultyStudentsTabs } from "@/components/faculty-students-tabs";
import { getFacultyStudents } from "@/lib/db/portal-queries";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { Search, Users, Mail, Phone, X } from "lucide-react";
import { db } from "@/lib/db";
import { students as studentsTable } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const metadata = { title: "My Students | KVSR Management" };

interface PageProps {
  searchParams: { section?: string; q?: string };
}

export default async function FacultyStudentsPage({ searchParams }: PageProps) {
  const session = await requireFaculty();

  const [myStudents, assignments] = await Promise.all([
    getFacultyStudents(session.id),
    getFacultyAssignments(session.id),
  ]);

  // Only sections the faculty is assigned to are selectable.
  const mySections = Array.from(
    new Map(
      assignments.map((a) => [
        a.sectionId,
        { id: a.sectionId, label: `${a.yearLabel}-${a.sectionName}` },
      ])
    ).values()
  );

  const selectedSection = searchParams.section;
  const validSection =
    selectedSection && mySections.some((s) => s.id === selectedSection)
      ? selectedSection
      : null;

  const q = (searchParams.q ?? "").trim().toLowerCase();
  let visible = validSection
    ? myStudents.filter((s) => s.sectionId === validSection)
    : myStudents;
  if (q) {
    visible = visible.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    );
  }

  // Contact info for visible students only.
  const contact =
    visible.length > 0
      ? await db
          .select({
            id: studentsTable.id,
            email: studentsTable.email,
            phone: studentsTable.phone,
          })
          .from(studentsTable)
          .where(inArray(studentsTable.id, visible.map((s) => s.id)))
      : [];
  const contactMap = new Map(contact.map((c) => [c.id, c]));

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="My Students"
          subtitle="Students in the classes you teach"
        />

        <FacultyStudentsTabs active="directory" />

        {/* Class filter */}
        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Class
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={q ? `/faculty/students?q=${encodeURIComponent(q)}` : "/faculty/students"}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  !validSection
                    ? "bg-kvsr-navy text-white shadow-md"
                    : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                }`}
              >
                All my classes
              </a>
              {mySections.map((s) => {
                const sp = new URLSearchParams();
                if (q) sp.set("q", q);
                sp.set("section", s.id);
                return (
                  <a
                    key={s.id}
                    href={`/faculty/students?${sp.toString()}`}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      validSection === s.id
                        ? "bg-kvsr-navy text-white shadow-md"
                        : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                    }`}
                  >
                    {s.label}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <form action="/faculty/students" method="GET" className="flex flex-col sm:flex-row gap-2">
            {validSection && <input type="hidden" name="section" value={validSection} />}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
              <input
                type="text"
                name="q"
                defaultValue={searchParams.q ?? ""}
                placeholder="Search by name or roll number…"
                aria-label="Search students"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-kvsr-navy text-white text-sm font-medium rounded-xl hover:bg-kvsr-navy/90 transition-colors"
            >
              Search
            </button>
            {(searchParams.q || validSection) && (
              <a
                href="/faculty/students"
                className="px-4 py-2.5 border border-kvsr-soft rounded-xl text-sm font-medium text-muted-foreground hover:bg-kvsr-navy/[0.03] transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </a>
            )}
          </form>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? `No students match “${searchParams.q}”` : "No students found"}
            description={
              q
                ? "Try a different name or roll number, or clear the search."
                : "You have no assigned classes yet, or no students are enrolled."
            }
          />
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Users className="w-4 h-4" />
              {visible.length} student{visible.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((s) => {
                const c = contactMap.get(s.id);
                return (
                  <div
                    key={s.id}
                    className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-kvsr-ink leading-tight">
                          {s.fullName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Roll #{s.rollNumber}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-kvsr-navy/[0.06] text-kvsr-navy text-xs font-semibold whitespace-nowrap">
                        {s.year}-{s.section}
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-3 border-t border-kvsr-soft">
                      {c?.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </a>
                      )}
                      {c?.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{c.phone}</span>
                        </a>
                      )}
                      {!c?.email && !c?.phone && (
                        <p className="text-sm text-muted-foreground italic">
                          No contact info
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
