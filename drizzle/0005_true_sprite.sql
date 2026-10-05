CREATE TABLE "faculty_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"faculty_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"subject_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"file_data" text,
	"file_name" text,
	"file_mime" text,
	"uploaded_by_role" text NOT NULL,
	"uploaded_by_faculty_id" uuid,
	"uploaded_by_student_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "section_crs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "faculty_ratings" ADD CONSTRAINT "faculty_ratings_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_ratings" ADD CONSTRAINT "faculty_ratings_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_ratings" ADD CONSTRAINT "faculty_ratings_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_ratings" ADD CONSTRAINT "faculty_ratings_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_ratings" ADD CONSTRAINT "faculty_ratings_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_uploaded_by_faculty_id_faculty_id_fk" FOREIGN KEY ("uploaded_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_uploaded_by_student_id_students_id_fk" FOREIGN KEY ("uploaded_by_student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_crs" ADD CONSTRAINT "section_crs_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_crs" ADD CONSTRAINT "section_crs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_student_faculty_rating" ON "faculty_ratings" USING btree ("student_id","faculty_id","subject_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "resources_section_idx" ON "resources" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_section_cr" ON "section_crs" USING btree ("section_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_program_study_year" ON "study_years" USING btree ("program_id","year_number");