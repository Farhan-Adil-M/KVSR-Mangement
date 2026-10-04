"use client";

import { useMemo, useState } from "react";
import type { EventRow } from "@/lib/db/event-queries";
import { EmptyState } from "@/components/empty-state";
import {
  CalendarDays,
  Clock,
  MapPin,
  Search,
  Users,
} from "lucide-react";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function audienceLabel(audience: string): string {
  if (audience === "students") return "Students";
  if (audience === "faculty") return "Faculty";
  return "Students & Faculty";
}

export function formatEventTime(startTime: string | null, endTime: string | null): string | null {
  const trim = (t: string) => t.slice(0, 5);
  if (startTime && endTime) return `${trim(startTime)} – ${trim(endTime)}`;
  if (startTime) return `From ${trim(startTime)}`;
  if (endTime) return `Until ${trim(endTime)}`;
  return null;
}

export function EventDateRail({ eventDate }: { eventDate: string }) {
  const [, month, day] = eventDate.split("-");
  return (
    <div className="w-14 shrink-0 rounded-xl bg-kvsr-navy/[0.04] border border-kvsr-soft text-center py-2.5">
      <p className="text-xl font-bold text-kvsr-navy leading-none">
        {Number(day)}
      </p>
      <p className="text-[11px] font-semibold text-kvsr-muted uppercase tracking-wide mt-1">
        {MONTHS_SHORT[Number(month) - 1] ?? ""}
      </p>
    </div>
  );
}

interface EventCardProps {
  event: EventRow;
  showAudience: boolean;
  actions?: React.ReactNode;
}

export function EventCard({ event, showAudience, actions }: EventCardProps) {
  const time = formatEventTime(event.startTime, event.endTime);
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-kvsr-navy/[0.02]">
      <EventDateRail eventDate={event.eventDate} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-kvsr-ink">{event.title}</p>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
          {event.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {event.venue}
            </span>
          )}
          {time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              {time}
            </span>
          )}
          {showAudience && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              {audienceLabel(event.audience)}
            </span>
          )}
          <span className="flex items-center gap-1 font-medium text-kvsr-muted">
            {event.departmentName ? event.departmentName : "All departments"}
          </span>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 sm:pl-2">{actions}</div>
      )}
    </li>
  );
}

interface EventsListProps {
  events: EventRow[];
  /** IST today (YYYY-MM-DD) from the server — drives upcoming/past grouping. */
  today: string;
  showAudience: boolean;
  emptyHint: string;
}

export function EventsList({ events, today, showAudience, emptyHint }: EventsListProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const { upcoming, past } = useMemo(() => {
    const match = (e: EventRow) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      (e.description ?? "").toLowerCase().includes(q) ||
      (e.venue ?? "").toLowerCase().includes(q);
    const upcoming = events
      .filter((e) => e.eventDate >= today && match(e))
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const past = events
      .filter((e) => e.eventDate < today && match(e))
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return { upcoming, past };
  }, [events, today, q]);

  const group = (title: string, rows: EventRow[]) =>
    rows.length > 0 && (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-kvsr-muted uppercase tracking-wider">
          {title}
        </h2>
        <ul className="bg-white rounded-2xl border border-kvsr-soft shadow-sm divide-y divide-kvsr-soft overflow-hidden">
          {rows.map((event) => (
            <EventCard key={event.id} event={event} showAudience={showAudience} />
          ))}
        </ul>
      </section>
    );

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No events yet"
        description={emptyHint}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events"
          aria-label="Search events"
          className="w-full bg-white border border-kvsr-soft rounded-xl pl-10 pr-4 py-2.5 min-h-[48px] text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        />
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events match your search"
          description="Try a different word, or clear the search."
        />
      ) : (
        <>
          {group("Upcoming", upcoming)}
          {group("Past", past)}
        </>
      )}
    </div>
  );
}
