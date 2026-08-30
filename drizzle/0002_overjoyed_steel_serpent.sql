CREATE TABLE "student_biometrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"descriptor" jsonb NOT NULL,
	"model_version" text DEFAULT 'faceapi-tiny-1' NOT NULL,
	"enrolled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "student_biometrics_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "student_biometrics" ADD CONSTRAINT "student_biometrics_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_biometrics" ADD CONSTRAINT "student_biometrics_enrolled_by_faculty_id_fk" FOREIGN KEY ("enrolled_by") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_student_biometric" ON "student_biometrics" USING btree ("student_id");