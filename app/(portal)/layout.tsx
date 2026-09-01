import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { UpdateChecker } from "@/components/update-checker";
import { requireSession } from "@/lib/auth/guards";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Backend enforcement: no session, no portal.
  const session = await requireSession();

  return (
    <div className="min-h-screen">
      <Sidebar user={session} />
      <main className="lg:ml-72 min-h-screen bg-muted/30 overflow-auto pt-14 lg:pt-0 pb-24 lg:pb-0">
        {children}
      </main>
      <MobileNav user={session} />
      <UpdateChecker />
    </div>
  );
}
