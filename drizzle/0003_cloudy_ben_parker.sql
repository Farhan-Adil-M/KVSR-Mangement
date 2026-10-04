CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"attendance_good_pct" integer DEFAULT 75 NOT NULL,
	"attendance_warn_pct" integer DEFAULT 60 NOT NULL,
	"match_threshold" double precision DEFAULT 0.5 NOT NULL,
	"confusion_band" double precision DEFAULT 0.15 NOT NULL,
	"self_checkin_window_minutes" integer DEFAULT 10 NOT NULL,
	"photo_min" integer DEFAULT 3 NOT NULL,
	"photo_max" integer DEFAULT 6 NOT NULL,
	"scan_interval_ms" integer DEFAULT 1500 NOT NULL,
	"identify_scan_interval_ms" integer DEFAULT 1200 NOT NULL,
	"marks_good_pct" integer DEFAULT 60 NOT NULL,
	"marks_warn_pct" integer DEFAULT 40 NOT NULL,
	"eval_weight_academic" double precision DEFAULT 0.5 NOT NULL,
	"eval_weight_behaviour" double precision DEFAULT 0.2 NOT NULL,
	"eval_weight_participation" double precision DEFAULT 0.3 NOT NULL,
	"teaching_days" jsonb DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb NOT NULL,
	"session_days" integer DEFAULT 7 NOT NULL,
	"institution_name" text DEFAULT 'Dr. K.V. Subba Reddy Institute of Technology' NOT NULL,
	"institution_short_name" text DEFAULT 'KVSRIT' NOT NULL,
	"institution_phone" text DEFAULT '+918518200000' NOT NULL,
	"institution_email" text DEFAULT 'support@kvsrit.edu.in' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campus_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Main Campus' NOT NULL,
	"latitude" numeric NOT NULL,
	"longitude" numeric NOT NULL,
	"radius_meters" integer DEFAULT 200 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid,
	"audience" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"venue" text,
	"event_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"created_by_role" text NOT NULL,
	"created_by_faculty_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "self_checkin_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "student_biometrics" ADD COLUMN "descriptor_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "student_biometrics" ADD COLUMN "last_matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "student_biometrics" ADD COLUMN "consented_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "student_biometrics" ADD COLUMN "consent_version" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "contact_locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "created_by_faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_faculty_id_faculty_id_fk" FOREIGN KEY ("created_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("event_date");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_created_by_faculty_id_faculty_id_fk" FOREIGN KEY ("created_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;