# KVSR Management

Campus operations platform for **Dr. K.V. Subba Reddy Institute of Technology (KVSRIT), Kurnool**.

One app for attendance, timetables, marks and evaluations, biometric enrollment, and department/HOD management — on the web and as a native Android app. Attendance is captured by face recognition and enforced with a campus geofence.

Live app: https://kvsr-mangement-tau.vercel.app

## Features

- **Face sign-in** — students are identified by camera at `/identify`; a username/password fallback covers the other roles.
- **Role-based portals** — `admin`, `hod`, `faculty`, `student`. An HOD is a faculty member with department-wide access. Every action is authorized server-side.
- **Face-recognition attendance** — the camera scans a class continuously and marks recognized students automatically. Later scans merge into existing marks instead of overwriting them.
- **Geofenced check-ins** — attendance is rejected outside the configured campus radius (Admin → Settings).
- **Biometric enrollment** — students self-enroll once (locked after the first capture); faculty and HODs can enroll students from My Students.
- **Faculty attendance** — derived daily from scheduled classes versus conducted sessions.
- **Departments, programs and HODs** — managed by admin; an HOD sees every student and all faculty attendance in their department.
- **Notifications** — admin and HOD announcements to students, faculty, or both, optionally scoped to a department.
- **Android app** — a Capacitor shell around the web app with native camera and geolocation permissions.
- **Auto-update** — the installed app compares its version with `app-version.json` and prompts to download when a newer APK is released.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- Server Actions with signed cookie sessions (HMAC — no session store)
- Drizzle ORM + Neon PostgreSQL (`@neondatabase/serverless`)
- `@vladmandic/face-api` for face detection and recognition in the browser
- `motion` and `lucide-react` for UI and animation
- Serwist service worker (PWA)
- Capacitor 8 (Android) with `@capacitor/app`, `@capacitor/browser`, `@capacitor/camera`, `@capacitor/geolocation`

## Running locally

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL and SESSION_SECRET
npm run db:push              # apply the schema to the database
npx tsx scripts/seed-app.ts  # seed the default admin and campus geofence
npm run dev
```

The seed script creates the default admin login (username `admin`; the password is defined in `scripts/seed-app.ts`).

## Android app

- The APK is a thin native shell that loads the deployed web app, so web changes reach every installed app without an update.
- Release APKs are built by GitHub Actions on `v*` tags and attached to the release: https://github.com/Farhan-Adil-M/KVSR-Mangement/releases
- **Auto-update:** on launch the app compares its `versionCode` with `public/app-version.json` and shows an update banner when a newer build exists.
- **To release:** bump `versionCode`/`versionName` in `android/app/build.gradle` and `public/app-version.json`, then push a `v*` tag.

## Deployment

- **Web:** Vercel (`kvsr-mangement-tau.vercel.app`). Required env vars: `DATABASE_URL`, `SESSION_SECRET`.
- **Database:** Neon PostgreSQL. Schema is managed with `drizzle-kit` (`npm run db:push`); `scripts/seed-app.ts` seeds the default admin and the campus geofence.
- **APK signing:** the release keystore is stored in GitHub secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_PASSWORD`). `.github/workflows/build-apk.yml` builds and signs on tag push.

## Project structure

```
app/                      Routes: landing page, /identify, (portal)/{admin,faculty,student}
components/               UI: landing page sections, cameras, sidebar, mobile nav, modals
lib/
  actions/                Server actions — the entire backend surface
  auth/                   Signed-cookie sessions, middleware, role guards
  db/                     Drizzle schema, raw-SQL portal queries, database client
scripts/seed-app.ts       Seeds the default admin and campus geofence
android/                  Capacitor Android project
public/models/            face-api model weights
.github/workflows/        Web + signed APK builds on v* tags
```

Notes on the architecture:

- All writes go through server actions; role checks run inside each action and are never trusted from the client.
- Auth is a single HMAC-signed cookie (`id`, `name`, `role`, `exp`); middleware enforces the role prefixes (`/admin`, `/faculty`, `/student`).
- Only 128-dimensional face descriptors are stored — never images.

## Screenshots

Drop captures into `docs/screenshots/` and reference them here:

![Face sign-in](docs/screenshots/identify.png)

![Attendance](docs/screenshots/attendance.png)

![Dashboard](docs/screenshots/dashboard.png)

## License

Proprietary — all rights reserved. © 2026 Dr. K.V. Subba Reddy Institute of Technology.
