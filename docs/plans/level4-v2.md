# Level 4 Upgrade — Implementation Spec (v2)

Repo: `KVSR-Mangement` (Next.js 14 App Router, TS, Drizzle ORM 0.45 / neon-http Postgres, Tailwind, zod 4, `@vladmandic/face-api` 1.7 client-side).
Spec status: PLAN ONLY — nothing here is implemented yet. Every pattern below is grounded in a cited file:line from the current codebase.

---

## Context

The KVSR College Management System currently has four session roles — `admin | hod | faculty | student` (`lib/auth/session.ts:15`). HOD is not a separate account table: a faculty row with `is_hod = true` logs in and receives session role `"hod"` (`lib/actions/auth.ts:74-81`). Middleware enforces role→prefix (`/admin` admin-only, `/faculty` for hod+faculty, `/student` student-only — `middleware.ts:18-23, 91-95`), which means **HOD-only surfaces can never be protected by URL prefix alone** (hod and faculty share `/faculty`); every HOD-tier action must re-check role server-side.

This upgrade adds nine modules:

1. Photo-upload attendance (primary face mode; manual + live camera kept)
2. Events section (admin/HOD CRUD, all-role views)
3. Organized class assignment (HOD enrollment management + student creation)
4. Student contact info with a one-time lock
5. Hierarchy audit/tightening (ADMIN > HOD > faculty > student)
6. Self check-in (third attendance mode)
7. Admin "Setup" area (faculty/students/sections/subjects/slots/academic years)
8. Config-driven foundation (`app_settings` + `lib/app-config.ts`)
9. Navigation-first UI overhaul (single nav source of truth per role)

### Ground rules inherited from `kvsr-context` (non-negotiable)

- **Backend-only authorization.** Every new server action validates: session → role → resource ownership/assignment. Frontend visibility is never security.
- **Student isolation.** Students read/write only their own rows. `selfCheckIn` derives the student from `session.id`, never from the payload.
- **Faculty assignment chain.** Faculty → assigned subject → assigned section → authorized students. Reuse `isFacultyAssigned` (`lib/auth/guards.ts:125-147`) and `isSectionInHodDepartment` (`lib/auth/guards.ts:153-173`).
- **Privacy.** Face data is 128-d numeric descriptors only, never images (`lib/db/schema.ts:297-323` comment; `getSectionBiometrics` returns vectors only — `lib/actions/biometrics.ts:121-158`). Photo-upload attendance processes images **in browser memory only** and uploads nothing.
- **No transactions.** The neon-http driver does not support `db.transaction()` (`lib/actions/attendance.ts:119-121`). Multi-step writes rely on sequential queries + unique indexes for safety.
- **IST clock.** "Today" is always `getCollegeNow()` (`lib/utils.ts:14-38`), never raw server UTC.

### Non-goals (explicit)

- No RSVP/comments for events (v1 is read-only for students/faculty).
- No retro-fit of every existing page to the new `PageHeader` (new pages use it; old pages migrate opportunistically).
- No password hashing migration, no API routes, no test framework introduction.
- No photo/image storage anywhere (including temp files or logs).
- No changes to the plaintext-password login model (pre-existing decision, `lib/actions/auth.ts:38, 70`).
- No rewrite of working manual/camera attendance; photo mode is additive.

### Verified environment facts the spec relies on

- `drizzle-orm@0.45.2` exports `doublePrecision` (verified in `node_modules/drizzle-orm/pg-core`) — used for threshold columns.
- Migrations live in `drizzle/` (0000–0002 exist); `drizzle.config.ts` points at `./lib/db/schema.ts`, out `./drizzle`. Scripts: `db:generate`, `db:migrate`, `db:push` (`package.json:10-12`).
- Models for face-api are in `public/models` (tiny_face_detector, face_landmark_68, face_recognition — verified files exist); loading pattern at `components/face-camera.tsx:53-75`.
- `rawSql` tagged template is exported for complex SQL (`lib/db/index.ts:17-18`); bigint counts come back as strings and must be coerced (`lib/db/portal-queries.ts:257-259`).
- No `lib/app-config.ts` exists yet; the only settings precedent is the single-row `campusSettings` table (`lib/db/schema.ts:34-41`) with an admin upsert action (`lib/actions/campus-settings.ts:22-58`).

---

## Spec

### §1 Photo-upload attendance (primary face mode)

**Goal.** Faculty uploads 3–6 photos of the class; every face is detected and matched **locally in the browser**; only 128-d descriptors ever leave the device (and even those only as already-stored biometrics via the existing actions). Adds multi-descriptor averaging per student per session, a confusion-resolution UI, an unassigned tray, and a "get smarter over time" reinforcement loop.

#### §1.1 New client module `lib/face-client.ts`

A deep module: one small interface hiding model loading, detection, and math. Client-only consumers (never imported by server code).

```ts
// Interface (everything a caller must know)
let faceapiPromise: Promise<typeof FaceApi> | null = null;
export async function loadFaceApi(): Promise<typeof FaceApi>;
// Loads once per page load from "/models" — same three nets as
// components/face-camera.tsx:61-65 (tinyFaceDetector, faceLandmark68Net,
// faceRecognitionNet).

export async function detectDescriptors(
  source: ImageBitmap | HTMLVideoElement
): Promise<number[][]>;
// detectAllFaces(...).withFaceLandmarks().withFaceDescriptors() with
// TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }) —
// identical options to components/face-camera.tsx:122-125.

export function euclideanDistance(a: number[], b: number[]): number;
// Same math as components/attendance-camera.tsx:19-26 and
// lib/actions/identify.ts:12-19 (single shared implementation going forward).

export function averageDescriptors(list: number[][]): number[];
// Component-wise mean — same reduction as captureEnrollment
// (components/face-camera.tsx:174-177). Returns [] for empty input.
```

#### §1.2 New component `components/attendance-photo-upload.tsx`

Props (all supplied by the server page — config values are **never** imported into client code):

```ts
{
  students: { id: string; fullName: string; rollNumber: string }[]; // roster
  sectionId: string;
  timetableSlotId: string;
  sessionDate: string;
  slotLabel: string;
  matchThreshold: number;   // from app config (default 0.5)
  confusionBand: number;    // from app config (default 0.15)
  photoMin: number;         // 3
  photoMax: number;         // 6
}
```

Flow:

1. **Pick photos.** `<input type="file" multiple accept="image/*">`; validate `photoMin..photoMax` count client-side. Files are read via `createImageBitmap(file)` and immediately usable; **no `FormData`, no fetch of image bytes anywhere**.
2. **Detect.** For each bitmap, `detectDescriptors(bitmap)`; pool all descriptors across photos.
3. **Fetch enrolled descriptors once** via the existing `getSectionBiometrics(sectionId)` (`lib/actions/biometrics.ts:126-158`) — already staff-authorized and section-enrollment-scoped.
4. **Classify each detected descriptor** against the enrolled set:
   - `best < matchThreshold && (second - best) >= confusionBand` → **confident match** for `best.studentId`.
   - `best < matchThreshold && (second - best) < confusionBand` → **confused**; candidates = every enrolled student whose distance ≤ `best + confusionBand`, sorted by distance.
   - `best >= matchThreshold` → **unassigned** (goes to the unassigned tray).
5. **Per-student averaging.** All descriptors confidently matched (or confirmed via the dialog) to a student are averaged with `averageDescriptors` → one descriptor per student per session. This is the accuracy improvement: one noisy frame cannot decide a match.
6. **Confusion UI** — new `components/match-resolution-dialog.tsx`, built on the existing `Modal` (`components/modal.tsx:16-89`, bottom-sheet on phones):
   - AI best-guess student rendered **first and large** (avatar initials + roll number, pattern from `components/biometric-enroll.tsx:62-75`).
   - Other candidates below as selectable rows (with distance shown as a plain-language "closeness" bar, not a raw float).
   - Actions per face: pick an alternate candidate · **"Not present"** (face ignored, nobody marked) · **"Unknown → assign manually from roster"** (opens roster picker; the face then counts as that student, present).
