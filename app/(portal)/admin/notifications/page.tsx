import { PageHeader } from "@/components/page-header";
import { NotificationComposer } from "@/components/notification-composer";
import { EmptyState } from "@/components/empty-state";
import { getAllNotifications } from "@/lib/db/portal-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Notifications | ${config.institutionShortName} Management`,
  };
}

function audienceLabel(
  notification: { facultyName: string | null; studentName: string | null; targetRole: string | null }
): string {
  if (notification.facultyName) return `Faculty: ${notification.facultyName}`;
  if (notification.studentName) return `Student: ${notification.studentName}`;
  switch (notification.targetRole) {
    case "faculty":
      return "All faculty";
    case "student":
      return "All students";
    case "both":
      return "Everyone (faculty + students)";
    case "admin":
      return "Admins";
    default:
      return "All users";
  }
}

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const notifications = await getAllNotifications();

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Notifications"
          subtitle="Broadcast announcements to faculty and students"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Notifications" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
              <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="text-lg text-kvsr-navy">New Notification</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <NotificationComposer />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications sent yet" />
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-kvsr-ink">{n.title}</h3>
                    <span className="px-2.5 py-1 rounded-full bg-kvsr-navy/[0.06] text-kvsr-navy text-xs font-semibold whitespace-nowrap">
                      {audienceLabel(n)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
                  <p className="text-xs text-kvsr-muted mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
