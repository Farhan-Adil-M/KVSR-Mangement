import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <Sidebar user={session} />
      <main className="lg:ml-72 min-h-screen bg-muted/30 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
