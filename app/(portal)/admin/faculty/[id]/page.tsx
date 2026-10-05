import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getFacultyList, getFacultySchedule, getPeriods } from "@/lib/db/queries";
import { getFacultyAssignments, requireAdmin } from "@/lib/auth/guards";
import { getFacultyRatingSummary } from "@/lib/actions/ratings";
import { getAppConfig } from "@/lib/app-config";
import { AssignmentManager } from "@/components/assignment-manager";
import { db } from "@/lib/db";
import { subjects, sections, studyYears } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { Crown, Mail, Phone, Calendar, Clock, Star } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Faculty Profile | ${config.institutionShortName} Management`,
  };
}

interface FacultyDetailPageProps {
  params: { id: string };
}

export default async function FacultyDetailPage({
  params,
}: FacultyDetailPageProps) {
  await requireAdmin();

  const faculty = await getFacultyList();
  const member = faculty.find((f) => f.id === params.id);

  if (!member) {
    notFound();
  }

  const [schedule, assignments, subjectRows, sectionRows, periods, rating, config] =
    await Promise.all([
      getFacultySchedule(member.id),
      getFacultyAssignments(member.id),
      db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .orderBy(asc(subjects.name)),
      db
        .select({
          id: sections.id,
          name: sections.name,
          year: studyYears.label,
        })
        .from(sections)
        .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
        .orderBy(asc(studyYears.yearNumber), asc(sections.name)),
      getPeriods(),
      getFacultyRatingSummary(member.id),
      getAppConfig(),
    ]);

  const slotByCell = new Map<string, (typeof schedule)[number]>();
  for (const slot of schedule) {
    slotByCell.set(`${slot.dayOfWeek}|${slot.periodNumber}`, slot);
  }

  const slotsByAssignment = assignments.map((a) => ({
    assignmentId: a.assignmentId,
    subjectId: a.subjectId,
    subjectName: a.subjectName,
    sectionId: a.sectionId,
    sectionName: a.sectionName,
    yearLabel: a.yearLabel,
    periods: schedule
      .filter(
        (s) => s.subject === a.subjectName && s.section === a.sectionName
      )
      .map((s) => ({
        day: s.dayOfWeek,
        periodNumber: s.periodNumber,
        time: `${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`,
      }))
      .sort((x, y) => x.periodNumber - y.periodNumber),
  }));

  const initials = member.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={member.fullName}
          subtitle={member.department || `${config.institutionShortName} Faculty`}
          breadcrumbs={[{ label: "Faculty", href: "/admin/faculty" }]}
        />

        {/* Profile summary */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-kvsr-soft bg-white shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-kvsr-navy/5 text-kvsr-navy font-semibold text-xl shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-kvsr-navy text-lg truncate">
                  {member.fullName}
                </p>
                {member.isHod && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-kvsr-gold/15 text-kvsr-cta text-xs font-semibold mt-1">
                    <Crown className="w-3 h-3" />
                    Head of Department
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </a>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  {member.phone}
                </a>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-kvsr-soft bg-white shadow-sm p-5 flex flex-col justify-center">
            <p className="text-3xl font-bold text-kvsr-navy">{assignments.length}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Class assignments
            </p>
          </div>
          <div className="rounded-2xl border border-kvsr-soft bg-white shadow-sm p-5 flex flex-col justify-center">
            <p className="text-3xl font-bold text-kvsr-navy">{schedule.length}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Periods per week
            </p>
          </div>
          <div className="rounded-2xl border border-kvsr-soft bg-white shadow-sm p-5 flex flex-col justify-center">
            <p className="text-3xl font-bold text-kvsr-navy">
              {rating.count > 0 ? rating.average.toFixed(1) : "—"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Star
                className="w-4 h-4 text-kvsr-gold"
                fill="currentColor"
                aria-hidden="true"
              />
              <span className="sr-only">Student rating — </span>
              {rating.count > 0
                ? `from ${rating.count} student rating${rating.count !== 1 ? "s" : ""}`
                : "No ratings yet"}
            </p>
          </div>
        </div>

        {/* Weekly timetable grid: periods × days */}
        <section className="rounded-2xl border border-kvsr-soft bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-kvsr-soft/70">
            <h2 className="text-lg font-semibold text-kvsr-navy flex items-center gap-2">
              <Clock className="w-5 h-5 text-kvsr-orange" />
              Weekly Schedule
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {schedule.length} periods across {config.teachingDays.length} teaching days
            </p>
          </div>
          {schedule.length === 0 ? (
            <p className="text-muted-foreground text-center py-10 text-sm">
              No scheduled periods yet — assign classes with periods below.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[720px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-kvsr-navy/[0.03] px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-kvsr-soft min-w-[110px]">
                      Period
                    </th>
                    {config.teachingDays.map((day) => (
                      <th
                        key={day}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-kvsr-soft min-w-[140px]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id} className="border-b border-kvsr-soft/60 last:border-0">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left font-medium text-kvsr-ink border-r border-kvsr-soft/60 align-top"
                      >
                        <span className="block text-sm">P{period.periodNumber}</span>
                        <span className="block text-xs text-muted-foreground font-normal">
                          {period.startTime.slice(0, 5)}–{period.endTime.slice(0, 5)}
                        </span>
                      </th>
                      {config.teachingDays.map((day) => {
                        const slot = slotByCell.get(`${day}|${period.periodNumber}`);
                        return (
                          <td key={`${day}-${period.id}`} className="px-2 py-2 align-top">
                            {slot ? (
                              <div className="rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.03] px-3 py-2 h-full">
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="font-semibold text-kvsr-ink text-xs leading-snug">
                                    {slot.subject}
                                  </span>
                                  {slot.isLab && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-kvsr-orange/10 text-kvsr-cta text-[10px] font-semibold shrink-0">
                                      Lab
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-kvsr-cta font-medium mt-1">
                                  {slot.year}-{slot.section}
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-kvsr-soft/60 px-3 py-2 h-full flex items-center">
                                <span className="text-kvsr-muted/40 text-xs">—</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Class assignments management (admin-only) */}
        <section className="rounded-2xl border border-kvsr-soft bg-white shadow-sm">
          <div className="px-5 pt-5 pb-4 border-b border-kvsr-soft/70">
            <h2 className="text-lg font-semibold text-kvsr-navy flex items-center gap-2">
              <Calendar className="w-5 h-5 text-kvsr-orange" />
              Class Assignments
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Grant class access and schedule their weekly periods in one step.
            </p>
          </div>
          <div className="p-5">
            <AssignmentManager
              facultyId={member.id}
              existing={assignments.map((a) => ({
                assignmentId: a.assignmentId,
                subjectId: a.subjectId,
                subjectName: a.subjectName,
                sectionId: a.sectionId,
                sectionName: a.sectionName,
                yearLabel: a.yearLabel,
              }))}
              subjects={subjectRows.map((s) => ({ id: s.id, label: s.name }))}
              sections={sectionRows.map((s) => ({
                id: s.id,
                label: `${s.year}-${s.name}`,
              }))}
              periods={periods.map((p) => ({
                id: p.id,
                periodNumber: p.periodNumber,
                time: `${p.startTime.slice(0, 5)}–${p.endTime.slice(0, 5)}`,
              }))}
              teachingDays={config.teachingDays}
              slotsByAssignment={slotsByAssignment}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
