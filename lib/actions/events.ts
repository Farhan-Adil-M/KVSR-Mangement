"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { events, faculty } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { planEventLocally, type EventPlan } from "@/lib/event-planner";

export type EventActionResult = { success: true } | { success: false; error: string };

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable(),
  audience: z.enum(["students", "faculty", "both"]),
  departmentId: z.string().uuid().optional().nullable(),
});

const updateEventSchema = eventSchema.extend({ id: z.string().uuid() });

/** HOD identity: the session id is a faculty row; resolve its department. */
async function hodDepartmentId(session: SessionUser): Promise<string | null> {
  const [me] = await db
    .select({ departmentId: faculty.departmentId })
    .from(faculty)
    .where(eq(faculty.id, session.id))
    .limit(1);
  return me?.departmentId ?? null;
}

/**
 * HOD ownership: events they created, or hod-created events scoped to their own
 * department. Admin-created events and other departments are never manageable.
 */
function hodOwnsEvent(
  event: {
    departmentId: string | null;
    createdByRole: string;
    createdByFacultyId: string | null;
  },
  ownDept: string,
  sessionId: string
): boolean {
  return (
    event.createdByFacultyId === sessionId ||
    (event.departmentId === ownDept && event.createdByRole === "hod")
  );
}

function revalidateEventPaths() {
  revalidatePath("/admin/events");
  revalidatePath("/faculty/events");
  revalidatePath("/student/events");
}

export async function createEvent(input: unknown): Promise<EventActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "admin" && session.role !== "hod") {
    return { success: false, error: "Not authorized." };
  }

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid event payload." };
  const data = parsed.data;

  let departmentId: string | null;
  let createdByRole: "admin" | "hod";
  let createdByFacultyId: string | null;

  if (session.role === "hod") {
    if (data.departmentId == null) {
      return {
        success: false,
        error: "Institution-wide events can only be created by an admin.",
      };
    }
    const ownDept = await hodDepartmentId(session);
    if (!ownDept) {
      return { success: false, error: "You are not assigned to a department." };
    }
    departmentId = ownDept;
    createdByRole = "hod";
    createdByFacultyId = session.id;
  } else {
    departmentId = data.departmentId ?? null;
    createdByRole = "admin";
    createdByFacultyId = null;
  }

  try {
    await db.insert(events).values({
      departmentId,
      audience: data.audience,
      title: data.title,
      description: data.description ?? null,
      venue: data.venue ?? null,
      eventDate: data.eventDate,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      createdByRole,
      createdByFacultyId,
    });
    revalidateEventPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to create event:", error);
    return { success: false, error: "Failed to create event." };
  }
}

export async function updateEvent(input: unknown): Promise<EventActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "admin" && session.role !== "hod") {
    return { success: false, error: "Not authorized." };
  }

  const parsed = updateEventSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid event payload." };
  const data = parsed.data;

  const [existing] = await db
    .select({
      id: events.id,
      departmentId: events.departmentId,
      createdByRole: events.createdByRole,
      createdByFacultyId: events.createdByFacultyId,
    })
    .from(events)
    .where(eq(events.id, data.id))
    .limit(1);
  if (!existing) return { success: false, error: "Event not found." };

  let departmentId: string | null;
  if (session.role === "admin") {
    departmentId = data.departmentId ?? null;
  } else {
    const ownDept = await hodDepartmentId(session);
    if (!ownDept) {
      return { success: false, error: "You are not assigned to a department." };
    }
    if (!hodOwnsEvent(existing, ownDept, session.id)) {
      return {
        success: false,
        error: "You can only manage events in your own department.",
      };
    }
    if (data.departmentId !== undefined) {
      if (data.departmentId === null) {
        return {
          success: false,
          error: "Institution-wide events can only be created by an admin.",
        };
      }
      if (data.departmentId !== ownDept) {
        return {
          success: false,
          error: "You can only manage events in your own department.",
        };
      }
      departmentId = ownDept;
    } else {
      departmentId = existing.departmentId;
    }
  }

  try {
    await db
      .update(events)
      .set({
        departmentId,
        audience: data.audience,
        title: data.title,
        description: data.description ?? null,
        venue: data.venue ?? null,
        eventDate: data.eventDate,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
      })
      .where(eq(events.id, data.id));
    revalidateEventPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to update event:", error);
    return { success: false, error: "Failed to update event." };
  }
}

export async function deleteEvent(eventId: string): Promise<EventActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "admin" && session.role !== "hod") {
    return { success: false, error: "Not authorized." };
  }
  if (!z.string().uuid().safeParse(eventId).success) {
    return { success: false, error: "Invalid event id." };
  }

  const [existing] = await db
    .select({
      id: events.id,
      departmentId: events.departmentId,
      createdByRole: events.createdByRole,
      createdByFacultyId: events.createdByFacultyId,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!existing) return { success: false, error: "Event not found." };

  if (session.role === "hod") {
    const ownDept = await hodDepartmentId(session);
    if (!ownDept) {
      return { success: false, error: "You are not assigned to a department." };
    }
    if (!hodOwnsEvent(existing, ownDept, session.id)) {
      return {
        success: false,
        error: "You can only manage events in your own department.",
      };
    }
  }

  try {
    await db.delete(events).where(eq(events.id, eventId));
    revalidateEventPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete event:", error);
    return { success: false, error: "Failed to delete event." };
  }
}

/* ---------------- Event budget planner (staff-only wrapper) ---------------- */

const planEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  attendees: z.number().int().min(10).max(5000),
  budget: z.number().int().min(1000).max(10_000_000),
});

export type PlanEventResult =
  | { ok: true; eventType: string; plans: EventPlan[] }
  | { ok: false; error: string };

/** Staff-only wrapper around the pure planner (admin/hod/faculty). */
export async function planEvent(input: unknown): Promise<PlanEventResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (session.role !== "admin" && session.role !== "hod" && session.role !== "faculty") {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = planEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event planner payload." };

  try {
    const result = planEventLocally({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      attendees: parsed.data.attendees,
      budget: parsed.data.budget,
    });
    return { ok: true, eventType: result.eventType, plans: result.plans };
  } catch (error) {
    console.error("Failed to plan event:", error);
    return { ok: false, error: "Failed to plan event." };
  }
}
