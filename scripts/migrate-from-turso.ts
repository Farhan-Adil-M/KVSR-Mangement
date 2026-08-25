import "dotenv/config";
import { createClient } from "@libsql/client";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const neonSql = neon(process.env.DATABASE_URL!);
const db = drizzle(neonSql, { schema });

const PERIOD_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "09:50", end: "10:50" },
  2: { start: "10:50", end: "11:40" },
  3: { start: "11:50", end: "12:40" },
  4: { start: "12:40", end: "13:30" },
  5: { start: "14:30", end: "15:20" },
  6: { start: "15:20", end: "16:10" },
  7: { start: "16:10", end: "17:00" },
};

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function normalizeSubjectName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bPromt\b/gi, "Prompt")
    .replace(/\bQualityManagement\b/gi, "Quality Management")
    .replace(/\bTotal Quality Management\b/gi, "Total Quality Management")
    .replace(/\bFsd-Ii\b/gi, "Full Stack Development-II")
    .replace(/\bCr T\b/gi, "CRT")
    .replace(/\bAds A\b/gi, "Advanced Data Structures & Algorithms")
    .replace(/\bElectronic circuits\b/gi, "Electronic Circuits");
}

async function clearData() {
  console.log("Clearing existing data...");
  await db.execute(
    `TRUNCATE TABLE 
      student_attendance_summaries,
      attendance_records,
      attendance_sessions,
      timetable_slots,
      lab_groups,
      student_enrollments,
      students,
      subjects,
      sections,
      periods,
      faculty,
      study_years,
      academic_years,
      programs,
      departments
    RESTART IDENTITY CASCADE;`
  );
}