7. **Unassigned tray.** Faces with no confident match are listed in an amber tray (visual language of the existing unknown warning, `components/attendance-camera.tsx:190-195`); each row offers assign-from-roster / not-present. Faculty cannot submit while the tray has unresolved faces unless they explicitly choose "leave unresolved" (those faces mark nobody).
8. **Roster grid + submit.** Identical interaction to live camera mode: tap to include/exclude, auto-matched students pre-selected (`components/attendance-camera.tsx:202-232`), then submit the **full roster** via the existing `saveAttendance` (`lib/actions/attendance.ts:36-184`) with `records` for every student (present/absent) and `getDeviceLocation()` (`lib/geolocation.ts:6-15`) for the geofence. No new attendance-write path is created.
9. **"Teach confirmed matches"** checkbox (default ON, wording: "Improve future recognition using today's confirmed matches"). On successful submit, for each student with a confirmed averaged descriptor, call the new `reinforceBiometric` (§1.3) sequentially.

#### §1.3 New server action `reinforceBiometric` (in `lib/actions/biometrics.ts`)

The "get smarter over time" loop: merges a confirmed-match descriptor into the student's stored descriptor as a capped running average.

```ts
const reinforceSchema = z.object({
  studentId: z.string().uuid(),
  descriptor: descriptorSchema,          // reuse biometrics.ts:15-21 (128-d, finite, bounded)
  consent: z.literal(true).optional(),   // REQUIRED only when the student has no biometric row yet
});
// → { success: true } | { success: false; error: string }
```

- **Guard (mirror `enrollBiometric`, `lib/actions/biometrics.ts:51-91`):** staff only. `faculty` → resolve the student's active enrollment for the current year, then `isFacultyAssigned(session.id, sectionId)`; `hod` → `isSectionInHodDepartment(session.id, sectionId)`; `admin` → allowed.
- **Merge rule:** if no row exists → insert (requires `consent: true`, same defaults as `enrollBiometric` — `consentedAt`, `consentVersion "1.0"`, `enrolledBy`). If a row exists → capped running average:

```ts
const REINFORCE_CAP = 20; // module constant; keeps recent faces influential
// n = min(existing.descriptorCount + 1, REINFORCE_CAP)
// avg[i] = existing[i] + (incoming[i] - existing[i]) / n
// store avg, descriptorCount = n, lastMatchedAt = now, updatedAt = now
```

