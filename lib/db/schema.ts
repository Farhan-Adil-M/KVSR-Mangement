import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  time,
  numeric,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Academic structure
export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Top-level administrators (distinct from faculty/HOD). Seeded with a default account.
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Single-row campus geofence config used to gate attendance to on-campus only.
export const campusSettings = pgTable("campus_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("Main Campus"),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  radiusMeters: integer("radius_meters").notNull().default(200),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  durationYears: integer("duration_years").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const academicYears = pgTable("academic_years", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const studyYears = pgTable("study_years", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  yearNumber: integer("year_number").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// People and subjects
export const faculty = pgTable("faculty", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  canonicalName: text("canonical_name").notNull().unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  email: text("email").unique(),
  phone: text("phone"),
  isHod: boolean("is_hod").default(false),
  departmentId: uuid("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studyYearId: uuid("study_year_id")
      .notNull()
      .references(() => studyYears.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    classTeacherId: uuid("class_teacher_id").references(() => faculty.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueSection: uniqueIndex("unique_section").on(
      table.studyYearId,
      table.name
    ),
  })
);

export const periods = pgTable("periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodNumber: integer("period_number").notNull().unique(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isBreak: boolean("is_break").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code"),
    name: text("name").notNull(),
    shortName: text("short_name"),
    isLab: boolean("is_lab").default(false),
    isElective: boolean("is_elective").default(false),
    electiveType: text("elective_type"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueSubjectCode: uniqueIndex("unique_subject_code").on(
      table.code,
      table.departmentId
    ),
  })
);

// Students and enrollments
export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  rollNumber: text("roll_number").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  // Set when the student confirms their contact info; locks it from self-edit.
  contactLockedAt: timestamp("contact_locked_at", { withTimezone: true }),
  // Faculty/HOD who created this student record (department-scoped enrollment).
  createdByFacultyId: uuid("created_by_faculty_id").references(() => faculty.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const studentEnrollments = pgTable(
  "student_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    rollNumberSnapshot: text("roll_number_snapshot").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueEnrollment: uniqueIndex("unique_enrollment").on(
      table.studentId,
      table.sectionId,
      table.academicYearId
    ),
    uniqueActiveEnrollment: uniqueIndex("unique_active_enrollment")
      .on(table.studentId, table.academicYearId)
      .where(sql`is_active`),
  })
);

// Timetable
export const labGroups = pgTable("lab_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  facultyId: uuid("faculty_id").references(() => faculty.id, {
    onDelete: "set null",
  }),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  name: text("name"),
  periodCount: integer("period_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const timetableSlots = pgTable(
  "timetable_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    dayOfWeek: text("day_of_week").notNull(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    facultyId: uuid("faculty_id").references(() => faculty.id, {
      onDelete: "set null",
    }),
    isLab: boolean("is_lab").default(false),
    labGroupId: uuid("lab_group_id").references(() => labGroups.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueSlot: uniqueIndex("unique_slot").on(
      table.sectionId,
      table.academicYearId,
      table.dayOfWeek,
      table.periodId
    ),
  })
);

// Attendance
export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    timetableSlotId: uuid("timetable_slot_id")
      .notNull()
      .references(() => timetableSlots.id, { onDelete: "cascade" }),
    facultyId: uuid("faculty_id").references(() => faculty.id, {
      onDelete: "set null",
    }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    status: text("status").default("conducted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by").references(() => faculty.id, {
      onDelete: "set null",
    }),
    // Self check-in window anchor; end = openedAt + appSettings.selfCheckinWindowMinutes.
    selfCheckinOpenedAt: timestamp("self_checkin_opened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // One session per slot per day — prevents concurrent double-saves.
    uniqueSessionPerSlotDay: uniqueIndex("unique_session_slot_day").on(
      table.timetableSlotId,
      table.date
    ),
  })
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("present"),
    recordedBy: uuid("recorded_by").references(() => faculty.id, {
      onDelete: "set null",
    }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueRecord: uniqueIndex("unique_attendance_record").on(
      table.sessionId,
      table.studentId
    ),
  })
);

