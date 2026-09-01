import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getFacultyNotifications } from "@/lib/db/portal-queries";
import { requireFaculty } from "@/lib/auth/guards";
import { getHodDepartment } from "@/lib/actions/admin";
import { HodNotificationComposer } from "@/components/hod-notification-composer";
import { Bell } from "lucide-react";

export const metadata = { title: "Notifications | KVSR Management" };

export default async function FacultyNotificationsPage() {
  const session = await requireFaculty();
  const notifications = await getFacultyNotifications(session.id);

  const isHod = session.role === "hod";
  const hodDept = isHod ? await getHodDepartment() : null;

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader title="Notifications" subtitle="Announcements for you" />

        {isHod && hodDept?.departmentId && (
          <div className="mb-6">
            <HodNotificationComposer
              departmentId={hodDept.departmentId}
              departmentName={hodDept.departmentName ?? "your department"}
            />
          </div>
        )}

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm"
              >
                <h3 className="font-semibold text-kvsr-ink">{n.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{n.body}</p>
                <p className="text-xs text-kvsr-muted mt-2">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