- **Why capped:** an uncapped running average asymptotically freezes the descriptor; the cap lets the stored face keep adapting to appearance changes (hair, glasses, lighting) while staying resistant to single-frame poisoning.
- **Security note:** the server cannot verify that the descriptor came from a "confirmed" match — the control is the authorization chain (only staff assigned to that student's section can call it) plus the averaging dilution. Log `console.error` on failures; do not log descriptor values.
- `revalidatePath("/faculty/students")`.

#### §1.4 Wiring

- `components/attendance-marking.tsx:40-69` gains a third mode button **"Upload Photos"** (default mode becomes `photo`; manual and camera remain selectable). Renders `AttendancePhotoUpload` alongside `AttendanceGrid` / `AttendanceCamera`.
- `app/(portal)/faculty/attendance/page.tsx` already loads the roster (`getStudentsBySection`, `lib/db/queries.ts:152-173`) and passes props into `AttendanceMarking` (lines 110-128); it additionally passes `matchThreshold`, `confusionBand`, `photoMin`, `photoMax` read from `getAppConfig()` (§8).

**Acceptance (§1):** uploading 3–6 photos marks the roster with zero image bytes leaving the browser; confused faces always surface the resolution dialog; unmatched faces land in the tray; submit reuses `saveAttendance` (merge semantics preserved); repeated use measurably lowers distances for frequently seen students (descriptorCount > 1 visible in DB).


---

### §2 Events

**Goal.** A lean events module: admin/HOD create and manage; every role can view. Audience = students / faculty / both; optional department scope.

#### §2.1 Schema — `events` table

```ts
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // null departmentId = institution-wide; otherwise department-scoped
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "cascade",
    }),
    // "students" | "faculty" | "both" — mirrors the HOD notification audience
    // enum at lib/actions/admin.ts:295
    audience: text("audience").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    venue: text("venue"),
    eventDate: date("event_date").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    createdByRole: text("created_by_role").notNull(), // "admin" | "hod"
    createdByFacultyId: uuid("created_by_faculty_id").references(() => faculty.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    eventsDateIdx: index("events_date_idx").on(table.eventDate),
  })
);
```

Notes: `text` + zod enum for `audience` matches how `notifications.targetRole` and exam types are modeled (`lib/actions/teaching.ts:19`); `index` must be added to the `drizzle-orm/pg-core` import in `schema.ts:1-13` (currently imports only `uniqueIndex`). No unique constraint (duplicate events are allowed and harmless).

#### §2.2 Server actions — new file `lib/actions/events.ts`

All follow the `{ success: true } | { success: false; error: string }` result convention (`lib/actions/teaching.ts:17`).

```ts
const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // date pattern from teaching.ts:203
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  audience: z.enum(["students", "faculty", "both"]),
  departmentId: z.string().uuid().optional().nullable(),
});

createEvent(input)      // guard: requireHod() (hod or admin)
updateEvent(input)      // schema = eventSchema.extend({ id: z.string().uuid() })
deleteEvent(eventId)    // uuid-validated like removeFacultyAssignment (admin.ts:98-115)
```

**Ownership rules (server-side):**

- `admin`: any event.
- `hod`: may create/update/delete only events with `departmentId === own department` (resolve via the `faculty.departmentId` lookup pattern, `lib/actions/admin.ts:312-319`) **or** `departmentId === null` **only if** they created it (`createdByFacultyId === session.id`). HOD cannot edit or delete another department's or admin's institution-wide events.
- Every mutation revalidates `/admin/events`, `/faculty/events`, `/student/events`.

#### §2.3 Queries — new file `lib/db/event-queries.ts`

```ts
getEventsForRole(role, { departmentId | studentSectionDeptId })
// admin: all events.
// hod/faculty: events where departmentId IS NULL OR departmentId = own dept.
// student: events where audience IN ('students','both') AND
//          (departmentId IS NULL OR departmentId = dept of student's active
//           enrollment) — the dept-derivation subquery pattern is already
//           written at lib/db/portal-queries.ts:384-391 (student notifications).
// Ordered by eventDate DESC, startTime NULLS LAST. rawSql tagged template.
getEventById(id)  // admin/HOD edit view; hod ownership re-checked in the page
```

#### §2.4 Pages

| Route | Guard | Content |
|---|---|---|
| `app/(portal)/admin/events/page.tsx` | `requireAdmin()` | Manage list + create/edit form (client component `components/event-manager.tsx`) |
| `app/(portal)/faculty/events/page.tsx` | `requireFaculty()` | HOD: manage own-dept events (reuse `event-manager` scoped); faculty: read-only list |
| `app/(portal)/student/events/page.tsx` | `requireStudent()` | Read-only upcoming/past list, filtered by audience + dept |

All pages use the new `PageHeader` (§9) and `EmptyState` (`components/empty-state.tsx`) for zero-event states.

**Acceptance (§2):** HOD cannot create an institution-wide event for another department, cannot edit admin events; student sees only audience-appropriate events; faculty of dept X do not see dept Y events.

---

### §3 Organized class assignment (HOD)

**Goal.** HOD (and admin) manage student→section enrollment in one organized screen: pick department → program → study year → section, see enrolled roster + unenrolled department students, search, multi-select enroll, move between sections, unenroll — and create new students.

#### §3.1 Server actions — new file `lib/actions/enrollment.ts`

Guard helper (defined once in this file):

```ts
async function requireHodActor(): Promise<
  { ok: true; session: SessionUser; departmentId: string | null /* admin */ }
  | { ok: false; error: string }
>
// admin → ok with departmentId = null (unrestricted)
// hod   → ok with own faculty.departmentId (error if null department)
// faculty/student → error. This is the requireHodOnly tier (§5).
```

All actions validate inputs with zod, then enforce scope:

```ts
const enrollSchema = z.object({
  sectionId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(200),
});
enrollStudents(input)
// 1. requireHodActor
// 2. Resolve section → studyYear → program → department. HOD: department must
//    match own (reuse the join chain from isSectionInHodDepartment,
//    guards.ts:164-170). Admin: any.
// 3. yearId = getCurrentAcademicYearId() (guards.ts:84-91)
// 4. Verify every studentId is active AND (for HOD) belongs to the HOD's
//    department — students have no department column; department membership is
//    derived from their CURRENT active enrollment (same derivation the
//    notifications query uses, portal-queries.ts:384-391). A student with no
//    current enrollment is enrollable by HOD only if... → open question Q3.
// 5. Insert studentEnrollments rows with rollNumberSnapshot = students.rollNumber,
//    academicYearId = yearId, isActive = true, onConflictDoNothing
//    (unique_enrollment index, schema.ts:172-178, makes this safe without a
//    transaction).
// 6. revalidatePath("/faculty/enrollment") + "/admin/students"

const moveSchema = z.object({
  studentId: z.string().uuid(),
  fromSectionId: z.string().uuid(),
  toSectionId: z.string().uuid(),
});
moveStudent(input)
// Same section-ownership checks for BOTH sections. Sequential (no txn):
// a. deactivate the (student, fromSection, year) enrollment row
//    (update isActive = false where the unique triple matches)
// b. upsert the (student, toSection, year) row to isActive = true with
//    onConflictDoUpdate — reuses the unique index instead of delete+insert so
//    history is preserved and the operation is idempotent on retry.

const unenrollSchema = z.object({
  sectionId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1),
});
unenrollStudents(input)
// Sets isActive = false on matching active rows (same ownership checks).
// Does NOT delete rows (enrollment history feeds attendance analytics).

const createStudentSchema = z.object({
  fullName: z.string().min(1).max(120),
  rollNumber: z.string().min(1).max(40),
});
createStudent(input)
// requireHodActor. HOD: allowed (requirement 3 explicitly grants student
// creation to HOD). rollNumber uniqueness enforced by schema.ts:146 unique
// constraint → catch and return "Roll number already exists."
// No email/phone at creation (students set contact themselves, §4).
// revalidatePath("/faculty/enrollment") + "/admin/students"
```

#### §3.2 Query — `lib/db/enrollment-queries.ts`

```ts
getEnrollmentWorkspace(departmentId | null, sectionId)
// Returns { enrolled: Student[], unenrolled: Student[] } for the section's
// study year + current academic year:
//  - enrolled: active enrollments in the section (pattern = getStudentsBySection,
//    lib/db/queries.ts:152-173)
//  - unenrolled: active students in the department NOT actively enrolled in any
//    section of the current year (HOD: department-scoped via the
//    departments→programs→studyYears→sections join, portal-queries.ts:119-143;
//    admin: all students)
// Plus the picker tree: departments → programs → studyYears → sections
// (getDepartmentsWithPrograms exists at lib/db/queries.ts:305-319; extend with
// studyYears/sections or write a dedicated rawSql).
```

#### §3.3 Pages / components

- `app/(portal)/faculty/enrollment/page.tsx` — guard `requireHod()` (hod + admin land here; faculty is redirected by the guard). HOD sees only own-department pickers (server filters the tree before render).
- `components/enrollment-manager.tsx` — the organized UI: cascading selects, search box (client-side filter over the fetched lists, pattern from `getFacultyList` search, `lib/db/queries.ts:268-275`), two panels (Enrolled / Unenrolled) with checkbox multi-select, action bar: Enroll · Move (asks target section) · Unenroll. "New student" button opens the `Modal` (`components/modal.tsx`) with fullName + rollNumber.
- Admin gets the same screen at `app/(portal)/admin/enrollment/page.tsx` (guard `requireAdmin()`, unrestricted pickers) — nav entry under Setup (§7).

**Acceptance (§3):** HOD of dept A cannot enroll into dept B's section, cannot see dept B students; move preserves a single active enrollment per student/year; unenroll never deletes history; created student can immediately log in with roll number as password (existing login rule, `lib/actions/auth.ts:95-98`).

---

### §4 Student contact info — one-time lock

**Goal.** Students set phone + confirm email exactly once; confirming locks contact permanently from the student side; only HOD (of the student's department) or admin can change it afterward.

#### §4.1 Schema change — `students` table

```ts
// lib/db/schema.ts — add to students (schema.ts:144-153):
contactLockedAt: timestamp("contact_locked_at", { withTimezone: true }),
```

Nullable; null = unlocked. No index needed (lookup is always by student PK).

#### §4.2 Server actions — new file `lib/actions/student-contact.ts`

```ts
const setContactSchema = z.object({
  phone: z.string().regex(/^[0-9+\-\s]{6,15}$/),
  email: z.string().email().max(200),
});
setMyContact(input)
// Guard: requireStudent-equivalent inline (session.role === "student",
// session.id is the student — payload carries NO studentId; ownership is the
// session). Reject if students.contactLockedAt is already set for session.id
// ("Contact info is locked. Contact your HOD to change it.").
// Update students.phone + students.email + contactLockedAt = now() in ONE
// update (the lock and the write are atomic — no window where contact is set
// but unlocked). revalidatePath("/student/profile").

const hodUpdateContactSchema = z.object({
  studentId: z.string().uuid(),
  phone: z.string().regex(/^[0-9+\-\s]{6,15}$/).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
});
hodUpdateStudentContact(input)
// Guard: requireHod(). admin → any student. hod → resolve the student's
// department via their active enrollment (portal-queries.ts:384-391 pattern);
// must equal the HOD's own department, else error "This student is outside
// your department." Writes phone/email; does NOT touch contactLockedAt
// (already locked stays locked; if somehow unlocked it stays unlocked).
// revalidatePath("/student/profile") + "/faculty/enrollment"
```

#### §4.3 UI

- `app/(portal)/student/profile/page.tsx` — extend the existing profile card (lines 36-77). New client component `components/student-contact-editor.tsx`:
  - If `contactLockedAt` is null and phone/email are unset → editable inputs + "Confirm & lock" button.
  - On confirm press → warning modal (reuse `Modal`): "This locks your contact info permanently. Only your HOD can change it later." with Cancel / "I understand — lock it".
  - After lock (or if already locked) → read-only display + the notice "Locked · contact your HOD to change".
  - If phone/email are set but `contactLockedAt` is null (legacy rows) → show read-only values with an "Edit & lock" affordance that opens the same flow.
- HOD side: a contact-edit affordance inside `components/enrollment-manager.tsx` roster rows (or the student row menu) calling `hodUpdateStudentContact`. Admin side: same component on `/admin/enrollment`.

**Acceptance (§4):** second `setMyContact` call for a locked student fails server-side even with a forged payload; HOD of another department cannot change the contact; the lock timestamp is set in the same statement as the first write.


---

### §5 Hierarchy audit & tightening (ADMIN > HOD > faculty > student)

**Goal.** Every action enforces the tier ladder. The audit result, per file:

#### §5.1 New guard `requireHodOnly` in `lib/auth/guards.ts`

```ts
/** HOD-exclusive tier: hod or admin, never plain faculty. */
export async function requireHodOnly(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "hod" && session.role !== "admin") {
    redirect(homeForRole(session.role));
  }
  return session;
}
```

Note: the existing `requireHod` (guards.ts:53-59) already implements exactly this logic — it is hod-or-admin. Rather than two names for one rule, **rename usage sites to `requireHodOnly`** and keep `requireHod` as a deprecated alias for one release, OR simply standardize on `requireHod` and document it as the HOD-only tier. (Decision left to implementers; the semantic contract is: hod-or-admin, faculty rejected.) New HOD-exclusive surfaces (contact changes, enrollment management, event management) use this tier.

#### §5.2 Audit findings & fixes

| Location | Current behavior | Issue | Fix |
|---|---|---|---|
| `lib/actions/teaching.ts:42` `assertAccess` | hod bypasses all assignment checks for assignments/marks/exams | HOD may write marks/assignments for ANY section app-wide, not just own department | Route hod through `isSectionInHodDepartment(session.id, sectionId)` before allowing the write; admin stays unrestricted |
| `lib/actions/teaching.ts:269-287` syllabus | hod must teach the subject (assignment check) — actually stricter than needed | None (acceptable; keep) | No change |
| `lib/actions/biometrics.ts:33-49` `authorizeSectionAccess` | hod → own department; faculty → assignment | Correct | No change |
| `lib/actions/attendance.ts:76-87` | staff (faculty/hod) must be assigned to slot's section+subject; hod is NOT dept-scoped here | HOD can mark attendance for any section they happen to hold an assignment in — but assignments are admin-granted, so this is acceptable | No change (documented) |
| `lib/actions/evaluations.ts:35-57` | faculty → assignment; hod → department | Correct | No change |
| `lib/actions/admin.ts:35` `createNotification` | admin-only | Correct | No change |
| `lib/actions/campus-settings.ts:25` | admin-only | Correct | No change |
| `middleware.ts:91-95` | prefix enforcement | hod and faculty share `/faculty` — HOD-only pages (enrollment, event manage) are NOT prefix-protected | Every HOD-only page calls `requireHodOnly()` server-side; every HOD-only action re-checks role. Never rely on the prefix. |
| `app/(portal)/faculty/faculty-attendance/page.tsx` | `requireFaculty()` | HOD sees department report, faculty sees own — role handled inside the query (`lib/actions/faculty-attendance.ts:76-88`) | No change |
| New §3/§4 actions | — | — | Use `requireHodOnly` tier + department scope checks as specced |

**Rule going forward (write into `kvsr-context` later):** faculty may never invoke a HOD-tier action; every HOD-tier action re-verifies `session.role` server-side; every HOD-scoped resource re-verifies department ownership server-side.

**Acceptance (§5):** a plain-faculty session calling `hodUpdateStudentContact`, `enrollStudents`, `moveStudent`, `unenrollStudents`, `createStudent`, `createEvent`, `updateEvent`, `deleteEvent` receives `{ success: false }` — verified by attempting each call with a faculty session.

---

### §6 Self check-in (third attendance mode)

**Goal.** Faculty opens a self check-in window for a slot's session; students of that section see a countdown card and scan their own face locally; the server verifies enrollment + window + face-identity before upserting a present record.

#### §6.1 Schema change — `attendance_sessions`

```ts
// lib/db/schema.ts — add to attendanceSessions (schema.ts:239-270):
selfCheckinOpenedAt: timestamp("self_checkin_opened_at", { withTimezone: true }),
// Window END is derived: openedAt + selfCheckinWindowMinutes (app config,
// default 10). Storing only openedAt means an admin tuning the config value
// applies to already-open windows — acceptable and simpler; see open question
// Q5 if a frozen end time is preferred.
```

No new table. The existing `unique_session_slot_day` index (schema.ts:263-269) already guarantees one session per slot/day, which self check-in shares with faculty-marked sessions.

#### §6.2 Server actions — additions to `lib/actions/attendance.ts`

```ts
const openSelfCheckinSchema = z.object({
  timetableSlotId: z.string().uuid(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
openSelfCheckin(input)
// Guard: identical to saveAttendance's (attendance.ts:36-87) — session must be
// staff; faculty/hod must be assigned to the slot's section+subject (derived
// from the slot row, never client IDs); admin any. Geofence applies if the
// faculty supplies location (attendance.ts:48-56 pattern).
// Effect: find-or-create the session for (slot, date) exactly like
// saveAttendance lines 122-151, then set selfCheckinOpenedAt = now().
// Re-opening refreshes openedAt (window restarts). revalidatePath student +
// faculty attendance/dashboard paths (attendance.ts:175-179 list).

const closeSelfCheckinSchema = z.object({ timetableSlotId: z.string().uuid() });
closeSelfCheckin(input)
// Same guard. Sets selfCheckinOpenedAt = null on today's session for the slot
// (if it exists). Faculty can close early.

const selfCheckInSchema = z.object({
  timetableSlotId: z.string().uuid(),
  descriptor: descriptorSchema, // 128-d — import/reuse from biometrics.ts:15-21
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});
selfCheckIn(input)
// ALL checks server-side, in order:
// 1. session.role === "student" else reject. studentId = session.id (never
//    from payload).
// 2. Load slot row (attendance.ts:59-72 pattern) → sectionId, academicYearId.
// 3. Enrollment: active studentEnrollments row for (session.id, slot.sectionId,
//    slot.academicYearId) — else "You are not enrolled in this class."
// 4. Session exists for (slot, getCollegeNow().date) AND
//    selfCheckinOpenedAt != null AND now < openedAt + windowMinutes (window
//    minutes from getAppConfig(), §8) — else "Self check-in window is closed."
//    Time comparisons use IST now (lib/utils.ts:14-38) converted to a Date.
// 5. Geofence: if location supplied → isOnCampus (lib/actions/campus.ts:51-63);
//    if campus configured and off-campus → reject (same message pattern as
//    attendance.ts:50-55). If no campus configured → pass (isOnCampus already
//    returns onCampus: true).
// 6. Load the student's OWN biometric row (studentBiometrics by studentId,
//    schema.ts:298-323). Missing → "No biometric enrolled; contact your
//    faculty." Compute euclideanDistance(descriptor, stored) — server-side
//    copy of the shared math (§1.1). Distance >= matchThreshold (app config)
//    → "Face did not match. Ask your faculty to mark you present."
// 7. Upsert attendanceRecords (sessionId, studentId, status "present",
//    recordedBy = null, recordedAt = now) with onConflictDoUpdate on the
//    unique pair (schema.ts:288-294) — same merge semantics as
//    saveAttendance (attendance.ts:155-173). If the session row does not
//    exist yet for the slot/date, create it first (status "conducted",
//    facultyId = slot.facultyId, submittedBy = null) — same insert as
//    attendance.ts:137-149.
// 8. revalidatePath("/student/attendance") + "/student/dashboard".
// Return: { success: true } | { success: false; error: string }.
```

**Anti-abuse notes:** the descriptor is the only credential; a stolen descriptor replay is mitigated by (a) the geofence when campus is configured, (b) distance check against the student's own stored descriptor (someone else's descriptor fails), (c) the short window. Liveness is enforced client-side via `captureEnrollment`'s blink/movement check (`components/face-camera.tsx:140-185`) — documented as client-side-only, acceptable for v1.

#### §6.3 Faculty UI

- On `app/(portal)/faculty/attendance/page.tsx`, for the selected slot, show a "Self check-in" control (new client component `components/self-checkin-controls.tsx`): Open window (calls `openSelfCheckin`) / Close (calls `closeSelfCheckin`), with remaining-seconds display computed from `selfCheckinOpenedAt` + config window passed as props.
- The server page passes `selfCheckinOpenedAt` (from `getAttendanceSessionForSlot`, `lib/db/queries.ts:210-226`) and `selfCheckinWindowMinutes` from config.

#### §6.4 Student UI

- Server-side in `app/(portal)/student/dashboard/page.tsx` and `app/(portal)/student/attendance/page.tsx`: after `getStudentContext`, query whether an open window exists for the student's section for today (new query in `lib/db/queries.ts`):

```ts
getOpenSelfCheckinForSection(sectionId, date)
// SELECT s.id, s.self_checkin_opened_at, ts.id AS slot_id, sub.name AS subject,
//        p.start_time, p.end_time
// FROM attendance_sessions s
// JOIN timetable_slots ts ON ts.id = s.timetable_slot_id
// JOIN subjects sub ON sub.id = s.subject_id
// JOIN periods p ON p.id = ts.period_id
// WHERE s.section_id = ${sectionId} AND s.date = ${date}
//   AND s.self_checkin_opened_at IS NOT NULL
// LIMIT 1
```

- If open → render `components/self-checkin-card.tsx`: subject + period + countdown (client timer from `openedAt + windowMinutes`), "Scan my face" button → `FaceCamera` + `captureEnrollment(5)` (liveness enforced, `components/face-camera.tsx:140-185`) → `selfCheckIn({ timetableSlotId, descriptor, location })` → success/error state. Card disappears when the countdown hits zero (client) and on next server render.

**Acceptance (§6):** student of another section cannot check in (enrollment check); check-in after window close fails; check-in with another student's descriptor fails the distance check; a second check-in upserts harmlessly; faculty of the section can open/close; geofence rejects off-campus when campus is configured.

---

### §7 Admin Setup area

**Goal.** Round out admin creation paths — faculty, students, sections, subjects, timetable slots, academic years — organized as a "Setup" section in admin nav with sub-pages, not one mega page.

#### §7.1 New server actions — new file `lib/actions/setup.ts`

All admin-only (`await requireAdmin()` first line, pattern `lib/actions/admin.ts:36`). Result convention `{ success: true } | { success: false; error: string }`.

```ts
createFacultyAccount(input)
// zod: { fullName: min1 max120, username: min3 max40, email: email optional,
//        departmentId: uuid optional, password: min4 max100 }
// Inserts faculty row: canonicalName = fullName.trim().toLowerCase() (unique,
// schema.ts:77), passwordHash = password (plaintext per existing model,
// auth.ts:70), isHod = false, isActive = true.
// Catch unique violations for username/email/canonicalName → specific errors.

createStudentAccount(input)
// zod: { fullName, rollNumber } — same shape as §3 createStudent. To avoid
// duplication, §3's createStudent can live here and be exported for both
// consumers; the HOD wrapper adds the department guard. (Implementation
// detail; the interface stays as specced in §3.)

createSection(input)
// zod: { studyYearId: uuid, name: min1 max20, classTeacherId: uuid optional }
// unique_section index (schema.ts:103-108) → catch duplicates.

createSubject(input)
// zod: { name: min1 max120, code: optional max20, shortName: optional max20,
//        isLab: boolean default false, isElective: boolean default false,
//        departmentId: uuid optional }
// unique_subject_code (schema.ts:135-140) → catch duplicates.

createTimetableSlot(input)
// zod: { sectionId, academicYearId?, dayOfWeek: enum Mon..Sat, periodId,
//        subjectId, facultyId: optional, isLab: boolean, labGroupId: optional }
// academicYearId defaults to current year server-side. unique_slot index
// (schema.ts:228-235) → catch "Slot already exists for that period."
updateTimetableSlot(input)
// zod: { id, ...same fields } — update by id.
deleteTimetableSlot(slotId)   // uuid check; hard delete (cascade clears sessions)

createAcademicYear(input)
// zod: { name: min1 max40, startDate: date, endDate: date, isCurrent: boolean }
// If isCurrent: first clear isCurrent on all rows (sequential update, pattern
// of setHod's two-step write, admin.ts:219-226), then insert.
setCurrentAcademicYear(yearId)  // clear-all then set-one, same pattern
```

#### §7.2 Queries — additions to `lib/db/queries.ts`

```ts
getFacultyAdminList()        // exists as getFacultyList (queries.ts:251-276) — reuse
getStudentsAdminList(search) // simple paged list of students (id, rollNumber, fullName, isActive)
getSectionsFull()            // sections + studyYear label + program + department
                             // (extend getSections, queries.ts:105-116)
getSubjectsList()            // subjects + department name
getAcademicYearsList()       // all years (id, name, dates, isCurrent)
```

#### §7.3 Pages (all `requireAdmin()`, all using `PageHeader` + `EmptyState`)

| Route | Sub-page |
|---|---|
| `app/(portal)/admin/setup/page.tsx` | Setup index: cards linking to each sub-page with counts (pattern: settings page stat cards, `admin/settings/page.tsx:152-188`) |
| `app/(portal)/admin/setup/faculty/page.tsx` | Create faculty form (`components/setup-faculty-form.tsx`) + list |
| `app/(portal)/admin/setup/students/page.tsx` | Create students (reuses §3 manager or a simple form) + list |
| `app/(portal)/admin/setup/sections/page.tsx` | Create section (studyYear picker + name + class teacher) + list |
| `app/(portal)/admin/setup/subjects/page.tsx` | Create subject + list |
| `app/(portal)/admin/setup/timetable/page.tsx` | Slot editor: section picker → weekly grid with per-cell add/edit/delete (`components/setup-slot-editor.tsx`; the read-only grid exists at `components/timetable-grid.tsx`, extend rather than rewrite) |
| `app/(portal)/admin/setup/academic-years/page.tsx` | Year list + create + set-current |

Existing `/admin/departments` and `/admin/settings` remain; the Setup index links to them too.

**Acceptance (§7):** every creation path works and surfaces unique-constraint errors as friendly messages; faculty created here can immediately log in; a slot created here appears in faculty day slots (`getFacultyDaySlots`, portal-queries.ts:51-73) and student timetable.


---

### §8 Config-driven foundation (`app_settings` + `lib/app-config.ts`)

**Goal.** Every tunable value lives in one typed accessor with defaults; admin can edit runtime-editable ones on the settings page. Zero behavior change on day one (defaults = current hardcoded values).

#### §8.1 Storage decision: **single-row typed table** (chosen over key-jsonb)

Justification:

1. **Type safety at the seam.** A single row with typed columns gives one `getAppConfig()` returning a fully-typed object; key-jsonb forces `unknown` casts or per-key zod parsing at every read site, and a typo'd key silently falls back to default with no compile error.
2. **Precedent.** The codebase already uses exactly this pattern for campus geofence (`campusSettings`, schema.ts:34-41, single row, admin upsert in campus-settings.ts:34-51). Two adapters of the same seam would be inconsistent.
3. **Migration simplicity.** Adding a config key = one nullable column with a default; drizzle-kit generates it. key-jsonb would need a seed script per key.
4. **Edit UI is a plain form** (like `CampusSettingsForm`, `components/campus-settings-form.tsx`) instead of a JSON key-value editor.

Trade-off accepted: schema change per new key (fine — keys change rarely, and this is a single-tenant app).

```ts
// lib/db/schema.ts
export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1), // singleton row
  // Attendance
  attendanceGoodPct: integer("attendance_good_pct").notNull().default(75),
  attendanceWarnPct: integer("attendance_warn_pct").notNull().default(60),
  matchThreshold: doublePrecision("match_threshold").notNull().default(0.5),
  confusionBand: doublePrecision("confusion_band").notNull().default(0.15),
  selfCheckinWindowMinutes: integer("self_checkin_window_minutes").notNull().default(10),
  photoMin: integer("photo_min").notNull().default(3),
  photoMax: integer("photo_max").notNull().default(6),
  scanIntervalMs: integer("scan_interval_ms").notNull().default(1500),
  identifyScanIntervalMs: integer("identify_scan_interval_ms").notNull().default(1200),
  // Marks
  marksGoodPct: integer("marks_good_pct").notNull().default(60),
  marksWarnPct: integer("marks_warn_pct").notNull().default(40),
  // Evaluation weights (must sum to 1; validated in the action)
  evalWeightAcademic: doublePrecision("eval_weight_academic").notNull().default(0.5),
  evalWeightBehaviour: doublePrecision("eval_weight_behaviour").notNull().default(0.2),
  evalWeightParticipation: doublePrecision("eval_weight_participation").notNull().default(0.3),
  // Calendar
  teachingDays: jsonb("teaching_days").notNull().default(sql`'["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb`),
  sessionDays: integer("session_days").notNull().default(7),
  // Institution identity
  institutionName: text("institution_name").notNull().default("Dr. K.V. Subba Reddy Institute of Technology"),
  institutionShortName: text("institution_short_name").notNull().default("KVSRIT"),
  institutionPhone: text("institution_phone").notNull().default("+918518200000"),
  institutionEmail: text("institution_email").notNull().default("support@kvsrit.edu.in"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

`sql` must be added to the `drizzle-orm` import in schema.ts (currently only `and/eq/asc/sql` style imports per file; schema.ts imports none from drizzle-orm today — add `import { sql } from "drizzle-orm"`).

#### §8.2 Accessor — `lib/app-config.ts`

```ts
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export interface AppConfig { /* mirrors the columns above, numbers as number */ }

export const APP_CONFIG_DEFAULTS: AppConfig = { ...same values as column defaults };

let cache: { value: AppConfig; at: number } | null = null;
const CACHE_MS = 30_000; // per-request-ish cache; serverless instances are short-lived

export async function getAppConfig(): Promise<AppConfig> {
  // SELECT the singleton row; if absent, return APP_CONFIG_DEFAULTS.
  // Cache for CACHE_MS; invalidate on updateAppSettings (module-level variable).
}

export function invalidateAppConfigCache(): void { cache = null; }
```

Server-only. Client components receive config values as **props from server pages** (as specced in §1.2/§6.3) — never import this module from a `"use client"` file.

#### §8.3 Admin action — `updateAppSettings` (in `lib/actions/settings.ts`, new file)

```ts
const updateAppSettingsSchema = z.object({
  attendanceGoodPct: z.number().int().min(0).max(100),
  attendanceWarnPct: z.number().int().min(0).max(100),
  matchThreshold: z.number().min(0.2).max(0.9),
  confusionBand: z.number().min(0).max(0.4),
  selfCheckinWindowMinutes: z.number().int().min(2).max(120),
  photoMin: z.number().int().min(1).max(10),
  photoMax: z.number().int().min(1).max(20),
  scanIntervalMs: z.number().int().min(500).max(10000),
  identifyScanIntervalMs: z.number().int().min(500).max(10000),
  marksGoodPct: z.number().int().min(0).max(100),
  marksWarnPct: z.number().int().min(0).max(100),
  evalWeightAcademic: z.number().min(0).max(1),
  evalWeightBehaviour: z.number().min(0).max(1),
  evalWeightParticipation: z.number().min(0).max(1),
  teachingDays: z.array(z.enum(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"])).min(1).max(7),
  sessionDays: z.number().int().min(1).max(31),
  institutionName: z.string().min(1).max(200),
  institutionShortName: z.string().min(1).max(20),
  institutionPhone: z.string().min(1).max(20),
  institutionEmail: z.string().email(),
}).refine(d => d.attendanceWarnPct <= d.attendanceGoodPct, "warn must be ≤ good")
  .refine(d => d.marksWarnPct <= d.marksGoodPct, "warn must be ≤ good")
  .refine(d => Math.abs(d.evalWeightAcademic + d.evalWeightBehaviour + d.evalWeightParticipation - 1) < 0.001, "weights must sum to 1")
  .refine(d => d.photoMin <= d.photoMax, "photoMin must be ≤ photoMax");
// Guard: requireAdmin(). Upsert singleton row (id 1) with onConflictDoUpdate
// (target: appSettings.id). Call invalidateAppConfigCache().
// revalidatePath("/admin/settings") + "/" (landing identity).
```

#### §8.4 Migration of hardcoded values (exact call sites)

| Value | Current hardcoded location | Migrates to |
|---|---|---|
| Attendance tiers 75/60 | `app/(portal)/student/dashboard/page.tsx:57-60`, `student/attendance/page.tsx:10-12,104-106`, `components/attendance-report.tsx:182-186,216-218,269-284` | `attendanceGoodPct` / `attendanceWarnPct` |
| Marks tiers 60/40 | `app/(portal)/student/marks/page.tsx:82` | `marksGoodPct` / `marksWarnPct` |
| Match threshold 0.5 | `components/attendance-camera.tsx:16`, `lib/actions/identify.ts:10` | `matchThreshold` (identify.ts reads via `getAppConfig()`; camera gets it as prop) |
| Confusion band (new) | — | `confusionBand` (default 0.15) |
| Self check-in window (new) | — | `selfCheckinWindowMinutes` (default 10) |
| Scan intervals | `components/attendance-camera.tsx:17` (1500), `app/identify/page.tsx:17` (1200) | `scanIntervalMs` / `identifyScanIntervalMs` (identify page is a client component — its interval stays client-side but the value is passed from a small server wrapper or kept as a prop via a server parent; see open question Q6) |
| Evaluation weights 0.5/0.2/0.3 | `lib/db/portal-queries.ts:480` (SQL literal) | `evalWeight*` — the SQL becomes parameterized: `ROUND(((eval.academic * ${wA} + eval.behaviour * ${wB} + eval.participation * ${wC}) / 5) * 100, 0)` inside the rawSql template (rawSql interpolates safely) |
| Exam types | `lib/actions/teaching.ts:19` `EXAM_TYPES` | Stays a zod enum (schema-adjacent, not runtime-tunable); **documented as intentionally not migrated** — changing exam types changes validation semantics, not a display threshold. Listed here for completeness per requirement 8. |
| Notification audiences | `lib/actions/admin.ts:295` (`"students"` / `"faculty"` / `"both"`) | Same: a domain enum, not a tunable. Events (§2) reuse it. Intentionally not migrated. |
| Teaching days Mon–Sat | `components/timetable-grid.tsx:8`, `faculty/attendance/page.tsx:64` (filter `!== "Sunday"`), `lib/actions/faculty-attendance.ts:16-24` DAYS array | `teachingDays` (display pickers iterate config; the DAYS lookup array itself stays as a constant map) |
| Session days 7 | `lib/auth/session.ts:4` `SESSION_DAYS = 7` | `sessionDays` — **read at session creation only** (`createSessionPayload`, session.ts:20-22); changing it affects new sessions. Middleware cannot read the DB cheaply; expiry is enforced on verify from the signed payload (session.ts:76), so this is safe. |
| Institution identity | `app/layout.tsx:19-22` (metadata), `components/sidebar.tsx:122,167` ("KVSRIT"), `components/mobile-nav.tsx` (labels), `components/landing/footer.tsx:58,118,127-131` (phone/email), `components/landing/hero-section.tsx:40`, `app/identify/page.tsx:117` | `institution*` keys. Root layout metadata becomes `generateMetadata` reading config; sidebar/mobile-nav receive short name as prop from `(portal)/layout.tsx` (which already loads the session server-side, `app/(portal)/layout.tsx:12`). |

#### §8.5 Settings page section

`app/(portal)/admin/settings/page.tsx` gains a new card "App Configuration" (below Campus Location) rendering `components/app-settings-form.tsx` — grouped inputs (Attendance / Marks / Face matching / Calendar / Identity), each labeled with its effect, using the form pattern of `CampusSettingsForm` (`components/campus-settings-form.tsx`). Values shown pre-filled from `getAppConfig()`.

**Acceptance (§8):** with no row in `app_settings`, every consumer behaves exactly as today (defaults equal current constants); changing `attendanceGoodPct` to 80 changes student dashboard coloring after cache expiry; non-admin calls to `updateAppSettings` fail.

---

### §9 UI overhaul (navigation-first)

**Goal.** One nav source of truth per role; sidebar + mobile bottom bar derive from it; shared `PageHeader` with breadcrumbs; ≤2 taps to any page; consistent card/header patterns; thumb-first; no decoration without purpose.

#### §9.1 Single nav source — `lib/nav.ts` (new, no "use client")

```ts
import type { LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Bottom-bar candidates in priority order (max 5 shown). */
  mobile?: boolean;
  /** Group heading in the sidebar (Setup group for admin). */
  group?: "main" | "setup";
}

export const NAV_BY_ROLE: Record<SessionUser["role"], NavItem[]> = { ... };
```

This replaces the two divergent maps that exist today: `components/sidebar.tsx:39-80` (ADMIN_NAV / FACULTY_NAV / STUDENT_NAV + NAV_BY_ROLE) and `components/mobile-nav.tsx:24-53` (a *different* per-role list). Both components import from `lib/nav.ts` and filter (`mobile === true` for the bottom bar; `group` for sidebar sectioning). Sidebar keeps its presentation (motion, active states — sidebar.tsx:172-195); MobileNav keeps its grid (mobile-nav.tsx:59-91).

#### §9.2 Nav item maps per role (final state after this upgrade)

**admin** (sidebar groups: main, then Setup):

| href | label | mobile |
|---|---|---|
| `/admin/dashboard` | Dashboard | ✓ |
| `/admin/students` | Students | |
| `/admin/faculty` | Faculty | |
| `/admin/departments` | Departments | |
| `/admin/enrollment` | Enrollment | |
| `/admin/timetable` | Timetable | |
| `/admin/attendance/reports` | Attendance Reports | ✓ |
| `/admin/events` | Events | |
| `/admin/notifications` | Notifications | ✓ |
| `/admin/setup` | Setup (group: setup) | |
| `/admin/settings` | Settings (group: setup) | |

**hod** (lives under `/faculty` prefix — middleware maps hod→/faculty, middleware.ts:19):

| href | label | mobile |
|---|---|---|
| `/faculty/dashboard` | Dashboard | ✓ |
| `/faculty/timetable` | My Timetable | |
| `/faculty/classes` | My Classes | |
| `/faculty/attendance` | Attendance | ✓ |
| `/faculty/students` | My Students | |
| `/faculty/enrollment` | Enrollment (HOD-only) | |
| `/faculty/events` | Events | |
| `/faculty/assignments` | Assignments | |
| `/faculty/marks` | Marks Entry | |
| `/faculty/faculty-attendance` | Faculty Attendance | ✓ |
| `/faculty/notifications` | Notifications | ✓ |

**faculty**: identical to hod minus `/faculty/enrollment` (faculty must never see HOD surfaces — §5). Same FACULTY_NAV list with the enrollment row removed.

**student**:

| href | label | mobile |
|---|---|---|
| `/student/dashboard` | Dashboard | ✓ |
| `/student/attendance` | My Attendance | ✓ |
| `/student/timetable` | My Timetable | |
| `/student/marks` | Marks | |
| `/student/assignments` | Assignments | |
| `/student/exams` | Examinations | |
| `/student/syllabus` | Syllabus | |
| `/student/events` | Events | ✓ |
| `/student/biometrics` | My Biometrics | |
| `/student/notifications` | Notifications | |
| `/student/profile` | Profile | |

(Self check-in is NOT a nav item — it is a contextual card on dashboard/attendance, §6.4. Events is a nav item for all roles.)

#### §9.3 Shared `PageHeader` — `components/page-header.tsx` (new)

```ts
{ title: string; subtitle?: string; breadcrumbs?: { label: string; href?: string }[] }
```

Renders breadcrumbs (Home / section / page — links or plain text), then title/subtitle. Visually consistent with `DashboardHeader` (`components/dashboard-header.tsx:10-21`) but adds breadcrumbs and drops the entrance animation for sub-pages (motion only on top-level dashboards). All NEW pages in this spec (§2.4, §3.3, §6, §7.3) use `PageHeader`; existing pages keep `DashboardHeader` until opportunistically migrated (non-goal).

#### §9.4 Consistency rules for the nav-specialist lane

- Every list page: `PageHeader` → filter/toolbar card → content cards; every empty state uses `EmptyState` with an icon (pattern `faculty/attendance/page.tsx:81-87`).
- Cards: `rounded-2xl bg-white border border-kvsr-soft shadow-sm` (the dominant pattern, e.g. `admin/settings/page.tsx:72`, `attendance-camera.tsx:164`).
- Touch targets ≥ 48px on mobile (existing convention, `identify/page.tsx:149` `min-h-[48px]`).
- Active states use color + weight + icon stroke (never color alone — `mobile-nav.tsx:75-84` already does weight+stroke; keep).
- ≤ 2 taps rule: dashboard → any page = 1 tap (nav); any page → related action = 1 more tap. The nav maps above satisfy this; no page may require navigating through another page first.
- No new gradients/glassmorphism; the kvsr palette tokens (`kvsr-navy`, `kvsr-cta`, `kvsr-soft`, `kvsr-gold`) only.

**Acceptance (§9):** sidebar and bottom bar render identical role nav from one module; hod sees Enrollment, faculty does not; every new page has breadcrumbs; bottom bar shows exactly 5 items per role.


---

## Schema changes & migration order

All changes go through `npm run db:generate` (drizzle-kit generate against `lib/db/schema.ts`, `drizzle.config.ts:1-10`) then `npm run db:migrate`. **Order matters** for FK dependencies:

**Migration 1 (foundation — must land first, everything depends on it):**
1. `app_settings` table (§8.1) — new table, no FKs.
2. `students.contactLockedAt` (§4.1) — nullable column add.
3. `attendance_sessions.selfCheckinOpenedAt` (§6.1) — nullable column add.

**Migration 2 (features — can be same migration as 1 if lanes merge, but keep separate for parallel lanes):**
4. `events` table (§2.1) — FK to `departments` (cascade) and `faculty` (set null); needs `departments` + `faculty` to exist (they do).
5. Index `events_date_idx`.

No data migration is required: all new columns are nullable or defaulted; no backfill. `db:push` is acceptable in dev, but the repo has a migrations journal (`drizzle/meta/_journal.json`) — prefer generate+migrate.

**Drizzle style constraints (from schema.ts):** `pgTable` + `uuid().defaultRandom().primaryKey()`, `timestamp(..., { withTimezone: true })`, `date`, `time`, `text`, `integer`, `boolean`, `jsonb`, `numeric`, composite table-level callback returning `uniqueIndex`/`index` objects (schema.ts:102-108, 172-178, 228-235, 262-269). `doublePrecision` is available in drizzle-orm 0.45.2 (verified in node_modules) but is not yet used in this schema — it is the right type for thresholds (JS `number`, unlike `numeric` which returns string, cf. `campusSettings.latitude` needing `Number(...)` coercion at `lib/actions/campus.ts:27-28`).

---

## File change map

### Lane A — Backend foundation (schema + config + guards)

| File | Change |
|---|---|
| `lib/db/schema.ts` | + `appSettings` table; + `events` table; + `students.contactLockedAt`; + `attendance_sessions.selfCheckinOpenedAt`; add `index` + `sql` imports |
| `lib/app-config.ts` | NEW — typed accessor + defaults + cache (§8.2) |
| `lib/auth/guards.ts` | + `requireHodOnly` (§5.1); no changes to existing guards |
| `lib/actions/settings.ts` | NEW — `updateAppSettings` (§8.3) |
| `drizzle/` | generated migrations (via db:generate) |

### Lane B — Backend features (actions + queries)

| File | Change |
|---|---|
| `lib/actions/biometrics.ts` | + `reinforceBiometric` (§1.3); export `descriptorSchema` for reuse |
| `lib/actions/events.ts` | NEW — `createEvent` / `updateEvent` / `deleteEvent` (§2.2) |
| `lib/db/event-queries.ts` | NEW — `getEventsForRole` / `getEventById` (§2.3) |
| `lib/actions/enrollment.ts` | NEW — `enrollStudents` / `moveStudent` / `unenrollStudents` / `createStudent` (§3.1) |
| `lib/db/enrollment-queries.ts` | NEW — `getEnrollmentWorkspace` + picker tree (§3.2) |
| `lib/actions/student-contact.ts` | NEW — `setMyContact` / `hodUpdateStudentContact` (§4.2) |
| `lib/actions/attendance.ts` | + `openSelfCheckin` / `closeSelfCheckin` / `selfCheckIn` (§6.2) |
| `lib/db/queries.ts` | + `getOpenSelfCheckinForSection` (§6.4); + admin list queries (§7.2) |
| `lib/actions/setup.ts` | NEW — faculty/student/section/subject/slot/academic-year CRUD (§7.1) |
| `lib/actions/teaching.ts` | `assertAccess` hod → department check (§5.2) |
| `lib/db/portal-queries.ts` | `getStudentAnalytics` weights parameterized from config (§8.4) |
| `lib/actions/identify.ts` | `MATCH_THRESHOLD` → `getAppConfig().matchThreshold` (§8.4) |
| `lib/actions/faculty-attendance.ts` | no functional change (DAYS array stays; teaching days filter reads config in the page layer) |

### Lane C — Frontend attendance (photo mode + self check-in client)

| File | Change |
|---|---|
| `lib/face-client.ts` | NEW — model loading + detection + math (§1.1) |
| `components/attendance-photo-upload.tsx` | NEW — photo flow (§1.2) |
| `components/match-resolution-dialog.tsx` | NEW — confusion dialog (§1.2 step 6) |
| `components/attendance-marking.tsx` | + third mode "Upload Photos", default (§1.4) |
| `components/self-checkin-controls.tsx` | NEW — faculty open/close window (§6.3) |
| `components/self-checkin-card.tsx` | NEW — student countdown + scan (§6.4) |
| `app/(portal)/faculty/attendance/page.tsx` | pass config props + selfCheckinOpenedAt; render controls (§1.4, §6.3) |
| `app/(portal)/student/dashboard/page.tsx` | + self check-in card when window open (§6.4) |
| `app/(portal)/student/attendance/page.tsx` | + self check-in card (§6.4) |

### Lane D — Frontend admin/HOD surfaces

| File | Change |
|---|---|
| `app/(portal)/admin/events/page.tsx` | NEW (§2.4) |
| `app/(portal)/faculty/events/page.tsx` | NEW (§2.4) |
| `app/(portal)/student/events/page.tsx` | NEW (§2.4) |
| `components/event-manager.tsx` | NEW (§2.4) |
| `app/(portal)/faculty/enrollment/page.tsx` | NEW (§3.3) |
| `app/(portal)/admin/enrollment/page.tsx` | NEW (§3.3) |
| `components/enrollment-manager.tsx` | NEW (§3.3) |
| `app/(portal)/student/profile/page.tsx` | + contact editor / locked state (§4.3) |
| `components/student-contact-editor.tsx` | NEW (§4.3) |
| `app/(portal)/admin/setup/page.tsx` + 6 sub-pages | NEW (§7.3) |
| `components/setup-faculty-form.tsx`, `components/setup-slot-editor.tsx`, etc. | NEW (§7.3) |
| `app/(portal)/admin/settings/page.tsx` | + App Configuration card (§8.5) |
| `components/app-settings-form.tsx` | NEW (§8.5) |

### Lane E — Navigation & shell (nav-specialist)

| File | Change |
|---|---|
| `lib/nav.ts` | NEW — single nav source (§9.1) |
| `components/sidebar.tsx` | import NAV_BY_ROLE from lib/nav; render groups; institution short name from prop (§9.2, §8.4) |
| `components/mobile-nav.tsx` | import NAV_BY_ROLE; filter `mobile` items (§9.2) |
| `components/page-header.tsx` | NEW (§9.3) |
| `app/(portal)/layout.tsx` | load `getAppConfig()` once, pass `institutionShortName` to Sidebar/MobileNav (§8.4) |
| `app/layout.tsx` | metadata → `generateMetadata` reading config (§8.4) |
| `components/landing/footer.tsx`, `components/landing/hero-section.tsx` | identity strings from config props (landing is server-rendered — read config directly) |
| `app/identify/page.tsx` | "KVSR" badge text from prop/server wrapper; interval from config (§8.4, Q6) |

### Cross-lane conflicts (coordination points)

- `lib/db/schema.ts` — **Lane A only.** Lanes B–E must not edit it; they consume exported tables.
- `lib/actions/attendance.ts` — Lane B only (Lane C consumes the new actions).
- `components/attendance-marking.tsx` — Lane C only.
- `app/(portal)/faculty/attendance/page.tsx` — Lane C (props) + Lane E (PageHeader swap). Sequence: Lane C first, Lane E re-touches headers after.
- `app/(portal)/student/dashboard/page.tsx` — Lane C (check-in card) + Lane B (config-driven tiers). Merge order: Lane B's tier change is a one-line color-logic swap; coordinate in review.
- `app/(portal)/admin/settings/page.tsx` — Lane D only.

---

## Parallelization plan

Sequencing: **Lane A must merge first** (schema + config + guards are imported by everyone). After A:

| Lane | Can start | Touches | Parallel with |
|---|---|---|---|
| A — Backend foundation | immediately | schema, app-config, guards, settings action | — (blocks all) |
| B — Backend features | after A | lib/actions/*, lib/db/* | C, D, E (no file overlap with them) |
| C — Attendance frontend | after A (needs config props + action names; can stub against the spec'd interfaces) | components/attendance-*, face-client, faculty+student attendance pages | B, D, E |
| D — Admin/HOD surfaces | after A | admin/faculty/student pages + their components | B, C, E |
| E — Navigation shell | after A | lib/nav, sidebar, mobile-nav, page-header, layouts | B, C, D |

Two-implementer split (as requested): **Implementer 1 = A then B** (all `lib/**`), **Implementer 2 = C + D + E** (all `app/**` + `components/**`), with Implementer 2 starting on E (nav shell, zero dependencies beyond A) while B lands. Interfaces between them are frozen by this spec: action names, zod shapes, result types, and prop shapes (§1.2, §6.3, §6.4, §9.1).

Suggested merge order: A → E → B → C → D (E early so new pages land with breadcrumbs already available; C and D can interleave freely after B since they only call B's actions).

---

## Verification

Per-increment and final:

1. `npm run lint` — clean.
2. `npm run build` — clean (catches server/client boundary violations, e.g. accidentally importing `lib/app-config` into a client component).
3. `npm run db:generate` + review generated SQL + `npm run db:migrate` against a dev database.
4. Manual role matrix (no test framework exists — `kvsr-context` verification rules): for each new action, attempt with admin / hod / faculty / student sessions and confirm the expected allow/deny per §5 acceptance.
5. Face flows on a real device (camera + geolocation): photo upload with 3 and 6 photos; confusion dialog with two similar students; self check-in inside and after the window; off-campus rejection with campus configured.

---

## Acceptance criteria (checklist)

**§1 Photo attendance**
- [ ] 3–6 photo upload; images never leave the browser (no network call carries image bytes — verify in devtools network tab)
- [ ] Matching uses averaged descriptors per student per session
- [ ] Top-2 within confusion band → resolution dialog (best guess large, alternates, not-present, unknown→roster)
- [ ] Unmatched faces → unassigned tray; resolvable or explicitly left unresolved
- [ ] Submit reuses `saveAttendance` (merge, geofence, roster-complete records)
- [ ] `reinforceBiometric` merges confirmed descriptors as capped running average; faculty-assignment/HOD-dept guard enforced; faculty session cannot reinforce outside their sections

**§2 Events**
- [ ] `events` table + admin/HOD CRUD with ownership rules (HOD: own dept or own created events only)
- [ ] View pages for admin/faculty(HOD)/student with audience + department filtering
- [ ] Students never see faculty-only events; cross-department isolation for scoped events

**§3 Enrollment**
- [ ] HOD manages enrollment scoped to own department; admin unrestricted
- [ ] Enroll (multi), move (single active enrollment preserved), unenroll (deactivate, not delete)
- [ ] HOD creates students (fullName, rollNumber); duplicate roll number → friendly error
- [ ] Faculty session denied on all four actions

**§4 Contact lock**
- [ ] Student sets phone+email once; confirm → warning modal → locked atomically (`contactLockedAt` set in same update)
- [ ] Locked profile read-only with "contact your HOD"
- [ ] HOD updates contact for own-department students only; admin any; faculty denied

**§5 Hierarchy**
- [ ] `requireHodOnly` exists and guards all HOD-exclusive actions/pages
- [ ] `assertAccess` in teaching.ts enforces HOD department scope
- [ ] Faculty session denied on every HOD-tier action (tested per action)

**§6 Self check-in**
- [ ] Faculty opens/closes window; window minutes from config
- [ ] Student card with countdown on dashboard + attendance page while open
- [ ] Server verifies: role=student, enrollment in slot's section, session for today's slot, window open, own-descriptor distance < threshold, geofence when campus configured
- [ ] Upsert present record; no duplicate rows; no self-service attendance outside window

**§7 Setup**
- [ ] Create faculty / students / sections / subjects / slots / academic years all work from Setup sub-pages
- [ ] Unique-constraint errors surfaced as friendly messages
- [ ] Timetable slot editor creates/edits/deletes slots; slots appear in faculty + student timetables
- [ ] set-current academic year clears previous

**§8 Config**
- [ ] `app_settings` singleton + `lib/app-config.ts` with defaults = current hardcoded values (zero behavior change)
- [ ] All §8.4 call sites read config (grep audit: no remaining `>= 75` tier literals in student pages, no `MATCH_THRESHOLD = 0.5` literals)
- [ ] Admin settings section edits runtime-editable keys; weights sum validation; non-admin denied

**§9 Navigation**
- [ ] `lib/nav.ts` is the only nav map; sidebar + mobile bar derive from it
- [ ] Role maps match §9.2 (hod has Enrollment, faculty doesn't; all roles have Events)
- [ ] `PageHeader` with breadcrumbs on all new pages
- [ ] Bottom bar = 5 items per role; ≤2 taps to any page

---

## Open questions

1. **"Only HOD should be able to change ivt"** — interpreted as: only the HOD can change a student's **locked contact info** (requirement 4's "only your HOD can change it later"). "ivt" is assumed to be a typo/shorthand for that contact-lock rule. If "ivt" means something else (a specific field? IVT = in-vitro? a typo for "it"?), confirm before implementing §4.2's `hodUpdateStudentContact` guard scope. Admin is kept as an override per requirement 5's "ADMIN > HOD" ladder — flag if admin should be excluded too.
2. **HOD identity when a department has no HOD set** (`setHod` is the only path, admin.ts:209-234): should enrollment/contact/event powers fall back to admin only? Spec assumes yes (HOD without department → `requireHodActor` errors).
3. **Unenrolled-student department membership** (§3.1 step 4): a student with no active enrollment has no derivable department. Should HODs see ALL unenrolled students (risky cross-dept) or only students previously enrolled in their department (requires enrollment history join)? Spec leans toward "previously enrolled in own department OR created by this HOD" — needs a product decision.
4. **`reinforceBiometric` consent semantics**: if a student has no biometric row and photo attendance confirms a match, there is nothing to merge into — the spec requires explicit `consent: true` to insert. Confirm faculty-side consent flow wording (the existing checkbox pattern, biometric-enroll.tsx:102-114, is the template).
5. **Self check-in window end**: spec stores only `selfCheckinOpenedAt` and derives the end from config (§6.1). If admin changes the window mid-flight, open windows stretch/shrink. Prefer a frozen `selfCheckinEndsAt` column instead? (One extra column; slightly more explicit.)
6. **`identify/page.tsx` scan interval**: the page is a standalone client component outside `(portal)`. Options: (a) wrap it in a server parent that passes config props, or (b) keep the literal 1200ms and only migrate portal consumers. Spec leans (a) for completeness but (b) is acceptable if the wrapper complicates the fullscreen layout.
7. **Events created by HOD for "both" audience across departments**: `audience: "both"` + `departmentId` scope is supported; institution-wide events are admin-only per §2.2. Confirm HODs should never create institution-wide events (spec assumes yes).
8. **Student creation password**: login uses roll number as password (auth.ts:95-98). Creating a student therefore sets an implicit password = roll number. Confirm this remains acceptable (it is the existing dev-mode model) or whether Setup/HOD creation should take an explicit password field.
9. **`sessionDays` in config**: middleware cannot read the DB; expiry rides in the signed payload (session.ts:76). Changing `sessionDays` only affects newly issued sessions — confirm that is the intended semantics.

---

*End of spec. Nothing in this document has been implemented; it is a plan for the Level 4 upgrade lanes.*

