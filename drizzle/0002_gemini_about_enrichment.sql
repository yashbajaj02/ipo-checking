ALTER TABLE "ipos" ADD COLUMN IF NOT EXISTS "ai_description" text;
--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN IF NOT EXISTS "ai_source_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN IF NOT EXISTS "ai_generated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN IF NOT EXISTS "ai_model_version" varchar(50);
