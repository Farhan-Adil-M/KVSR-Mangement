import { EventManager } from "@/components/event-manager";
import { EventsList } from "@/components/events-list";
import { PageHeader } from "@/components/page-header";
import { requireFaculty } from "@/lib/auth/guards";
import {
  getEventsForRole,
  getFacultyDepartmentId,
} from "@/lib/db/event-queries";
import { getDepartmentsWithPrograms } from "@/lib/db/queries";
import { getAppConfig } from "@/lib/app-config";
import { getCollegeNow } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Events | ${config.institutionShortName} Management`,
  };
}

export default async function FacultyEventsPage() {
  const session = await requireFaculty();

  const isHod = session.role === "hod";
  const departmentId = await getFacultyDepartmentId(session.id);

  const [events, deptRows] = await Promise.all([
    getEventsForRole(session.role, { departmentId }),
    isHod
      ? getDepartmentsWithPrograms()
      : Promise.resolve(
          [] as { departmentId: string; departmentName: string }[]
        ),
  ]);
  const departmentName =
    deptRows.find((row) => row.departmentId === departmentId)?.departmentName ??
    null;
  const today = getCollegeNow().date;

  if (isHod && departmentId) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Events"
            subtitle="Institution-wide events are read-only; you manage your department's events"
            breadcrumbs={[
              { label: "Faculty", href: "/faculty/dashboard" },
              { label: "Events" },
            ]}
          />
          <EventManager
            events={events}
            role="hod"
            ownDepartmentId={departmentId}
            ownDepartmentName={departmentName}
            hodFacultyId={session.id}
            departments={[]}
            today={today}
          />
        </div>
      </div>
    );
  }

  if (isHod) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Events"
            subtitle="Institution-wide events, visible to everyone"
            breadcrumbs={[
              { label: "Faculty", href: "/faculty/dashboard" },
              { label: "Events" },
            ]}
          />
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-6">
            <CalendarDays className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-amber-800">
              You aren&apos;t assigned to a department yet, so you can view
              events but can&apos;t create or edit them. Ask an admin to assign
              you to a department.
            </p>
          </div>
          <EventsList
            events={events}
            today={today}
            showAudience
            emptyHint="Events announced by the administration will appear here."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Events"
          subtitle="Institution-wide and department events"
          breadcrumbs={[
            { label: "Faculty", href: "/faculty/dashboard" },
            { label: "Events" },
          ]}
        />
        <EventsList
          events={events}
          today={today}
          showAudience
          emptyHint="Events announced by the administration will appear here."
        />
      </div>
    </div>
  );
}
