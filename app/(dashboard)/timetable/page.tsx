import { TimetableGrid } from "@/components/timetable-grid";
import { getSections, getTimetableForSection } from "@/lib/db/queries";

export const metadata = {
  title: "Timetable | KVSR Management",
};

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const sections = await getSections();
  const firstSection = sections[0];
  const slots = firstSection
    ? await getTimetableForSection(firstSection.id)
    : [];

  const sectionName = firstSection
    ? `${firstSection.year}-${firstSection.name}`
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
        <TimetableGrid slots={slots} sectionName={sectionName} />
      )}
    </div>
  );
}
