import Link from "next/link";

export function FacultyStudentsTabs({ active }: { active: "directory" | "biometrics" }) {
  const base =
    "px-4 py-2 rounded-xl text-sm font-semibold transition-all";
  const activeCls = "bg-kvsr-navy text-white shadow-md";
  const inactiveCls =
    "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30";

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Link
        href="/faculty/students"
        className={`${base} ${active === "directory" ? activeCls : inactiveCls}`}
      >
        Directory
      </Link>
      <Link
        href="/faculty/biometrics"
        className={`${base} ${active === "biometrics" ? activeCls : inactiveCls}`}
      >
        Biometrics
      </Link>
    </div>
  );
}
