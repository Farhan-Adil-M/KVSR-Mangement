import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:ml-72 min-h-screen bg-muted/30 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
