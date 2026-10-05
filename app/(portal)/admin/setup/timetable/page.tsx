import { redirect } from "next/navigation";

/**
 * The timetable editor moved to /admin/timetable (it renders the weekly grid
 * per section, so it is viewer + editor). Keep the old Setup URL working.
 */
export default function SetupTimetableRedirect() {
  redirect("/admin/timetable");
}
