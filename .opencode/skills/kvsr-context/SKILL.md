---
name: kvsr-context
description: Persistent architectural and security context for the KVSR College Management System. Load this whenever working on KVSR code, especially anything touching roles, authorization, attendance, marks, student evaluation, timetables, or student data isolation. Covers the three user roles, RBAC rules, faculty assignment chains, and the backend-only authorization rule (frontend visibility is not security).
---

# KVSR College Management System — Context

Next.js 14 (App Router) + TypeScript + Drizzle ORM (Postgres, @neondatabase) + Tailwind CSS + shadcn/Base UI + zod. This file holds the persistent rules for changing the app. Read `lib/db/schema.ts` and `lib/auth/session.ts` for the authoritative source before editing data or authorization logic.

## User Roles

Roles are stored on the signed session cookie (`SessionUser.role`): `"admin" | "faculty" | "student"`. HOD/Admin maps to the `admin` role; faculty may also be flagged `is_hod` in the `faculty` table. Auth uses an HMAC-signed cookie (`kvsr_session`) via `lib/auth/session.ts` and route gating in `middleware.ts`.

- **HOD/Admin** (`admin`): students, faculty, sections, attendance analytics, performance analytics, administrative management, filtering, students needing attention, best/lowest performers.
- **Faculty** (`faculty`): dashboard, my timetable, my classes, attendance, my students, assignments, notifications, student evaluation, profile. No unrestricted global student/section management.
- **Student** (`student`): dashboard, my attendance, my timetable, syllabus, assignments, examinations, marks, notifications, profile. Must not see admin functionality.

Give each role a dedicated experience. Do not reuse an admin dashboard for students and merely hide buttons.

## Authorization: Backend-Only Rule (CRITICAL)

Frontend visibility is NOT authorization. Hiding a button is not security. For every sensitive action, validate in the backend/API/action layer, never only in the UI:

1. Authentication (session present).
2. User role (authorized role for the action).
3. Resource ownership / assignment (the target belongs to or is assigned to this user).

Never trust frontend-supplied IDs, query params, request bodies, or URL parameters. Treat all of them as attacker-controlled input.

### Student isolation

A student may only access their own attendance, marks, assignments, academic info, notifications, timetable, and profile. A student must never read another student's private data by modifying URL/query params, request bodies, frontend state, or API requests. Ownership must be enforced server-side.

### Faculty assignment chain

Faculty authorization conceptually follows the chain:

Faculty → Assigned Subject → Assigned Section → Authorized Students

A faculty member must only access their timetable, subjects, sections, classes, and the students in the classes they are assigned to teach. They must not access unrelated sections/classes by changing URLs or API requests.

## Domain Concepts (from lib/db/schema.ts)

- Academic structure: `departments`, `programs`, `academicYears`, `studyYears`, `sections` (belongs to a `studyYear`; has optional `classTeacherId`).
- People: `faculty`, `students`.
- Enrollment: `studentEnrollments` (student → section → academicYear, with roll number snapshot). A student's section derives their timetable.
- Subjects: `subjects`, `labGroups` (section + subject + faculty + academicYear).
- Timetable: `timetableSlots` (section + academicYear + dayOfWeek + period + subject + faculty, optionally lab).
- Attendance: `attendanceSessions` (date + timetableSlot + faculty + subject + section) and `attendanceRecords` (session + student + status). Summary in `studentAttendanceSummaries` (per student + subject: classesHeld/classesAttended).
- Periods: `periods`.

### Attendance rules

- Faculty attendance flow: Faculty → My Classes → Assigned Class → Mark Attendance → Students of that class/section. Before creating or modifying attendance, verify authenticated faculty + assignment + subject + section/class. Unauthorized access denied. Do not trust frontend IDs.
- Students view their own attendance only; they cannot modify it. Show overall %, subject-wise %, present/absent counts, and a clear status.

### Timetable rules

- Faculty see only their assigned timetable.
- Student timetable is derived automatically from the student's assigned section; students cannot browse unrelated sections.

### Marks rules

- Students view only their own marks; backend validates ownership.

### Student evaluation (if present)

- Faculty evaluate only students they are authorized to teach.
- Scale 1–5: 1=Very Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent. Optional comments.
- Prevent uncontrolled duplicate evaluations.
- HOD performance analytics aggregate multiple evaluations; one faculty rating must not define a student's whole performance when several exist. Categories include overall/academic performance, behaviour, participation, attendance; buckets like Best/Lowest Performing, Needs Attention, Low Attendance.

## UI/UX Standards

A modern, professional college-management SaaS look. Prioritize contrast, visual hierarchy, clear selected states, accessible interactions, consistent spacing, better typography, responsive layouts, and useful empty/loading/error states. Attendance controls must have obvious visual states. Do not rely on color alone for important information. Avoid random gradients, excessive glassmorphism, meaningless dashboard cards, generic AI-looking layouts, low-contrast interactive elements, and decoration without purpose. Relevant installed skills: `designing-frontend-interfaces`, `designing-user-experience`, `building-accessible-interfaces`, `reviewing-interface-quality`.

## Development Principles

- Inspect relevant files before editing; reuse existing patterns (`lib/actions/*`, `lib/db/queries.ts`, `components/*`).
- Keep changes focused. Use reusable permission helpers; centralize authorization logic where reasonable.
- Validate important inputs. Handle loading, empty, error, and unauthorized states.
- Preserve working functionality. Do not rewrite working systems unnecessarily.
- Do not remove tests or disable checks to report success; do not claim completion without verification.
- Relevant installed skills: `evolving-apis-and-schemas` (schema/API changes), `reviewing-security` (security review), `systematic-debugging`, `test-driven-development`, `verifying-before-completion`, `writing-plans`, `executing-plans`.

## Verification Commands

- Lint: `npm run lint`
- Build: `npm run build`
- DB: `npm run db:generate`, `npm run db:migrate`, `npm run db:push`
- There is currently no test framework configured; do not claim test pass without a runnable command.
