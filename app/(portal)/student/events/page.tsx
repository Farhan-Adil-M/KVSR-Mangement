import { EventsList } from "@/components/events-list";
import { PageHeader } from "@/components/page-header";
import { requireStudent } from "@/lib/auth/guards";
import {
  getEventsForRole,
  getStudentEnrollmentDepartmentId,
} from "@/lib/db/event-queries";
import { getAppConfig } from "@/lib/app-config";
import { getCollegeNow } from "@/lib/utils";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Events | ${config.institutionShortName} Management`,
  };
}

export default async function StudentEventsPage() {
  const session = await requireStudent();

  const [events, today] = await Promise.all([
    getEventsForRole("student", {
      studentSectionDeptId: await getStudentEnrollmentDepartmentId(session.id),
    }),
    Promise.resolve(getCollegeNow().date),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Events"
          subtitle="What's coming up on campus"
          breadcrumbs={[
            { label: "Student", href: "/student/dashboard" },
            { label: "Events" },
          ]}
        />
        <EventsList
          events={events}
          today={today}
          showAudience={false}
          emptyHint="Events announced by your department or the administration will appear here."
        />
      </div>
    </div>
  );
}
