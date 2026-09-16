# PROJECT_CONTEXT.md — KVSR Management (KVSR-Mangement)

> Generated: 2026-09-16 · Repo: `Farhan-Adil-M/KVSR-Mangement` · Local folder: `Desktop/College mangement/kvsr-mgmt` · Live app: https://kvsr-mangement-tau.vercel.app

## What this is

Campus operations platform for **Dr. K.V. Subba Reddy Institute of Technology (KVSRIT), Kurnool**. One app for attendance, timetables, marks and evaluations, biometric enrollment, and department/HOD management — on the web and as a native Android app. Attendance is captured by face recognition and enforced with a campus geofence.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/Base UI
- Server Actions with signed cookie sessions (HMAC — no session store): `lib/auth/session.ts`
- Drizzle ORM + Neon PostgreSQL (`@neondatabase/serverless`)
- `@vladmandic/face-api` for face detection/recognition in the browser
- `motion` and `lucide-react` for UI/animation
- Serwist service worker (PWA)
- Capacitor 8 (Android) with app/browser/camera/geolocation plugins
- Auto-update: installed app compares version with `app-version.json` and prompts to download a new APK

## Architecture & domain (authoritative sources)

Persistent project skill: `.opencode/skills/kvsr-context/SKILL.md` — load it before any KVSR code change. Authoritative code: `lib/db/schema.ts` and `lib/auth/session.ts`.

- **Roles:** `admin` (HOD/admin), `faculty`, `student`. Role stored on the signed session cookie. HOD = admin; faculty may be flagged `is_hod` in the `faculty` table.
- **Hard rule — backend-only authorization:** frontend visibility is NOT security. Every sensitive action validates session → role → resource ownership in the server/action layer. Never trust frontend IDs/params.
  - Student isolation: a student can only ever access their own data.
  - Faculty assignment chain: Faculty → Assigned Subject → Assigned Section → Authorized Students. Faculty may only act on their assigned classes.
- **Domain model:** departments/programs/academicYears/studyYears/sections; faculty/students; studentEnrollments (section + roll snapshot); subjects/labGroups; timetableSlots; attendanceSessions + attendanceRecords (+ summaries); periods.
- **Attendance:** faculty mark via My Classes → assigned class; students see only their own attendance (subject-wise %, present/absent, status).
- **Marks/evaluations:** students view only their own; faculty evaluate only assigned students (1–5 scale, one faculty rating must not dominate an evaluation); HOD analytics aggregate.

## Recent work log (from git history, oldest → newest)

- Foundation: landing + dashboard redesigns, attendance module (section/date selection + marking grid), students + faculty modules, settings page, auth (login/logout, protected routes), RBAC restructure into three role portals with faculty assignment enforcement, evaluations as a searchable card grid with modal, facial-recognition attendance (biometric enrollment, multi-face camera, embeddings-only storage, front/back camera toggle).
- Android/Capacitor: TWA/APK CI workflow (Bubblewrap hand-authored manifest), Digital Asset Links fixes, Capacitor 8 permission handling, in-app update checker, android-first redesign (fullscreen face sign-in, bottom nav, bottom-sheet modals), student bottom-nav fixes.
- Landing page: "Engineered Prestige" full redesign (researched + audited), then an interface-reviewer audit pass.

## Context from previous opencode sessions

- Sessions around the app used a dedicated `kvsr-context` project skill and verified it loads before editing (architectural + security rules, Level-1 verification = lint).
- **Code review session (`Review KVSR codebase`):** prior review flagged a **CRITICAL faculty authorization gap** — faculty endpoints needed the assignment-chain checks; fixed in the RBAC restructure (`82c6b37` and follow-ups: fixed faculty attendance access, geofence messaging, biometrics gating in `437ca01`).
- **Landing page sessions:** research → blueprint → implement → `@interface-reviewer` audit → fixes + lint + build + push (`3cec534`).
- Other tracked work (sessions in `Desktop/College mangement`): editable Settings page, HOD notifications to both audiences, contrast-token pass, unified faculty "students" hub + nav, security review of biometrics, RBAC spec/security/code reviews. The `ses_fa359292fffe` session mapped the app structure and roles.

## Verification commands

- Lint: `npm run lint`
- Build: `npm run build`
- DB: `npm run db:generate` / `npm run db:migrate` / `npm run db:push`
- No test framework configured — do not claim tests pass without a runnable command.

## Repo status at write time

- In sync with `origin/master` (nothing unpushed, no uncommitted changes except an ignored local `server.log`).
- This `PROJECT_CONTEXT.md` added and pushed to keep the repo's docs current.
- Deployed on Vercel and as an Android APK via Capacitor.