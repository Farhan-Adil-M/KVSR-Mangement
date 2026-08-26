import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * College timezone (IST) clock — server UTC clocks must never drive
 * "today" logic for an Indian campus. Derive date/day/time-of-day in IST.
 */
const COLLEGE_TZ = "Asia/Kolkata";

export function getCollegeNow(): {
  date: string; // YYYY-MM-DD in IST
  dayName: string; // Monday..Sunday in IST
  minutesSinceMidnight: number; // IST wall-clock minutes
} {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLLEGE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: COLLEGE_TZ,
    weekday: "long",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: COLLEGE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [h, m] = time.split(":").map(Number);
  return { date, dayName, minutesSinceMidnight: h * 60 + m };
}