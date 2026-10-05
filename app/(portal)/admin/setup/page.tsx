import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SetupSubNav } from "@/components/setup-subnav";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import {
  getAcademicYearsList,
  getDashboardStats,
  getFacultyList,
  getSectionsFull,
  getSubjectsList,
  getSystemConfig,
} from "@/lib/db/queries";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  GraduationCap,
  Settings,
  Users,
} from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Setup | ${config.institutionShortName} Management`,
  };
}

export default async function SetupIndexPage() {
  await requireAdmin();

  const [facultyRows, sections, subjects, years, stats, systemConfig] =
    await Promise.all([
      getFacultyList(),
      getSectionsFull(),
      getSubjectsList(),
      getAcademicYearsList(),
      getDashboardStats(),
      getSystemConfig(),
    ]);

  const cards = [
    {
      href: "/admin/setup/faculty",
      icon: Users,
      title: "Faculty accounts",
      detail: "Create staff logins with a username and password",
      count: facultyRows.length,
      countLabel: "faculty",
    },
    {
      href: "/admin/setup/students",
      icon: GraduationCap,
      title: "Students",
      detail: "Create students and review the full roster",
      count: stats.students,
      countLabel: "students",
    },
    {
      href: "/admin/setup/sections",
      icon: BookOpen,
      title: "Sections",
      detail: "Study years, section names and class teachers",
      count: sections.length,
      countLabel: "sections",
    },
    {
      href: "/admin/setup/subjects",
      icon: BookMarked,
      title: "Subjects",
      detail: "Subjects, lab and elective flags, department ownership",
      count: subjects.length,
      countLabel: "subjects",
    },
    {
      href: "/admin/timetable",
      icon: Calendar,
      title: "Timetables",
      detail: "Weekly slot editor per section",
      count: stats.slots,
      countLabel: "slots",
    },
    {
      href: "/admin/setup/academic-years",
      icon: CalendarDays,
      title: "Academic years",
      detail: "Year ranges and which one is current",
      count: years.length,
      countLabel: "years",
    },
    {
      href: "/admin/departments",
      icon: Building2,
      title: "Departments & programs",
      detail: "Departments, programs and study years live in Settings",
      count: systemConfig.departments,
      countLabel: "departments",
    },
    {
      href: "/admin/settings",
      icon: Settings,
      title: "Settings",
      detail: "Campus location and app configuration",
    },
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Setup"
          subtitle="Everything the college runs on — people, classes, subjects and the calendar"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Setup" },
          ]}
        />
        <SetupSubNav current="/admin/setup" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col rounded-2xl bg-white border border-kvsr-soft shadow-sm p-5 hover:border-kvsr-navy/30 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-kvsr-navy/[0.04]">
                    <Icon className="w-5 h-5 text-kvsr-navy" aria-hidden="true" />
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-kvsr-muted/50 group-hover:text-kvsr-cta group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="mt-4 font-semibold text-kvsr-ink">{card.title}</h2>
                <p className="text-sm text-muted-foreground mt-1 flex-1">
                  {card.detail}
                </p>
                {card.count !== undefined && (
                  <p className="mt-4 pt-3 border-t border-kvsr-soft text-sm">
                    <span className="text-lg font-bold text-kvsr-ink">
                      {card.count}
                    </span>{" "}
                    <span className="text-muted-foreground">{card.countLabel}</span>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
