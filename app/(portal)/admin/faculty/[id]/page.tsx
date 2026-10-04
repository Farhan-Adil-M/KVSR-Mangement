import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { getFacultyList, getFacultySchedule } from "@/lib/db/queries";
import { getFacultyAssignments, requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import { AssignmentManager } from "@/components/assignment-manager";
import { db } from "@/lib/db";
import { subjects, sections, studyYears } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Mail, Phone, Calendar, Clock, ArrowLeft } from "lucide-react";

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

  const [schedule, assignments, subjectRows, sectionRows, config] = await Promise.all([
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
    getAppConfig(),
  ]);

  const scheduleByDay = config.teachingDays.map((day) => ({
    day,
    slots: schedule.filter((s) => s.dayOfWeek === day),
  }));

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <a
          href="/admin/faculty"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-kvsr-ink transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to faculty
        </a>

        <DashboardHeader
          title={member.fullName}
          subtitle={member.department || `${config.institutionShortName} Faculty`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div>
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-kvsr-navy/5 text-kvsr-navy font-semibold text-2xl shrink-0">
                    {member.fullName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-kvsr-navy">
                      {member.fullName}
                    </CardTitle>
                    {member.isHod && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-kvsr-gold/15 text-kvsr-cta text-xs font-semibold mt-1">
                        <Crown className="w-3 h-3" />
                        Head of Department
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {member.email}
                  </a>
                )}
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {member.phone}
                  </a>
                )}
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {schedule.length} scheduled slots per week
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule */}
          <div className="lg:col-span-2">
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm h-full">
              <CardHeader>
                <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                  <Clock className="w-5 h-5 text-kvsr-orange" />
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {scheduleByDay.map((daySchedule) =>
                    daySchedule.slots.length === 0 ? null : (
                      <div key={daySchedule.day}>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {daySchedule.day}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {daySchedule.slots.map((slot) => (
                            <div
                              key={slot.id}
                              className="p-4 rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02]"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-semibold text-kvsr-ink text-sm">
                                  {slot.subject}
                                </span>
                                {slot.isLab && (
                                  <span className="px-2 py-0.5 rounded-full bg-kvsr-orange/10 text-kvsr-cta text-xs font-medium">
                                    Lab
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                P{slot.periodNumber} · {slot.startTime.slice(0, 5)} -{" "}
                                {slot.endTime.slice(0, 5)}
                              </p>
                              <p className="text-xs text-kvsr-cta mt-1 font-medium">
                                {slot.year}-{slot.section}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  {schedule.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No scheduled slots for this faculty member.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Class assignments management (admin-only) */}
        <div className="mt-6">
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardHeader className="pb-4 pt-6 px-6">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Calendar className="w-5 h-5 text-kvsr-orange" />
                Class Assignments
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Controls which subject + section classes this faculty member can
                access, mark attendance for, and evaluate.
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
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
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
