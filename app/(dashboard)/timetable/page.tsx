import { TimetableGrid } from "@/components/timetable-grid";
import { getSections, getTimetableForSection } from "@/lib/db/queries";

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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-kvsr-navy">Timetable</h1>
        <p className="text-muted-foreground mt-1">
          View and manage class schedules
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">
            No sections found. Please run the database migration first.
          </p>
        </div>
      ) : (
        <>
          {/* Section selector */}
          <div className="mb-6">
            <p className="text-sm font-medium text-kvsr-navy mb-3">
              Select Section
            </p>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => {
                const isSelected = section.id === selectedSectionId;
                return (
                  <a
                    key={section.id}
                    href={`/timetable?section=${section.id}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-kvsr-navy text-white"
                        : "bg-white border border-border hover:bg-muted"
                    }`}
                  >
                    {section.year}-{section.name}
                  </a>
                );
              })}
            </div>
          </div>

          <TimetableGrid slots={slots} sectionName={sectionName} />
        </>
      )}
    </div>
  );
}
