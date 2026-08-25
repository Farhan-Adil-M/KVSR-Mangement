import { TimetableGrid } from "@/components/timetable-grid";
import { getSections, getTimetableForSection } from "@/lib/db/queries";
import { DashboardHeader } from "@/components/dashboard-header";

export const metadata = {
  title: "Timetable | KVSR Management",
};

interface TimetablePageProps {
  searchParams: { section?: string };
}

export default async function TimetablePage({
  searchParams,
}: TimetablePageProps) {
  const sections = await getSections();
  const selectedSectionId = searchParams.section || sections[0]?.id;
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const slots = selectedSection
    ? await getTimetableForSection(selectedSection.id)
    : [];

  const sectionName = selectedSection
    ? `${selectedSection.year}-${selectedSection.name}`
    : "No sections";

  return (
    <div className="p-6 sm:p-8">
      <DashboardHeader
        title="Timetable"
        subtitle="View and manage class schedules"
      />

      {sections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            No sections found. Please run the database migration first.
          </p>
        </div>
      ) : (
        <TimetableGrid
          slots={slots}
          sectionName={sectionName}
          sections={sections}
          selectedSectionId={selectedSectionId}
        />
      )}
    </div>
  );
}
