import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { BiometricEnrollList } from "@/components/biometric-enroll-list";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { getSectionStudentsForBiometrics } from "@/lib/actions/biometrics";
import { Fingerprint } from "lucide-react";

export const metadata = { title: "Biometric Enrollment | KVSR Management" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { section?: string };
}

export default async function FacultyBiometricsPage({ searchParams }: PageProps) {
  const session = await requireFaculty();
  const assignments = await getFacultyAssignments(session.id);

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
    selectedSection && mySections.some((s) => s.id === selectedSection) ? selectedSection : null;

  const result = validSection
    ? await getSectionStudentsForBiometrics(validSection)
    : null;
  const students = result && result.ok ? result.students : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Biometric Enrollment"
          subtitle="Capture a student's face so attendance can be marked by camera. Only assigned classes are shown."
        />

        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Class
          </p>
          {mySections.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no assigned classes.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mySections.map((s) => (
                <a
                  key={s.id}
                  href={`/faculty/biometrics?section=${s.id}`}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    validSection === s.id
                      ? "bg-kvsr-navy text-white shadow-md"
                      : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {!validSection ? (
          <EmptyState
            icon={Fingerprint}
            title="Select a class"
            description="Choose one of your assigned classes to enroll student biometrics."
          />
        ) : result && !result.ok ? (
          <EmptyState icon={Fingerprint} title="Cannot load students" description={result.error} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Fingerprint}
            title="No students enrolled"
            description="No active students found in this section."
          />
        ) : (
          <BiometricEnrollList students={students} />
        )}
      </div>
    </div>
  );
}