// Biometrics — stores ONLY numeric face embeddings (never raw images)
export const studentBiometrics = pgTable(
  "student_biometrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .unique()
      .references(() => students.id, { onDelete: "cascade" }),
    // 128-d face descriptor from face-api recognition net.
    descriptor: jsonb("descriptor").notNull(),
    // Reinforcement loop bookkeeping (photo attendance "get smarter" merge).
    descriptorCount: integer("descriptor_count").notNull().default(1),
    lastMatchedAt: timestamp("last_matched_at", { withTimezone: true }),
    modelVersion: text("model_version").notNull().default("faceapi-tiny-1"),
    // Server-recorded consent evidence (timestamp + policy version), not client-asserted.
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    consentVersion: text("consent_version"),
    enrolledBy: uuid("enrolled_by").references(() => faculty.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    studentBiometricIdx: uniqueIndex("unique_student_biometric").on(
      table.studentId
    ),
  })
);

// Student attendance summary
export const studentAttendanceSummaries = pgTable(
  "student_attendance_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    classesHeld: integer("classes_held").default(0),
    classesAttended: integer("classes_attended").default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueSummary: uniqueIndex("unique_student_subject_summary").on(
      table.studentId,
      table.subjectId
    ),
  })
);

// Faculty assignments: the authorization source for what a faculty member teaches
export const facultyAssignments = pgTable(
  "faculty_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueAssignment: uniqueIndex("unique_faculty_assignment").on(
      table.facultyId,
      table.subjectId,
      table.sectionId,
      table.academicYearId
    ),
  })
);

// Faculty evaluations of students (holistic, per faculty/student/section/year)
export const studentEvaluations = pgTable(
  "student_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    academicPerformance: integer("academic_performance").notNull(),
    behaviour: integer("behaviour").notNull(),
    participation: integer("participation").notNull(),
    comments: text("comments"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueEvaluation: uniqueIndex("unique_student_evaluation").on(
      table.facultyId,
      table.studentId,
      table.sectionId,
      table.academicYearId
    ),
  })
);

// Student marks
export const marks = pgTable(
  "marks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    examType: text("exam_type").notNull(),
    marksObtained: numeric("marks_obtained").notNull(),
    maxMarks: numeric("max_marks").notNull(),
    recordedBy: uuid("recorded_by").references(() => faculty.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueMark: uniqueIndex("unique_student_mark").on(
      table.studentId,
      table.subjectId,
      table.academicYearId,
      table.title
    ),
  })
);

// Assignments created by faculty for their classes
export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  facultyId: uuid("faculty_id").references(() => faculty.id, {
    onDelete: "set null",
  }),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Examinations (section-scoped, or study-year-wide when sectionId is null)
export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id").references(() => sections.id, {
    onDelete: "cascade",
  }),
  studyYearId: uuid("study_year_id").references(() => studyYears.id, {
    onDelete: "cascade",
  }),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  examDate: date("exam_date").notNull(),
  startTime: time("start_time"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Syllabus units per subject
export const syllabusUnits = pgTable(
  "syllabus_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    unitNumber: integer("unit_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueSyllabusUnit: uniqueIndex("unique_syllabus_unit").on(
      table.subjectId,
      table.unitNumber
    ),
  })
);

// Notifications (broadcast by role, or targeted at one faculty/student)
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetRole: text("target_role"),
  targetFacultyId: uuid("target_faculty_id").references(() => faculty.id, {
    onDelete: "cascade",
  }),
  targetStudentId: uuid("target_student_id").references(() => students.id, {
    onDelete: "cascade",
  }),
  departmentId: uuid("department_id").references(() => departments.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Single-row typed app configuration (defaults equal the previous hardcoded values).
export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
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
  // Evaluation weights (sum to 1; validated in the action)
  evalWeightAcademic: doublePrecision("eval_weight_academic").notNull().default(0.5),
  evalWeightBehaviour: doublePrecision("eval_weight_behaviour").notNull().default(0.2),
  evalWeightParticipation: doublePrecision("eval_weight_participation").notNull().default(0.3),
  // Calendar
  teachingDays: jsonb("teaching_days")
    .notNull()
    .default(sql`'["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb`),
  sessionDays: integer("session_days").notNull().default(7),
  // Institution identity
  institutionName: text("institution_name")
    .notNull()
    .default("Dr. K.V. Subba Reddy Institute of Technology"),
  institutionShortName: text("institution_short_name").notNull().default("KVSRIT"),
  institutionPhone: text("institution_phone").notNull().default("+918518200000"),
  institutionEmail: text("institution_email").notNull().default("support@kvsrit.edu.in"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Campus events (admin/HOD managed; audience-filtered views for every role)
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // null departmentId = institution-wide (admin only); otherwise department-scoped
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "cascade",
    }),
    audience: text("audience").notNull(), // "students" | "faculty" | "both"
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
