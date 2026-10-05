import { ExamManager } from "@/components/exam-manager";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getExamsAdmin,
  getSectionsFull,
  getSubjectsList,
} from "@/lib/db/queries";
import { getAppConfig } from "@/lib/app-config";
import { getCollegeNow } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Exams | ${config.institutionShortName} Management`,
  };
}

export default async function AdminExamsPage() {
  await requireAdmin();

  const [exams, subjectRows, sectionRows, config] = await Promise.all([
    getExamsAdmin(),
    getSubjectsList(),
    getSectionsFull(),
    getAppConfig(),
  ]);

  const subjects = subjectRows.map((s) => ({
    id: s.id,
    name: s.code ? `${s.name} (${s.code})` : s.name,
  }));

  const sections = sectionRows.map((s) => ({
    id: s.id,
    label: `${s.year}-${s.name}`,
    studyYearId: s.studyYearId,
    yearLabel: s.year,
  }));

  const studyYearsMap = new Map<string, string>();
  for (const s of sectionRows) {
    if (!studyYearsMap.has(s.studyYearId)) {
      studyYearsMap.set(s.studyYearId, s.year);
    }
  }
  const studyYears = Array.from(studyYearsMap.entries()).map(([id, label]) => ({
    id,
    label,
  }));

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Exams"
          subtitle={`Schedule exams for sections or whole study years · ${config.institutionShortName}`}
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Exams" },
          ]}
        />

        {sections.length === 0 || studyYears.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No sections set up yet"
            description="Create study years and sections in Setup before scheduling exams."
          />
        ) : (
          <ExamManager
            exams={exams}
            subjects={subjects}
            sections={sections}
            studyYears={studyYears}
            today={getCollegeNow().date}
          />
        )}
      </div>
    </div>
  );
}
