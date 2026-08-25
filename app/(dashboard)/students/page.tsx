import { DashboardHeader } from "@/components/dashboard-header";
import { StudentsList } from "@/components/students-list";
import {
  getSections,
  getStudentsWithEnrollments,
} from "@/lib/db/queries";

export const metadata = {
  title: "Students | KVSR Management",
};

interface StudentsPageProps {
  searchParams: {
    section?: string;
    year?: string;
    search?: string;
  };
}

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps) {
  const sections = await getSections();
  const selectedSectionId = searchParams.section || "all";
  const selectedYear = searchParams.year || "all";
  const searchQuery = searchParams.search || "";

  const students = await getStudentsWithEnrollments({
    sectionId: selectedSectionId === "all" ? undefined : selectedSectionId,
    year: selectedYear === "all" ? undefined : selectedYear,
    search: searchQuery || undefined,
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Students"
          subtitle="Browse and search enrolled students"
        />

        <StudentsList
          students={students}
          sections={sections}
          selectedSectionId={selectedSectionId}
          selectedYear={selectedYear}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
