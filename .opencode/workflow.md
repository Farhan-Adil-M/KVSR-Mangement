# KVSR Multi-Subagent Workflow (v2)

Replaces the single-orchestrator v1 deck. 10 specialized subagents, each with
its own permissions and skill loading. The orchestrator (kvsr-orchestrator.md)
is the primary agent that dispatches these.

## Agent Deck

| Agent | Lane | Mode | Edits? | Loads skills |
|---|---|---|---|---|
| `researcher` | external info | subagent | no edit/bash/task | kvsr-context |
| `planner` | spec writing | subagent | writes specs to docs/plans only | kvsr-context, codebase-design |
| `spec-reviewer` | adversarial plan check | subagent | no edit/bash | kvsr-context |
| `backend-implementer` | lib/** (actions/db/auth) | subagent | yes (lib + scripts) | kvsr-context, drizzle-orm-patterns |
| `frontend-implementer` | app/** + components/** | subagent | yes (app, components) | kvsr-context, frontend-design, vercel-react-best-practices |
| `config-sweeper` | de-hardcoding sweeps | subagent | yes (assigned files only) | kvsr-context, codebase-design |
| `nav-specialist` | navigation/IA overhaul | subagent | yes (nav components only) | kvsr-context, frontend-design, web-design-guidelines |
| `security-reviewer` | authorization audit | subagent | read-only | kvsr-context |
| `code-reviewer` | final pre-merge review | subagent | read-only | kvsr-context |
| `verifier` | lint/type/build/migrations | subagent | trivial fixes only | kvsr-context |
| `fixer` | applies review findings | subagent | yes (assigned findings) | kvsr-context |

All agents load `kvsr-context` first. Every agent is permission-boxed: only
implementers and fixer/verifier can edit; reviewers are read-only so they never
mutate state mid-review; only verifier can apply DB migrations.

## Model assignment (from research subagent report)

Cost-optimized per role. Cheap bulk workers, credible orchestrator, quality-sensitive reviewer.

| Seat | Model | Price (per 1M, in/out) | Why |
|---|---|---|---|
| Orchestrator (kvsr-orchestrator) | `zai-coding-plan/glm-5.3` OR `deepseek/deepseek-v4-pro` | ~$1-2 in | cheapest credible tool-calling orchestrator |
| backend/frontend/config/nav implementers | `deepseek/deepseek-v4-flash` | $0.22/$0.66, 2500 concurrent | best price/perf coding; high concurrency for parallel fan-out |
| config-sweeper / fixer (bulk sweeps) | `opencode/qwen3.8-flash` ($0.15/$0.47) or `zai-coding-plan/glm-5.3-flash` | ~$0.15/$0.50 | pennies per sweep |
| reviewers (security/code/spec) | `anthropic/claude-haiku-4-5` | $1/$5 + 90% cache discount | output-heavy + adversarial; needs quality |
| verifier | `anthropic/claude-haiku-4-5` or `moonshot/kimi-k2.5` | $0.60-1 / $3-5 | judgment-heavy verification |
| researcher | `google/gemini-3-flash` | $0.50/$3, 1M ctx | long-context web research cheap |
| planner | `google/gemini-3-flash` or `openai/gpt-5.4-mini` | $0.50-0.75 in | long context + structured output cheap |

## Concurrency rules (from research)

- DON'T put >2 parallel subagents on one GLM coding-plan key (undocumented
  concurrency limit 1-2 on Pro; error 1302).
- DO split parallel workers across providers:
  DeepSeek (2,500 concurrent) / Gemini / OpenAI / Anthropic.
- Zen free models (`opencode/*-free`) only for throwaway/testing tasks - rate
  limited unsuitable for parallel workers.

## Pipelines (dispatch patterns)

### New feature (Level 3)
```
researcher (only if external info needed)
 → planner
 → spec-reviewer ── revises planner ─↺
 → [parallel] backend-implementer(lib/**) + frontend-implementer(app,components)
 → security-reviewer (lib diff)
 → code-reviewer (whole diff)
 → fixer(s)
 → verifier
```

### UI overhaul / nav pass (Level 4 UI)
```
 → planner (IA spec)
 → spec-reviewer
 → nav-specialist + frontend-implementer (split: shared vs page bodies)
 → code-reviewer
 → fixer(s)
 → verifier
```

### De-hardcoding sweep (repeat per category)
```
 → config-sweeper instance per disjoint category (weekday lists, thresholds,
   weights, identity strings, seed data)
 → verifier (grep audit + build)
```

### Trivial change (Level 1)
Orchestrator does it directly. No subagents.

## Full Feature Inventory (as of v1.1.1)

### Shared / Auth
1. Face sign-in (`/identify`) - camera scans at 1200ms, two-consecutive-scan
   same-student match, then session established; fallback username/password
   with role picker
2. Password login for admin/faculty/hod/student
3. Role-based portaling via middleware + prefix guards (admin/faculty/student)
4. HMAC signed-cookie sessions (7 days, no server store)
5. Role-aware navigation (sidebar + mobile bottom bar)

### Admin
6. Dashboard w/ stats, quick links, academic year card
7. Student performance analytics (search, filters: best/attention/low-attendance,
   sort; weighted overall score)
8. Faculty directory + profile pages (per-faculty weekly schedule)
9. Faculty class assignment management (subject+section pickers)
10. Attendance reports (per section)
11. Faculty attendance reports (derived)
12. Notifications composer (broadcast to faculty/students/both + scoped)
13. Departments, programs, HOD assignment CRUD
14. Campus geofence settings (lat/lng/radius 10-5000m)
15. Timetable viewer (section picker)
16. Academic year + period + system counts management

### Faculty (and HOD)
17. Dashboard w/ today's slots, pending slots, next class, notification preview
18. Face-recognition attendance marking (continuous scan, merge into existing
    marks, geofence-gated)
19. Class picker + per-class attendance day picker (Mon-Sat)
20. My students hub (HOD: whole department; faculty: assigned sections) with
    contact info, biometric status, evaluations
21. Marks entry (upsert per student/subject/year/title)
22. Assignment composer + feed w/ overdue flags
23. Faculty-attendance self-report (HOD sees dept)
24. HOD notification composer (department-scoped)
25. Exams creation (admin-only, year-wide)
26. Syllabus unit authoring (upsert per subject/unit)

### Student
27. Dashboard (overall %, next class, today's timetable, notifications)
28. Attendance view (subject-wise bars, safe/warning/critical tiers)
29. Self biometric enrollment (frozen after first capture, consent recorded)
30. Timetable view
31. Marks view (grouped, colored tiers)
32. Assignments view (overdue/upcoming/due chips)
33. Exam schedule view
34. Syllabus viewer
35. Notifications view
36. Profile view

### Cross-cutting
37. Biometric enrollment by staff (128-d descriptors, double-scan consent,
    liveness check)
38. Face identify action (brute-force Euclidean over all enrolled descriptors,
    threshold 0.5)
39. Geofence enforcement on attendance via device location
40. Faculty attendance derivation from timetable vs sessions
41. Student attendance summaries (cached rollup per student+subject)
42. Notifications targeting (role/faculty/student/department)
43. PWA (Serwist service worker, manifest)
44. Android Capacitor shell w/ native camera + geolocation, auto-update APK
    checker against app-version.json
45. Digital Asset Links route for TWA verification
46. GitHub Actions CI (web + signed APK on v* tags)

## Hardcoded-Value Inventory (de-hardcoding backlog)

1. Weekday lists - 6 locations (timetable-grid, queries.ts CASE, faculty
   timetable page, admin faculty page, faculty attendance page,
   faculty-attendance.ts)
2. Evaluation weights 0.5/0.2/0.3 - portal-queries.ts:480 + admin students page
3. Attendance tiers 75/60 - student attendance/dashboard pages, admin buckets
4. Marks tiers 60/40 - student marks page
5. Unit limit 20, marks max 1000 - teaching.ts
6. Session days 7 - session.ts
7. Scan interval 1200/1500ms - identify page, attendance-camera
8. Match threshold 0.5 - identify.ts + attendance-camera.tsx
9. Geofence radius bounds 10-5000 - campus-settings.ts + campus-settings-form
10. Exam types list - teaching.ts:19
11. Notification audiences - admin.ts enum
12. Institution identity strings - layout.tsx, manifest.ts, footer, hero-section,
    site-header, sidebar (KVSRIT), dashboard copy (CSE department)
13. Fake landing stats/testimonials/phone/email - stats-section (843/41/530/6),
    testimonials-section, footer (tel:+918518200000)
14. Seed data - seed-app.ts (admin password KVSR2026, geofence), 
    migrate-from-turso.ts (period times, CSE dept, BTECH-CSE program, year
    2026-2027, study years 2-4, subject-name fixups)
15. Period subtitle 09:50 AM - 05:00 PM - dashboard-stats.tsx
16. Unknown: any UI-only magic numbers (due chip 3d, notification preview
    slice 4, retry delays) - sweepable but lower priority
17. Vercel URL in capacitor.config.ts + twa-manifest.json (deployment config)
18. Apartment fingerprint sha256 in assetlinks route (env-overridable already;
    harden into config)
