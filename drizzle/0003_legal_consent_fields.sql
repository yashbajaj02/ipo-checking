ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "terms_version" varchar(20);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "privacy_accepted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "privacy_version" varchar(20);
