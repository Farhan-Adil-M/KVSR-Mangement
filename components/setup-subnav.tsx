import Link from "next/link";

const LINKS: { href: string; label: string }[] = [
  { href: "/admin/setup", label: "Overview" },
  { href: "/admin/setup/faculty", label: "Faculty" },
  { href: "/admin/setup/students", label: "Students" },
  { href: "/admin/setup/sections", label: "Sections" },
  { href: "/admin/setup/subjects", label: "Subjects" },
  { href: "/admin/setup/academic-years", label: "Academic Years" },
];

export function SetupSubNav({ current }: { current: string }) {
  return (
    <nav aria-label="Setup pages" className="mb-6 -mx-6 px-6 sm:mx-0 sm:px-0">
      <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:pb-0">
        {LINKS.map((link) => {
          const isActive = link.href === current;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center whitespace-nowrap px-4 min-h-[48px] sm:min-h-[38px] rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold ${
                isActive
                  ? "bg-kvsr-navy text-white shadow-sm"
                  : "bg-white text-kvsr-muted border border-kvsr-soft hover:border-kvsr-navy/40 hover:text-kvsr-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
