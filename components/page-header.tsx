import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Shared page header for sub-pages (Level 4 spec §9.3).
 *
 * Breadcrumbs (Home / section / page) + title + one-line subtitle.
 * Visually consistent with DashboardHeader but with no entrance animation —
 * motion stays on top-level dashboards only.
 */

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Ordered trail after "Home": intermediate links, then the current page. */
  breadcrumbs?: Breadcrumb[];
}

export function PageHeader({ title, subtitle, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li className="flex items-center">
              <Link
                href="/"
                className="rounded px-1 py-0.5 -mx-1 hover:text-kvsr-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
              >
                Home
              </Link>
            </li>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  <ChevronRight size={14} className="text-kvsr-muted/60" aria-hidden="true" />
                  {isLast ? (
                    <span aria-current="page" className="font-medium text-kvsr-ink">
                      {crumb.label}
                    </span>
                  ) : crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="rounded px-1 py-0.5 -mx-1 hover:text-kvsr-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <h1 className="text-3xl sm:text-4xl font-bold text-kvsr-navy">{title}</h1>
      {subtitle && <p className="text-muted-foreground mt-2 text-lg">{subtitle}</p>}
    </header>
  );
}