async function main() {
  console.log("Starting migration from Turso to Neon...");
  await clearData();

  // 1. Seed reference data
  console.log("Seeding reference data...");
  const [department] = await db
    .insert(schema.departments)
    .values({ code: "CSE", name: "Computer Science & Engineering" })
    .returning();

  const [program] = await db
    .insert(schema.programs)
    .values({
      departmentId: department.id,
      code: "BTECH-CSE",
      name: "B.Tech Computer Science & Engineering",
      durationYears: 4,
    })
    .returning();

  const [academicYear] = await db
    .insert(schema.academicYears)
    .values({
      name: "2026-2027",
      startDate: "2026-07-01",
      endDate: "2027-06-30",
      isCurrent: true,
    })
    .returning();

  const studyYearRows = await db
    .insert(schema.studyYears)
    .values([
      { programId: program.id, yearNumber: 2, label: "II" },
      { programId: program.id, yearNumber: 3, label: "III" },
      { programId: program.id, yearNumber: 4, label: "IV" },
    ])
    .returning();

  const studyYearMap = new Map(
    studyYearRows.map((row) => [row.label, row.id])
  );

  const periodRows = await db
    .insert(schema.periods)
    .values(
      Object.entries(PERIOD_TIMES).map(([num, times]) => ({
        periodNumber: parseInt(num, 10),
        startTime: times.start,
        endTime: times.end,
      }))
    )
    .returning();

  const periodMap = new Map(
    periodRows.map((row) => [row.periodNumber, row.id])
  );

  // 2. Migrate faculty
  console.log("Migrating faculty...");
  const tursoFaculty = (await turso.execute("SELECT * FROM faculty")) as {
    rows: {
      id: number;
      name: string;
      username: string;
      password: string;
      is_hod: number;
    }[];
  };

  const facultyRows = await db
    .insert(schema.faculty)
    .values(
      tursoFaculty.rows.map((f) => ({
        fullName: f.name,
        canonicalName: f.name,
        username: f.username,
        passwordHash: f.password,
        isHod: f.is_hod === 1,
        departmentId: f.is_hod === 1 ? null : department.id,
      }))
    )
    .returning();

  const facultyMap = new Map(
    facultyRows.map((f, idx) => [tursoFaculty.rows[idx].id, f.id])
  );

  // 3. Migrate subjects (deduplicated from timetable)
  console.log("Migrating subjects...");
  const tursoTimetable = (await turso.execute("SELECT * FROM timetable")) as {
    rows: {
      id: number;
      faculty_id: number | null;
      year: string;
      section: string;
      day_of_week: string;
      period_number: number;
      start_time: string;
      end_time: string;
      subject: string;
      is_lab: number;
      lab_group_id: string | null;
    }[];
  };

  const subjectNames = new Map<string, { isLab: boolean; canonical: string }>();
  for (const slot of tursoTimetable.rows) {
    const canonical = normalizeSubjectName(slot.subject);
    const existing = subjectNames.get(canonical);
    subjectNames.set(canonical, {
      isLab: existing ? existing.isLab || slot.is_lab === 1 : slot.is_lab === 1,
      canonical,
    });
  }

  const subjectRows = await db
    .insert(schema.subjects)
    .values(
      Array.from(subjectNames.values()).map((s) => ({
        name: s.canonical,
        isLab: s.isLab,
        departmentId: department.id,
      }))
    )
    .returning();

  const subjectMap = new Map(subjectRows.map((s) => [s.name, s.id]));

  // 4. Migrate sections (deduplicated from timetable)
  console.log("Migrating sections...");
  const sectionKeys = new Set<string>();
  for (const slot of tursoTimetable.rows) {
    sectionKeys.add(`${slot.year}-${slot.section}`);
  }

  const sectionRows = await db
    .insert(schema.sections)
    .values(
      Array.from(sectionKeys).map((key) => {
        const [year, sectionName] = key.split("-");
        return {
          studyYearId: studyYearMap.get(year)!,
          name: sectionName,
        };
      })
    )
    .returning();

  const sectionMap = new Map(
    sectionRows.map((s) => {
      const studyYear = studyYearRows.find((sy) => sy.id === s.studyYearId);
      return [`${studyYear?.label}-${s.name}`, s.id];
    })
  );

  // 5. Migrate students and enrollments
  console.log("Migrating students...");
  const tursoStudents = (await turso.execute("SELECT * FROM students")) as {
    rows: {
      id: number;
      year: string;
      section: string;
      roll_number: string;
      name: string;
    }[];
  };

  const studentRows = await db
    .insert(schema.students)
    .values(
      tursoStudents.rows.map((s) => ({
        rollNumber: s.roll_number,
        fullName: s.name,
      }))
    )
    .returning();

  const studentMap = new Map(
    studentRows.map((s, idx) => [tursoStudents.rows[idx].id, s.id])
  );

  await db.insert(schema.studentEnrollments).values(
    tursoStudents.rows.map((s) => ({
      studentId: studentMap.get(s.id)!,
      sectionId: sectionMap.get(`${s.year}-${s.section}`)!,
      academicYearId: academicYear.id,
      rollNumberSnapshot: s.roll_number,
    }))
  );

  // 6. Migrate timetable slots and lab groups
  console.log("Migrating timetable slots...");
  const labGroupMap = new Map<string, string>();

  // First create lab groups
  const labGroups = new Map<
    string,
    {
      sectionId: string;
      subjectId: string;
      facultyId: string | null;
      periodCount: number;
    }
  >();

  for (const slot of tursoTimetable.rows) {
    if (slot.is_lab === 1 && slot.lab_group_id) {
      const sectionId = sectionMap.get(`${slot.year}-${slot.section}`)!;
      const subjectId = subjectMap.get(normalizeSubjectName(slot.subject))!;
      const facultyId = slot.faculty_id
        ? facultyMap.get(slot.faculty_id) ?? null
        : null;

      const existing = labGroups.get(slot.lab_group_id);
      if (!existing) {
        labGroups.set(slot.lab_group_id, {
          sectionId,
          subjectId,
          facultyId,
          periodCount: 1,
        });
      } else {
        existing.periodCount += 1;
      }
    }
  }

  for (const [labGroupId, data] of labGroups) {
    const [row] = await db
      .insert(schema.labGroups)
      .values({
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        facultyId: data.facultyId,
        academicYearId: academicYear.id,
        name: labGroupId,
        periodCount: data.periodCount,
      })
      .returning();
    labGroupMap.set(labGroupId, row.id);
  }

  // Then create timetable slots
  const timetableSlotMap = new Map<number, string>();
  for (const slot of tursoTimetable.rows) {
    const sectionId = sectionMap.get(`${slot.year}-${slot.section}`)!;
    const subjectId = subjectMap.get(normalizeSubjectName(slot.subject))!;
    const facultyId = slot.faculty_id
      ? facultyMap.get(slot.faculty_id) ?? null
      : null;

    const [row] = await db
      .insert(schema.timetableSlots)
      .values({
        sectionId,
        academicYearId: academicYear.id,
        dayOfWeek: slot.day_of_week,
        periodId: periodMap.get(slot.period_number)!,
        subjectId,
        facultyId,
        isLab: slot.is_lab === 1,
        labGroupId:
          slot.is_lab === 1 && slot.lab_group_id
            ? labGroupMap.get(slot.lab_group_id) ?? null
            : null,
      })
      .returning();

    timetableSlotMap.set(slot.id, row.id);
  }

  // 7. Migrate attendance records
  console.log("Migrating attendance records...");
  const tursoAttendance = (await turso.execute(
    "SELECT * FROM attendance_records"
  )) as {
    rows: {
      id: number;
      date: string;
      timetable_id: number;
      faculty_id: number;
      section: string;
      subject: string;
      absentee_roll_numbers: string;
      submitted_at: string;
      edited_by: number | null;
    }[];
  };

  for (const record of tursoAttendance.rows) {
    const timetableSlotId = timetableSlotMap.get(record.timetable_id);
    if (!timetableSlotId) {
      console.warn(`Skipping attendance record ${record.id}: slot not found`);
      continue;
    }

    const tursoSlot = tursoTimetable.rows.find(
      (s) => s.id === record.timetable_id
    );
    if (!tursoSlot) continue;

    const sectionId = sectionMap.get(`${tursoSlot.year}-${tursoSlot.section}`)!;
    const subjectId = subjectMap.get(normalizeSubjectName(record.subject))!;
    const facultyId = facultyMap.get(record.faculty_id)!;
    const submittedBy = record.edited_by
      ? facultyMap.get(record.edited_by) ?? null
      : facultyId;

    let absentees: string[] = [];
    try {
      absentees = JSON.parse(record.absentee_roll_numbers || "[]");
    } catch (err) {
      console.error(
        `Failed to parse absentees for attendance record ${record.id}:`,
        record.absentee_roll_numbers
      );
      absentees = [];
    }
    const absenteeSet = new Set(absentees);

    const [session] = await db
      .insert(schema.attendanceSessions)
      .values({
        date: record.date,
        timetableSlotId,
        facultyId,
        subjectId,
        sectionId,
        submittedAt: new Date(record.submitted_at),
        submittedBy,
      })
      .returning();

    // Get students in this section
    const sectionStudents = tursoStudents.rows.filter(
      (s) => s.year === tursoSlot.year && s.section === tursoSlot.section
    );

    if (sectionStudents.length > 0) {
      await db.insert(schema.attendanceRecords).values(
        sectionStudents.map((s) => ({
          sessionId: session.id,
          studentId: studentMap.get(s.id)!,
          status: absenteeSet.has(s.roll_number) ? "absent" : "present",
          recordedBy: facultyId,
          recordedAt: new Date(record.submitted_at),
        }))
      );
    }
  }

  // 8. Migrate attendance summaries
  console.log("Migrating attendance summaries...");
  const tursoSummaries = (await turso.execute(
    "SELECT * FROM student_attendance_summary"
  )) as {
    rows: {
      id: number;
      student_id: number;
      subject: string;
      classes_held: number;
      classes_attended: number;
    }[];
  };

  if (tursoSummaries.rows.length > 0) {
    await db.insert(schema.studentAttendanceSummaries).values(
      tursoSummaries.rows.map((s) => ({
        studentId: studentMap.get(s.student_id)!,
        subjectId: subjectMap.get(normalizeSubjectName(s.subject))!,
        classesHeld: s.classes_held,
        classesAttended: s.classes_attended,
      }))
    );
  }

  console.log("Migration complete!");
  console.log(`- Faculty: ${tursoFaculty.rows.length}`);
  console.log(`- Students: ${tursoStudents.rows.length}`);
  console.log(`- Subjects: ${subjectRows.length}`);
  console.log(`- Sections: ${sectionRows.length}`);
  console.log(`- Timetable slots: ${tursoTimetable.rows.length}`);
  console.log(`- Attendance records: ${tursoAttendance.rows.length}`);
  console.log(`- Summaries: ${tursoSummaries.rows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
